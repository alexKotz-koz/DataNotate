const mongoose = require('mongoose');
const { Schema } = mongoose;

// A single annotation document now represents a completed (or in-progress) rubric
// containing multiple row-level annotations.
const RowAnnotationSubSchema = new Schema({
  datasetRow: { type: Schema.Types.ObjectId, ref: 'DatasetRow', required: true },
  values: { type: Schema.Types.Mixed, required: true }, // rubric field values for this row
  _dateAnnotated: { type: Date, default: Date.now }
}, { _id: false });

const AnnotationSchema = new Schema({
  dataset: { type: Schema.Types.ObjectId, ref: 'Dataset', index: true, required: true },
  rubric: { type: Schema.Types.ObjectId, ref: 'Rubric', required: true, index: true },
  rows: { type: [RowAnnotationSubSchema], default: [] },
  completed: { type: Boolean, default: false }, // true when target row count reached
  targetRowCount: { type: Number, default: 25 }, // configurable threshold for completion
  _annotator: { type: Schema.Types.ObjectId, ref: 'User' },
  _dateCreated: { type: Date, default: Date.now },
  _dateUpdated: { type: Date, default: Date.now }
});

// Ensure only one aggregate annotation per dataset/rubric/annotator
AnnotationSchema.index({ dataset: 1, rubric: 1, _annotator: 1 }, { unique: true });

AnnotationSchema.pre('save', function(next) {
  this._dateUpdated = new Date();
  next();
});

module.exports = mongoose.model('Annotation', AnnotationSchema);
