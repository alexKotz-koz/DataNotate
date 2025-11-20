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
router.post('/save', async (req, res) => {
  try {
    const { datasetId, rubricId, datasetRowId, annotations } = req.body;

    if (!datasetId || !rubricId || !datasetRowId || !annotations) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the row exists and belongs to the dataset
    const row = await DatasetRow.findOne({ _id: datasetRowId, dataset: datasetId });
    if (!row) {
      return res.status(404).json({ error: 'Dataset row not found' });
    }

    // Verify rubric exists
    const rubric = await Rubric.findById(rubricId);
    if (!rubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    // Upsert the annotation (one per row per rubric per annotator)
    const annotation = await Annotation.findOneAndUpdate(
      { datasetRow: datasetRowId, rubric: rubricId, _annotator: req.user?._id || null },
      {
        dataset: datasetId,
        rubric: rubricId,
        datasetRow: datasetRowId,
        annotations,
        _annotator: req.user?._id || null,
        _dateUpdated: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, annotation });
  } catch (e) {
    console.error('Error saving annotation:', e);
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
      // Stats for specific rubric
      const rubric = await Rubric.findById(rubricId);
      if (!rubric) {
        return res.status(404).json({ error: 'Rubric not found' });
      }
      
      const annotations = await Annotation.find({ dataset: datasetId, rubric: rubricId });
      const requiredFields = rubric.fields.filter(f => f.required).map(f => f.name);
      const completeAnnotations = annotations.filter(annotation => {
        return requiredFields.every(fieldName => {
          const value = annotation.annotations[fieldName];
          return value !== undefined && value !== null && value !== '';
        });
      });
      
      const annotatedRows = completeAnnotations.length;
      
      return res.json({
        totalRows,
        annotatedRows,
        remainingRows: totalRows - annotatedRows,
        percentComplete: totalRows > 0 ? (annotatedRows / totalRows) * 100 : 0
      });
    }
    
    // Stats across all rubrics
    const rubrics = await Rubric.find({ dataset: datasetId });
    const annotations = await Annotation.find({ dataset: datasetId });
    
    res.json({
      totalRows,
      totalAnnotations: annotations.length,
      rubricCount: rubrics.length
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/annotation/download/:annotationId
 * Download a single annotation as JSON with dataset metadata
 */
router.get('/download/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;
    
    const annotation = await Annotation.findById(annotationId)
      .populate('dataset')
      .populate('rubric')
      .populate('datasetRow');
    
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    
    // Build output format matching the template
    const output = {
      metadata: {
        datasetId: annotation.dataset._id,
        datasetTitle: annotation.dataset.title,
        datasetDescription: annotation.dataset.description,
        rubricId: annotation.rubric._id,
        rubricTitle: annotation.rubric.title,
        annotationId: annotation._id,
        annotator: annotation._annotator,
        dateCreated: annotation._dateCreated,
        dateUpdated: annotation._dateUpdated
      },
      data: {
        ...annotation.datasetRow.data,
        ...annotation.annotations
      }
    };
    
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
    
    const annotations = await Annotation.find(query)
      .populate('dataset')
      .populate('rubric')
      .populate('datasetRow');
    
    if (annotations.length === 0) {
      return res.status(404).json({ error: 'No annotations found' });
    }
    
    // Build output array
    const output = annotations.map(annotation => ({
      metadata: {
        datasetId: annotation.dataset._id,
        datasetTitle: annotation.dataset.title,
        datasetDescription: annotation.dataset.description,
        rubricId: annotation.rubric._id,
        rubricTitle: annotation.rubric.title,
        annotationId: annotation._id,
        annotator: annotation._annotator,
        dateCreated: annotation._dateCreated,
        dateUpdated: annotation._dateUpdated
      },
      data: {
        ...annotation.datasetRow.data,
        ...annotation.annotations
      }
    }));
    
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
