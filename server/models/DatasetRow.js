const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DatasetRowSchema = new Schema({
    dataset: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true },
    data: { type: Schema.Types.Mixed, required: true }, // Stores row content as an object
    // Optionally, you can add a unique row id if present in your data
    rowId: { type: String }
});

module.exports = mongoose.model('DatasetRow', DatasetRowSchema);