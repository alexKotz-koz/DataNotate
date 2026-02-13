const mongoose = require('mongoose');
const { Schema } = mongoose;

const RubricFieldSchema = new Schema({
    name: { type: String, required: true }, // e.g., label, justification
    label: { type: String, required: true }, // Display label in UI
    type: { 
        type: String, 
        enum: ['string', 'number', 'boolean', 'select'], 
        default: 'string'
    },
    required: { type: Boolean, default: false },
    instructions: { type: String, trim: true },
    options: [{ type: String }], // for 'select' type
    isDatasetColumn: { type: Boolean, default: false } // true if from dataset, false if annotation-only
}, { _id: false });

const RubricSchema = new Schema({
    title: { type: String, required: true }, // Rubric title (e.g., "Quality Assessment", "Relevance Check")
    dataset: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
    displayColumns: [{ type: String, required: true }], // Dataset columns to show to annotator
    fields: [RubricFieldSchema], // Fields to annotate (can be from dataset or custom)
    rowDisplayOrder: { 
        type: String, 
        enum: ['default', 'random', 'shuffle', 'custom'], 
        default: 'default' 
    }, // How to order rows during annotation
    customOrderColumn: { type: String }, // Column to use for custom manual ordering
    customRowOrder: [{ type: Schema.Types.Mixed }], // Manual order of rows (array of column values)
    _createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    _dateCreated: { type: Date, default: Date.now },
    _dateUpdated: { type: Date, default: Date.now }
});

// Index to allow multiple rubrics per dataset
RubricSchema.index({ dataset: 1, title: 1 });

RubricSchema.pre('save', function(next) {
    this._dateUpdated = new Date();
    next();
});

module.exports = mongoose.model('Rubric', RubricSchema);

