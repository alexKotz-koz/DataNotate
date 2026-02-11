const passport = require('passport');
const LocalStrategy = require('passport-local');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = mongoose.model('User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'username' },
    async (username, password, done) => {
      try {
        const identifier = String(username || '').trim();
        const identifierLower = identifier.toLowerCase();

        const user = await User.findOne({
          $or: [{ username: identifier }, { email: identifierLower }]
        });

        if (!user) {
          return done(null, false, { error: 'Incorrect username or email' });
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
          return done(null, user);
        } else {
          return done(null, false, { error: 'Incorrect password' });
        }
      } catch (err) {
        return done(err);
      }
  })
);