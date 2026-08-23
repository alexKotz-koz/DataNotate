const mongoose = require('mongoose');
const { Schema } = mongoose;

// A single annotation document now represents a completed (or in-progress) rubric
// containing multiple row-level annotations.
const RowAnnotationSubSchema = new Schema({
  datasetRow: { type: Schema.Types.ObjectId, ref: 'DatasetRow', required: true },
  values: { type: Schema.Types.Mixed, required: true }, // rubric field values for this row
  preferenceChoice: { type: String }, // preferenceTest: dataset column name the annotator chose
  _dateAnnotated: { type: Date, default: Date.now }
}, { _id: false });

const AnnotationSchema = new Schema({
  dataset: { type: Schema.Types.ObjectId, ref: 'Dataset', index: true, required: true },
  rubric: { type: Schema.Types.ObjectId, ref: 'Rubric', required: true, index: true },
  rows: { type: [RowAnnotationSubSchema], default: [] },
  completed: { type: Boolean, default: false }, // true when target row count reached
  targetRowCount: { type: Number, default: 0 }, // overwritten based on dataset row count
  _annotator: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionLabel: { type: String, default: '' },
  sessionNumber: { type: Number, default: null },
  _dateCreated: { type: Date, default: Date.now },
  _dateUpdated: { type: Date, default: Date.now }
});

AnnotationSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      const existingCount = await this.constructor.countDocuments({
        dataset: this.dataset,
        rubric: this.rubric,
        _annotator: this._annotator
      });

      if (!this.sessionNumber) {
        this.sessionNumber = existingCount + 1;
      }
      if (!this.sessionLabel) {
        this.sessionLabel = `Session ${this.sessionNumber}`;
      }
    }

    if (!this.targetRowCount || this.isModified('dataset')) {
      const DatasetRow = mongoose.model('DatasetRow');
      const totalRows = await DatasetRow.countDocuments({ dataset: this.dataset });
      this.targetRowCount = totalRows;
    }

    if (this.targetRowCount) {
      this.completed = this.rows.length >= this.targetRowCount;
    }

    this._dateUpdated = new Date();
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Annotation', AnnotationSchema);
