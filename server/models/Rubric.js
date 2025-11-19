const mongoose = require('mongoose');
const { Schema } = mongoose;

const RubricFieldSchema = new Schema({
    name: { type: String, required: true }, //e.g., label, cr_proportion, justification
    label: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['string', 'number', 'boolean', 'select'], 
        default: 'string'
    },
    required: { type: Boolean, default: true },
    opptions: [{ type: String }] // for 'select' type
});

const RubricSchema = new Schema({
    dataset: { type: Schema.Types.ObjectId, ref:'Dataset', required: true, index: true, unique: true },
    displayColumns: [{ type: String, required: true }],
    fields: [RubricFieldSchema],
  _createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  _dateCreated: { type: Date, default: Date.now },
  _dateUpdated: { type: Date, default: Date.now }
});

RubricSchema.pre('save', function(next) {
  this._dateUpdated = new Date();
  next();
});
/*
What it does:
Triggers before saving: Every time a document using this schema is saved to MongoDB (either creating or updating), this function runs automatically before the save operation completes.

Updates timestamp: It sets the _dateUpdated field to the current date/time.

Continues the save: Calling next() tells Mongoose to proceed with the actual save operation.
*/

module.exports = mongoose.model('Rubric', RubricSchema);

