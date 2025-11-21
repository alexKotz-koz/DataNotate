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
        const user = await User.findOne({ username });

        if (!user) {
          return done(null, false, { error: 'Incorrect username' });
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