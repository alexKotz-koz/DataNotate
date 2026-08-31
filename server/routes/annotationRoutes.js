const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireRoles } = require('../middleware/auth');

const Annotation = mongoose.model('Annotation');
const DatasetRow = mongoose.model('DatasetRow');
const Dataset = mongoose.model('Dataset');
const Rubric = mongoose.model('Rubric');

const router = express.Router();

const getDatasetRowCount = async (datasetId) => DatasetRow.countDocuments({ dataset: datasetId });

/**
 * GET /api/annotation/by-dataset/:datasetId
 * Return all annotations for a dataset (optionally filter by rubric)
 */
router.get('/by-dataset/:datasetId', requireAuth, async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { rubricId, mine, annotatorId, annotationId } = req.query;
    
    const query = { dataset: datasetId };
    if (rubricId) {
      query.rubric = rubricId;
    }
    if (annotationId) {
      query._id = annotationId;
    }
    if (mine === 'true' && req.user?._id) {
      query._annotator = req.user._id;
    } else if (annotatorId) {
      query._annotator = annotatorId;
    }
    
    const annotations = await Annotation.find(query)
      .populate('rubric', 'title')
      .populate('_annotator', 'username firstName lastName role')
      .sort({ _dateCreated: 1 });
    const totalRows = await getDatasetRowCount(datasetId);
    const normalized = await Promise.all(annotations.map(async (annotation) => {
      const desiredCompletion = annotation.rows.length >= totalRows;
      const requiresUpdate = annotation.targetRowCount !== totalRows || annotation.completed !== desiredCompletion;
      if (requiresUpdate) {
        annotation.targetRowCount = totalRows;
        annotation.completed = desiredCompletion;
        await annotation.save();
      }
      return annotation;
    }));
    res.json(normalized);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

/**
 * GET /api/annotation/by-row/:datasetRowId
 * Return annotation for a specific row
 */
router.get('/by-row/:datasetRowId', requireAuth, async (req, res) => {
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
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { datasetId, rubricId, datasetRowId, annotations, annotationId, preferenceChoice } = req.body;
    if (!datasetId || !rubricId || !datasetRowId || !annotations) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const row = await DatasetRow.findOne({ _id: datasetRowId, dataset: datasetId });
    if (!row) return res.status(404).json({ error: 'Dataset row not found' });
    const rubric = await Rubric.findById(rubricId);
    if (!rubric) return res.status(404).json({ error: 'Rubric not found' });

    if (preferenceChoice !== undefined && preferenceChoice !== null) {
      if (rubric.taskType !== 'preferenceTest' || !rubric.preferenceColumns.includes(preferenceChoice)) {
        return res.status(400).json({ error: 'Invalid preferenceChoice for this rubric' });
      }
    }

    const annotatorId = req.user?._id || null;
    const totalRows = await getDatasetRowCount(datasetId);

    // Find or create aggregate annotation record
    let aggregate;
    if (annotationId) {
      aggregate = await Annotation.findOne({ _id: annotationId, dataset: datasetId, rubric: rubricId });
      if (!aggregate) {
        return res.status(404).json({ error: 'Annotation session not found' });
      }

      const isOwner = annotatorId && aggregate._annotator && aggregate._annotator.toString() === annotatorId.toString();
      const privileged = req.user?.role === 'admin' || req.user?.role === 'researcher';
      if (!isOwner && !privileged) {
        return res.status(403).json({ error: 'Cannot modify this annotation session' });
      }
    } else {
      const baseQuery = { dataset: datasetId, rubric: rubricId };
      if (annotatorId) baseQuery._annotator = annotatorId;
      aggregate = await Annotation.findOne(baseQuery);
    }

    if (!aggregate) {
      aggregate = await Annotation.create({
        dataset: datasetId,
        rubric: rubricId,
        _annotator: annotatorId,
        rows: [],
        targetRowCount: totalRows
      });
    }

    if (aggregate.targetRowCount !== totalRows) {
      aggregate.targetRowCount = totalRows;
    }

    // Update or append row annotation inside aggregate
    const existingIndex = aggregate.rows.findIndex(r => r.datasetRow.toString() === datasetRowId);
    if (existingIndex >= 0) {
      aggregate.rows[existingIndex].values = annotations;
      if (preferenceChoice !== undefined) aggregate.rows[existingIndex].preferenceChoice = preferenceChoice;
      aggregate.rows[existingIndex]._dateAnnotated = new Date();
    } else {
      aggregate.rows.push({ datasetRow: datasetRowId, values: annotations, preferenceChoice: preferenceChoice || undefined });
    }

    // Mark completed if threshold reached
    aggregate.completed = aggregate.rows.length >= aggregate.targetRowCount;
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

// Create a new annotation session for the current user
router.post('/session', requireAuth, async (req, res) => {
  try {
    const { datasetId, rubricId, sessionLabel } = req.body;
    if (!datasetId || !rubricId) {
      return res.status(400).json({ error: 'datasetId and rubricId are required' });
    }

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    const rubric = await Rubric.findById(rubricId);
    if (!rubric) return res.status(404).json({ error: 'Rubric not found' });

    const annotatorId = req.user?._id || null;
    const totalRows = await getDatasetRowCount(datasetId);
    const annotation = await Annotation.create({
      dataset: datasetId,
      rubric: rubricId,
      _annotator: annotatorId,
      sessionLabel: sessionLabel || '',
      rows: [],
      targetRowCount: totalRows
    });

    const populated = await annotation.populate('rubric', 'title');
    res.status(201).json({ success: true, annotation: populated });
  } catch (e) {
    console.error('Error creating annotation session:', e);
    res.status(500).json({ error: 'Failed to create annotation session' });
  }
});

/**
 * DELETE /api/annotation/:annotationId
 * Delete an annotation
 */
router.delete('/:annotationId', requireRoles('researcher'), async (req, res) => {
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
router.get('/stats/:datasetId', requireRoles('researcher'), async (req, res) => {
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
  const downloadOnlyColumns = Array.isArray(annotation?.rubric?.downloadOnlyColumns)
    ? annotation.rubric.downloadOnlyColumns
    : [];
  const rubricFieldNames = [
    ...(Array.isArray(annotation?.rubric?.fields) ? annotation.rubric.fields : []),
    ...(Array.isArray(annotation?.rubric?.stage2Fields) ? annotation.rubric.stage2Fields : []),
    ...(Array.isArray(annotation?.rubric?.secondaryFields) ? annotation.rubric.secondaryFields : [])
  ].map(f => f.name).filter(Boolean);

  const annotator = annotation?._annotator || null;
  const annotatorDisplayName = annotator
    ? [annotator.firstName, annotator.lastName].filter(Boolean).join(' ') || annotator.username || annotator.email
    : null;

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

  const projectDownloadOnlyColumns = (row) => {
    const data = row.datasetRow?.data || {};
    return downloadOnlyColumns.reduce((acc, column) => {
      if (Object.prototype.hasOwnProperty.call(data, column)) {
        acc[column] = data[column];
      }
      return acc;
    }, {});
  };

  return {
    metadata: {
      datasetTitle: annotation.dataset?.title,
      datasetDescription: annotation.dataset?.description,
      rubricTitle: annotation.rubric?.title,
      annotationSessionLabel: annotation.sessionLabel || null,
      annotationSessionNumber: annotation.sessionNumber || null,
      annotator: annotator
        ? {
            displayName: annotatorDisplayName || null,
            username: annotator.username || null,
            email: annotator.email || null,
            firstName: annotator.firstName || null,
            lastName: annotator.lastName || null,
            role: annotator.role || null
          }
        : null,
      rowCount: annotation.rows?.length || 0,
      completed: annotation.completed,
      dateCreated: annotation._dateCreated,
      dateUpdated: annotation._dateUpdated
    },
    annotations: (annotation.rows || []).map((row, index) => ({
      rowNumber: index + 1,
      display: projectDisplayColumns(row),
      rubric: projectRubricFields(row),
      downloadOnly: projectDownloadOnlyColumns(row),
      preferenceChoice: row.preferenceChoice || null,
      dateAnnotated: row._dateAnnotated
    }))
  };
};

/**
 * GET /api/annotation/download/:annotationId
 * Download a single annotation as JSON with dataset metadata
 */
router.get('/download/:annotationId', requireRoles('researcher'), async (req, res) => {
  try {
    const { annotationId } = req.params;
    // Populate aggregate rows
    const annotation = await Annotation.findById(annotationId)
      .populate('dataset')
      .populate('rubric')
      .populate('_annotator', 'username email firstName lastName role')
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
router.get('/download-bulk/:datasetId', requireRoles('researcher'), async (req, res) => {
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
      .populate('_annotator', 'username email firstName lastName role')
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
