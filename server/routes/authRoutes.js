const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');

const router = express.Router();
const User = mongoose.model('User');

const allowedRoles = ['admin', 'researcher', 'annotator'];

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const user = userDoc.toObject({ versionKey: false });
  delete user.password;
  return user;
};

router.post('/signup', async (req, res, next) => {
  try {
    const { username, password, email, firstName, lastName, organization, role } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required.' });
    }

    const normalizedRole = allowedRoles.includes(role) ? role : 'annotator';

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const user = new User({
      username,
      password,
      email,
      firstName,
      lastName,
      organization,
      role: normalizedRole
    });

    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ success: true, user: sanitizeUser(user) });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.error || 'Invalid credentials' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ success: true, user: sanitizeUser(user) });
    });
  })(req, res, next);
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
