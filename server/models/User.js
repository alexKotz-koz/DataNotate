const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

const UserSchema = new Schema({
  googleId: String,
  username: { type: String, required: true, index: { unique: true } },
  password: String,
  firstName: { type: String}, 
  lastName: { type: String},
  email: { type: String, required: true, index: { unique: true } },
  role: {
    type: String,
    enum: ['facilitator', 'participant', 'admin'],
    required: true
  },
  //notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
  avatar: { type: String },
  firstLogin: { type: Boolean, required: true, default: true},
  jobRole: { type: String },
  jobDepartment: { type: String },
  jobYears: {type: String},
  cohort: {type: String},
});



mongoose.model('User', UserSchema);