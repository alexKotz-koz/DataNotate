const express = require('express');
const mongoose = require('mongoose');

const Rubric = mongoose.model('Rubric');
const Dataset = mongoose.model('Dataset');

const router = express.Router();

/**
 * GET /api/rubric/by-dataset/:datasetId
 * Return rubric config for a dataset (if exists)
 */
router.get('/by-dataset/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const rubric = await Rubric.findOne({ dataset: datasetId });
    res.json(rubric || null);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rubric' });
  }
});

/**
 * POST /api/rubric/configure
 * Body: { datasetId, displayColumns: string[], fields: [{name,label,type,required,options?}] }
 * Upsert a rubric configuration for the dataset
 */
router.post('/configure', async (req, res) => {
  try {
    const { datasetId, displayColumns, fields } = req.body;

    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });
    if (!Array.isArray(displayColumns) || displayColumns.length === 0) {
      return res.status(400).json({ error: 'displayColumns required' });
    }
    if (!Array.isArray(fields)) {
      return res.status(400).json({ error: 'fields must be an array' });
    }

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

    // Ensure chosen columns exist in dataset.columns
    const invalidDisplay = displayColumns.filter(c => !dataset.columns.includes(c));
    const invalidRubric = fields.map(f => f.name).filter(n => !dataset.columns.includes(n));
    if (invalidDisplay.length || invalidRubric.length) {
      return res.status(400).json({
        error: 'Selected columns not in dataset',
        invalidDisplay,
        invalidRubric
      });
    }

    const rubric = await Rubric.findOneAndUpdate(
      { dataset: datasetId },
      {
        dataset: datasetId,
        displayColumns,
        fields,
        _updatedBy: req.user?._id || null
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, rubric });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save rubric' });
  }
});

module.exports = router;