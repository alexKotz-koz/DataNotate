const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireRoles } = require('../middleware/auth');

const Rubric = mongoose.model('Rubric');
const Dataset = mongoose.model('Dataset');

const router = express.Router();

/**
 * GET /api/rubric/by-dataset/:datasetId
 * Return all rubrics for a dataset
 */
router.get('/by-dataset/:datasetId', requireAuth, async (req, res) => {
  try {
    const { datasetId } = req.params;
    const rubrics = await Rubric.find({ dataset: datasetId }).sort({ _dateCreated: 1 });
    res.json(rubrics);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rubrics' });
  }
});

/**
 * GET /api/rubric/:rubricId
 * Return a specific rubric by ID
 */
router.get('/:rubricId', requireAuth, async (req, res) => {
  try {
    const { rubricId } = req.params;
    const rubric = await Rubric.findById(rubricId);
    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }
    res.json(rubric);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rubric' });
  }
});

/**
 * POST /api/rubric/create
 * Body: { title, datasetId, displayColumns: string[], fields: [{name,label,type,required,options?,isDatasetColumn}] }
 * Create a new rubric for the dataset
 */
router.post('/create', requireRoles('researcher'), async (req, res) => {
  try {
    const { title, datasetId, displayColumns, fields } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });
    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });
    if (!Array.isArray(displayColumns) || displayColumns.length === 0) {
      return res.status(400).json({ error: 'displayColumns required' });
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'fields required' });
    }

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

    // Validate display columns exist in dataset
    const invalidDisplay = displayColumns.filter(c => !dataset.columns.includes(c));
    if (invalidDisplay.length) {
      return res.status(400).json({
        error: 'Display columns not in dataset',
        invalidDisplay
      });
    }

    // Validate dataset columns exist (for fields marked as isDatasetColumn)
    const datasetFields = fields.filter(f => f.isDatasetColumn);
    const invalidDatasetFields = datasetFields
      .map(f => f.name)
      .filter(n => !dataset.columns.includes(n));
    if (invalidDatasetFields.length) {
      return res.status(400).json({
        error: 'Dataset fields not in dataset columns',
        invalidDatasetFields
      });
    }

    const rubric = await Rubric.create({
      title,
      dataset: datasetId,
      displayColumns,
      fields,
      _createdBy: req.user?._id || null
    });

    res.json({ success: true, rubric });
  } catch (e) {
    console.error('Error creating rubric:', e);
    res.status(500).json({ error: 'Failed to create rubric' });
  }
});

/**
 * PUT /api/rubric/:rubricId
 * Update an existing rubric
 */
router.put('/:rubricId', requireRoles('researcher'), async (req, res) => {
  try {
    const { rubricId } = req.params;
    const { title, displayColumns, fields } = req.body;

    const rubric = await Rubric.findById(rubricId);
    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    const dataset = await Dataset.findById(rubric.dataset);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

    // Validate if provided
    if (displayColumns) {
      const invalidDisplay = displayColumns.filter(c => !dataset.columns.includes(c));
      if (invalidDisplay.length) {
        return res.status(400).json({
          error: 'Display columns not in dataset',
          invalidDisplay
        });
      }
    }

    if (fields) {
      const datasetFields = fields.filter(f => f.isDatasetColumn);
      const invalidDatasetFields = datasetFields
        .map(f => f.name)
        .filter(n => !dataset.columns.includes(n));
      if (invalidDatasetFields.length) {
        return res.status(400).json({
          error: 'Dataset fields not in dataset columns',
          invalidDatasetFields
        });
      }
    }

    // Update fields
    if (title) rubric.title = title;
    if (displayColumns) rubric.displayColumns = displayColumns;
    if (fields) rubric.fields = fields;

    await rubric.save();

    res.json({ success: true, rubric });
  } catch (e) {
    console.error('Error updating rubric:', e);
    res.status(500).json({ error: 'Failed to update rubric' });
  }
});

/**
 * DELETE /api/rubric/:rubricId
 * Delete a rubric and its annotations
 */
router.delete('/:rubricId', requireRoles('researcher'), async (req, res) => {
  try {
    const { rubricId } = req.params;

    const rubric = await Rubric.findById(rubricId);
    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    // Delete all annotations for this rubric
    const Annotation = mongoose.model('Annotation');
    await Annotation.deleteMany({ rubric: rubricId });

    // Delete the rubric
    await Rubric.findByIdAndDelete(rubricId);

    res.json({ success: true, message: 'Rubric and associated annotations deleted' });
  } catch (e) {
    console.error('Error deleting rubric:', e);
    res.status(500).json({ error: 'Failed to delete rubric' });
  }
});

module.exports = router;