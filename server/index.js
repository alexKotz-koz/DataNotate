/**
 * Express.js server setup and configuration
 * 
 * This module sets up an Express server with MongoDB connection using Mongoose,
 * session management, authentication with Passport, and request body parsing.
 * 
 * @fileoverview Main server entry point for the datanotate-MERN application
 * @author Alex Kotz
 */

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const path = require('path');
const keys = require('../config/keys');

require('./models/User');
require('./models/Dataset');
require('./models/DatasetRow');
require('./models/Rubric');
require('./models/Annotation');
require('./services/passport');

mongoose.Promise = global.Promise;
mongoose.connect(keys.mongoURI);

const app = express();

app.use(bodyParser.json()); 
    // app.use() = Initialize middleware with express app
    // bodyParser automatically parses incoming HTTP requests with json data
app.use(
    session({
        secret: keys.cookieKey, // A string used to sign the session ID cookie to prevent tampering.
        resave: false, // false = The session won't be saved back to the store if it wasn't modified during the request, which improves performance.
        saveUninitialized: false, // false = new but unmodified sessions won't be saved to the store. 
        cookie: {maxAge: 24 * 60 * 60 * 1000 } //24 hours
    })
);

app.use(passport.initialize());
app.use(passport.session());

/* API Routes */
app.use('/api/dataset', require('./routes/datasetRoutes'));
app.use('/api/rubric', require('./routes/rubricRoutes'));
app.use('/api/annotation', require('./routes/annotationRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

/* Generic error handling middleware */
app.use((err, req, res, next) => {
    console.error('Generic Server Error:', err);
    res.status(500).json({ message: 'Something went wrong!', error: err.error || err.message })
});

if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app build directory
    app.use(express.static(path.join(__dirname, 'client/dist')));
    
    // Use a more specific pattern instead of '*'
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(__dirname, 'client/dist', 'index.html'), (err) => {
            if (err) {
                console.error('Error serving file:', err);
                res.status(500).send('Error serving page');
            }
        });
    });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});