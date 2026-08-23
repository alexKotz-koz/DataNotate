const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireRoles } = require('../middleware/auth');

const Rubric = mongoose.model('Rubric');
const Dataset = mongoose.model('Dataset');

const router = express.Router();

const FIELD_TYPES = ['string', 'number', 'boolean', 'select'];

// Validates a RubricField[] array; returns an error string, or null if valid.
function validateFieldsArray(fields, label) {
  if (!Array.isArray(fields)) return `${label} must be an array`;
  for (const f of fields) {
    if (!f || !f.name || !f.label) return `${label} entries require name and label`;
    if (f.type && !FIELD_TYPES.includes(f.type)) return `${label} has invalid type: ${f.type}`;
    if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0)) {
      return `${label} field "${f.name}" of type select requires options`;
    }
  }
  const names = fields.map(f => f.name);
  if (new Set(names).size !== names.length) return `${label} field names must be unique`;
  return null;
}

// Validates the preferenceTest-specific portion of a rubric payload against its dataset.
// `existing` supplies fallback values (for PUT, where not every field is re-sent).
function validatePreferenceTestPayload(body, dataset, existing = {}) {
  const preferenceColumns = body.preferenceColumns !== undefined ? body.preferenceColumns : existing.preferenceColumns;
  const preferenceQuestion = body.preferenceQuestion !== undefined ? body.preferenceQuestion : existing.preferenceQuestion;
  const displayColumns = body.displayColumns !== undefined ? body.displayColumns : existing.displayColumns;
  const secondaryDisplayColumns = body.secondaryDisplayColumns !== undefined ? body.secondaryDisplayColumns : (existing.secondaryDisplayColumns || []);
  const stage2Fields = body.stage2Fields !== undefined ? body.stage2Fields : (existing.stage2Fields || []);
  const secondaryFields = body.secondaryFields !== undefined ? body.secondaryFields : (existing.secondaryFields || []);

  if (!Array.isArray(preferenceColumns) || preferenceColumns.length !== 2) {
    return { error: 'preferenceColumns must contain exactly 2 dataset columns' };
  }
  const invalidPref = preferenceColumns.filter(c => !dataset.columns.includes(c));
  if (invalidPref.length) {
    return { error: 'preferenceColumns not in dataset', invalidPref };
  }
  if (preferenceColumns[0] === preferenceColumns[1]) {
    return { error: 'preferenceColumns must be two distinct columns' };
  }
  if (!preferenceQuestion || !String(preferenceQuestion).trim()) {
    return { error: 'preferenceQuestion required' };
  }
  if (Array.isArray(displayColumns) && displayColumns.some(c => preferenceColumns.includes(c))) {
    return { error: 'displayColumns must not include preferenceColumns' };
  }
  if (Array.isArray(secondaryDisplayColumns)) {
    const invalidSecondary = secondaryDisplayColumns.filter(c => !dataset.columns.includes(c));
    if (invalidSecondary.length) {
      return { error: 'secondaryDisplayColumns not in dataset', invalidSecondary };
    }
    if (secondaryDisplayColumns.some(c => preferenceColumns.includes(c))) {
      return { error: 'secondaryDisplayColumns must not include preferenceColumns' };
    }
  }

  const stage2Error = validateFieldsArray(stage2Fields, 'stage2Fields');
  if (stage2Error) return { error: stage2Error };
  const secondaryError = validateFieldsArray(secondaryFields, 'secondaryFields');
  if (secondaryError) return { error: secondaryError };

  const combinedNames = [...stage2Fields, ...secondaryFields].map(f => f.name);
  if (new Set(combinedNames).size !== combinedNames.length) {
    return { error: 'stage2Fields and secondaryFields must not share field names' };
  }

  return { preferenceColumns, preferenceQuestion, secondaryDisplayColumns, stage2Fields, secondaryFields };
}

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
    const {
      title, datasetId, taskType, displayColumns, fields,
      rowDisplayOrder, customOrderColumn, customRowOrder,
      preferenceColumns, preferenceQuestion, stage2Fields,
      secondaryDisplayColumns, secondaryFields
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });
    if (!datasetId) return res.status(400).json({ error: 'datasetId required' });
    if (taskType && !['standard', 'preferenceTest'].includes(taskType)) {
      return res.status(400).json({ error: 'invalid taskType' });
    }
    const resolvedTaskType = taskType || 'standard';

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

    if (resolvedTaskType === 'standard') {
      if (!Array.isArray(displayColumns) || displayColumns.length === 0) {
        return res.status(400).json({ error: 'displayColumns required' });
      }
      if (!Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ error: 'fields required' });
      }

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
    } else {
      if (Array.isArray(displayColumns)) {
        const invalidDisplay = displayColumns.filter(c => !dataset.columns.includes(c));
        if (invalidDisplay.length) {
          return res.status(400).json({ error: 'Display columns not in dataset', invalidDisplay });
        }
      }
    }

    const rubricData = {
      title,
      dataset: datasetId,
      taskType: resolvedTaskType,
      displayColumns: displayColumns || [],
      fields: resolvedTaskType === 'standard' ? fields : [],
      _createdBy: req.user?._id || null
    };

    if (resolvedTaskType === 'preferenceTest') {
      const result = validatePreferenceTestPayload(
        { preferenceColumns, preferenceQuestion, displayColumns, secondaryDisplayColumns, stage2Fields, secondaryFields },
        dataset
      );
      if (result.error) return res.status(400).json(result);
      Object.assign(rubricData, result);
    }

    // Add rowDisplayOrder if provided
    if (rowDisplayOrder && ['default', 'random', 'shuffle', 'custom'].includes(rowDisplayOrder)) {
      rubricData.rowDisplayOrder = rowDisplayOrder;
    }

    // Add custom order settings if rowDisplayOrder is 'custom'
    if (rowDisplayOrder === 'custom') {
      if (customOrderColumn) {
        // Validate that customOrderColumn exists in dataset
        if (!dataset.columns.includes(customOrderColumn)) {
          return res.status(400).json({ error: 'customOrderColumn not in dataset columns' });
        }
        rubricData.customOrderColumn = customOrderColumn;
      }
      if (customRowOrder && Array.isArray(customRowOrder)) {
        rubricData.customRowOrder = customRowOrder;
      }
    }

    const rubric = await Rubric.create(rubricData);

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
    const {
      title, displayColumns, fields, rowDisplayOrder, customOrderColumn, customRowOrder,
      preferenceColumns, preferenceQuestion, stage2Fields,
      secondaryDisplayColumns, secondaryFields
    } = req.body;

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

    if (rubric.taskType === 'standard' && fields) {
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

    if (rubric.taskType === 'preferenceTest') {
      const result = validatePreferenceTestPayload(
        { preferenceColumns, preferenceQuestion, displayColumns, secondaryDisplayColumns, stage2Fields, secondaryFields },
        dataset,
        rubric.toObject()
      );
      if (result.error) return res.status(400).json(result);
      rubric.preferenceColumns = result.preferenceColumns;
      rubric.preferenceQuestion = result.preferenceQuestion;
      rubric.secondaryDisplayColumns = result.secondaryDisplayColumns;
      rubric.stage2Fields = result.stage2Fields;
      rubric.secondaryFields = result.secondaryFields;
    }

    // Update fields
    if (title) rubric.title = title;
    if (displayColumns) rubric.displayColumns = displayColumns;
    if (rubric.taskType === 'standard' && fields) rubric.fields = fields;
    if (rowDisplayOrder && ['default', 'random', 'shuffle', 'custom'].includes(rowDisplayOrder)) {
      rubric.rowDisplayOrder = rowDisplayOrder;
    }

    // Handle custom order settings
    if (rowDisplayOrder === 'custom') {
      if (customOrderColumn !== undefined) {
        if (customOrderColumn && !dataset.columns.includes(customOrderColumn)) {
          return res.status(400).json({ error: 'customOrderColumn not in dataset columns' });
        }
        rubric.customOrderColumn = customOrderColumn;
      }
      if (customRowOrder !== undefined && Array.isArray(customRowOrder)) {
        rubric.customRowOrder = customRowOrder;
      }
    } else if (rowDisplayOrder && rowDisplayOrder !== 'custom') {
      // Clear custom settings if switching away from custom mode
      rubric.customOrderColumn = undefined;
      rubric.customRowOrder = undefined;
    }

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