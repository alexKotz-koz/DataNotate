const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnnotationSchema = new Schema({
  dataset: { type: Schema.Types.ObjectId, ref: 'Dataset', index: true },
  rubric: { type: Schema.Types.ObjectId, ref: 'Rubric', required: true, index: true },
  datasetRow: { type: Schema.Types.ObjectId, ref: 'DatasetRow', required: true, index: true },
  annotations: { type: Schema.Types.Mixed, required: true }, // Stores the rubric field values
  _annotator: { type: Schema.Types.ObjectId, ref: 'User' }, // Changed from _createdBy for clarity
  _dateCreated: { type: Date, default: Date.now },
  _dateUpdated: { type: Date, default: Date.now }
});

// Ensure one annotation per row per rubric per annotator
// This allows multiple annotations for the same row with different rubrics
AnnotationSchema.index({ datasetRow: 1, rubric: 1, _annotator: 1 }, { unique: true });

AnnotationSchema.pre('save', function(next) {
  this._dateUpdated = new Date();
  next();
});

module.exports = mongoose.model('Annotation', AnnotationSchema);
