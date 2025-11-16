const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DatasetSchema = new Schema({
    title: { type: String, required: true},
    description: { type: String },
    uploadType: { type: String, enum: ['json', 'csv']},
    columns: [{ type: String }],
    _createdBy: { type: Schema.Types.ObjectId, ref: 'User'},
    _dateCreated: { type: Date, default: Date.now } 
})

module.exports = mongoose.model('Dataset', DatasetSchema)