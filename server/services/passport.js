const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local');
const mongoose = require('mongoose');
const keys = require('../../config/keys');
const bcrypt = require('bcryptjs');

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
    { usernameField: 'email' }, 
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });

        if (!user) {
            return done(null, false, { error: "Incorrect email" });
        }
        
        // Check if user has a password (local account)
        if (!user.password) {
            return done(null, false, { error: "Please sign in with Google" });
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
          return done(null, user);
        } else {
            return done(null, false, { error: "Incorrect password" });
        }
      } catch (err) {
          return done(err);
      }
  })
);

// Google Strategy
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: keys.googleClientID,
//       clientSecret: keys.googleClientSecret,
//       callbackURL: '/auth/google/callback',
//       proxy: true
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Check if user exists with Google ID
//         let existingUser = await User.findOne({ googleId: profile.id });

//         if (existingUser) {
//           return done(null, existingUser);
//         }

//         // Check if user exists with same email (link accounts)
//         existingUser = await User.findOne({ email: profile.emails[0].value });

//         if (existingUser) {
//           // Link Google account to existing local account
//           existingUser.googleId = profile.id;
//           await existingUser.save();
//           return done(null, existingUser);
//         }

//         // Create new user with Google profile
//         const user = await new User({ 
//           googleId: profile.id,
//           email: profile.emails[0].value,
//           name: profile.displayName
//         }).save();
        
//         done(null, user);
//       } catch (err) {
//         done(err);
//       }
//     }
//   )
// );