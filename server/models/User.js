const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

const roles = ['admin', 'researcher', 'annotator'];

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  organization: { type: String, trim: true },
  role: { type: String, enum: roles, required: true, default: 'annotator' },
  _dateCreated: { type: Date, default: Date.now },
  _dateUpdated: { type: Date, default: Date.now }
});

UserSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    this._dateUpdated = new Date();
    return next();
  }

  bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
    if (err) return next(err);
    bcrypt.hash(this.password, salt, (hashErr, hash) => {
      if (hashErr) return next(hashErr);
      this.password = hash;
      this._dateUpdated = new Date();
      next();
    });
  });
});

UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

mongoose.model('User', UserSchema);