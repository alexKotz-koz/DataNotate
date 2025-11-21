const express = require('express');
const mongoose = require('mongoose');

const Annotation = mongoose.model('Annotation');
const DatasetRow = mongoose.model('DatasetRow');
const Dataset = mongoose.model('Dataset');
const Rubric = mongoose.model('Rubric');

const router = express.Router();

/**
 * GET /api/annotation/by-dataset/:datasetId
 * Return all annotations for a dataset (optionally filter by rubric)
 */
router.get('/by-dataset/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { rubricId } = req.query;
    
    const query = { dataset: datasetId };
    if (rubricId) {
      query.rubric = rubricId;
    }
    
    const annotations = await Annotation.find(query)
      .populate('rubric', 'title')
      .sort({ _dateCreated: 1 });
    res.json(annotations);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

/**
 * GET /api/annotation/by-row/:datasetRowId
 * Return annotation for a specific row
 */
router.get('/by-row/:datasetRowId', async (req, res) => {
  try {
    const { datasetRowId } = req.params;
    const annotation = await Annotation.findOne({ datasetRow: datasetRowId });
    res.json(annotation || null);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch annotation' });
  }
});

/**
 * POST /api/annotation/save
 * Body: { datasetId, rubricId, datasetRowId, annotations: {...} }
 * Create or update an annotation for a dataset row with a specific rubric
 */
// Save (append/update) a single row's annotation inside the aggregate annotation record
router.post('/save', async (req, res) => {
  try {
    const { datasetId, rubricId, datasetRowId, annotations } = req.body;
    if (!datasetId || !rubricId || !datasetRowId || !annotations) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const row = await DatasetRow.findOne({ _id: datasetRowId, dataset: datasetId });
    if (!row) return res.status(404).json({ error: 'Dataset row not found' });
    const rubric = await Rubric.findById(rubricId);
    if (!rubric) return res.status(404).json({ error: 'Rubric not found' });

    const annotatorId = req.user?._id || null; // null if unauthenticated

    // Find or create aggregate annotation record
    let aggregate = await Annotation.findOne({ dataset: datasetId, rubric: rubricId, _annotator: annotatorId });
    if (!aggregate) {
      aggregate = await Annotation.create({
        dataset: datasetId,
        rubric: rubricId,
        _annotator: annotatorId,
        rows: [],
        targetRowCount: 25 // could derive from rubric or config later
      });
    }

    // Update or append row annotation inside aggregate
    const existingIndex = aggregate.rows.findIndex(r => r.datasetRow.toString() === datasetRowId);
    if (existingIndex >= 0) {
      aggregate.rows[existingIndex].values = annotations;
      aggregate.rows[existingIndex]._dateAnnotated = new Date();
    } else {
      aggregate.rows.push({ datasetRow: datasetRowId, values: annotations });
    }

    // Mark completed if threshold reached
    if (aggregate.rows.length >= aggregate.targetRowCount) {
      aggregate.completed = true;
    }
    aggregate._dateUpdated = new Date();
    await aggregate.save();

    // Populate minimal for client convenience
    const populated = await aggregate.populate({ path: 'rows.datasetRow', select: 'data' });

    res.json({ success: true, annotation: populated });
  } catch (e) {
    console.error('Error saving aggregate annotation:', e);
    res.status(500).json({ error: 'Failed to save annotation' });
  }
});

/**
 * DELETE /api/annotation/:annotationId
 * Delete an annotation
 */
router.delete('/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;
    const result = await Annotation.findByIdAndDelete(annotationId);
    
    if (!result) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

/**
 * GET /api/annotation/stats/:datasetId
 * Return statistics for a dataset's annotations (optionally filtered by rubric)
 * Only counts annotations where all required rubric fields are completed
 */
router.get('/stats/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { rubricId } = req.query;
    const totalRows = await DatasetRow.countDocuments({ dataset: datasetId });

    if (rubricId) {
      // Per-rubric stats (aggregate annotations)
      const rubric = await Rubric.findById(rubricId);
      if (!rubric) return res.status(404).json({ error: 'Rubric not found' });
      const annotationRecords = await Annotation.find({ dataset: datasetId, rubric: rubricId });
      const completedCount = annotationRecords.filter(a => a.completed).length;
      const averageRowsAnnotated = annotationRecords.length
        ? Math.round(annotationRecords.reduce((sum, a) => sum + a.rows.length, 0) / annotationRecords.length)
        : 0;
      return res.json({
        totalRows,
        annotationRecords: annotationRecords.length,
        completedRecords: completedCount,
        averageRowsAnnotated,
        percentCompletionAverage: rubric && rubric.fields.length && annotationRecords.length
          ? (averageRowsAnnotated / (annotationRecords[0]?.targetRowCount || 25)) * 100
          : 0
      });
    }

    // Dataset-level stats across all rubrics
    const rubrics = await Rubric.find({ dataset: datasetId });
    const annotationRecords = await Annotation.find({ dataset: datasetId });
    const completedCount = annotationRecords.filter(a => a.completed).length;
    res.json({
      totalRows,
      rubricCount: rubrics.length,
      annotationRecordCount: annotationRecords.length,
      completedRecordCount: completedCount
    });
  } catch (e) {
    console.error('Error fetching stats:', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const formatAnnotationExport = (annotation) => {
  const displayColumns = Array.isArray(annotation?.rubric?.displayColumns)
    ? annotation.rubric.displayColumns
    : [];
  const rubricFieldNames = Array.isArray(annotation?.rubric?.fields)
    ? annotation.rubric.fields.map(f => f.name).filter(Boolean)
    : [];

  const projectDisplayColumns = (row) => {
    const data = row.datasetRow?.data || {};
    return displayColumns.reduce((acc, column) => {
      if (Object.prototype.hasOwnProperty.call(data, column)) {
        acc[column] = data[column];
      }
      return acc;
    }, {});
  };

  const projectRubricFields = (row) => {
    const values = row.values || {};
    return rubricFieldNames.reduce((acc, name) => {
      if (Object.prototype.hasOwnProperty.call(values, name)) {
        acc[name] = values[name];
      }
      return acc;
    }, {});
  };

  return {
    metadata: {
      datasetId: annotation.dataset?._id,
      rubricId: annotation.rubric?._id,
      annotationId: annotation._id,
      datasetTitle: annotation.dataset?.title,
      datasetDescription: annotation.dataset?.description,
      rubricTitle: annotation.rubric?.title,
      annotator: annotation._annotator,
      rowCount: annotation.rows?.length || 0,
      completed: annotation.completed,
      dateCreated: annotation._dateCreated,
      dateUpdated: annotation._dateUpdated
    },
    annotations: (annotation.rows || []).map((row) => ({
      datasetRowId: row.datasetRow?._id,
      display: projectDisplayColumns(row),
      rubric: projectRubricFields(row),
      dateAnnotated: row._dateAnnotated
    }))
  };
};

/**
 * GET /api/annotation/download/:annotationId
 * Download a single annotation as JSON with dataset metadata
 */
router.get('/download/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;
    // Populate aggregate rows
    const annotation = await Annotation.findById(annotationId)
      .populate('dataset')
      .populate('rubric')
      .populate({ path: 'rows.datasetRow', select: 'data' });

    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    const output = formatAnnotationExport(annotation);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="annotation_${annotation._id}.json"`);
    res.json(output);
  } catch (e) {
    console.error('Error downloading annotation:', e);
    res.status(500).json({ error: 'Failed to download annotation' });
  }
});

/**
 * GET /api/annotation/download-bulk/:datasetId
 * Download all annotations for a dataset (optionally filtered by rubric)
 * Returns array of annotation objects with metadata
 */
router.get('/download-bulk/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { rubricId } = req.query;
    
    const query = { dataset: datasetId };
    if (rubricId) {
      query.rubric = rubricId;
    }
    // Populate aggregate rows for each annotation record
    const annotations = await Annotation.find(query)
      .populate('dataset')
      .populate('rubric')
      .populate({ path: 'rows.datasetRow', select: 'data' });

    if (annotations.length === 0) {
      return res.status(404).json({ error: 'No annotations found' });
    }

    const output = annotations.map(formatAnnotationExport);
    
    const filename = rubricId 
      ? `annotations_${datasetId}_${rubricId}.json`
      : `annotations_${datasetId}_all.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(output);
  } catch (e) {
    console.error('Error downloading bulk annotations:', e);
    res.status(500).json({ error: 'Failed to download annotations' });
  }
});

module.exports = router;
