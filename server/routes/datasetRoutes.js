const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
/* FS: Nodes file system module, allows you to interact with the file system (read, write, deletes, treams)
    - createReadStream(filepath): Creates a reabable stream for the file, piping it into csv()
    - readFileSync(filePath, 'utf8'): Reads the whole file contents into memory synchronously. Used here for JSON because (a) typically smaller, (b) simpler to parse with JSON.parse
    - unlinkSync(filePath): Deletes temporary uploaded file from dis immediately, keeps uploads dir clean
*/
const csv = require('csv-parser');

const Dataset = mongoose.model('Dataset');
const DatasetRow = mongoose.model('DatasetRow');

const upload = multer({ dest: 'uploads/' }); // Express middleware that parses multipart/form-data (file uploads)
const router = express.Router();

/**
 * GET /api/dataset/fetch-all
 * Return all datasets (metadata only)
 */
router.get('/fetch-all', async (req, res) => {
  try {
    const datasets = await Dataset.find({}).sort({ _dateCreated: -1 });
    res.json(datasets);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch datasets' });
  }
});

/**
 * GET /api/dataset/:id/rows
 * Return rows for a dataset
 */
router.get('/:id/rows', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await DatasetRow.find({ dataset: id }).limit(1000);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rows' });
  }
});

/**
 * POST /api/dataset/upload
 * Accept FormData: file, title, description, uploadType
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File missing' });

  const { title, description, uploadType } = req.body;
  const filePath = req.file.path;

  try {
    let columns = [];
    let rawRows = [];

    if (uploadType === 'csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', (h) => { columns = h; })
          .on('data', (row) => rawRows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (uploadType === 'json') {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'JSON must be a non-empty array' });
      }
      columns = Object.keys(parsed[0]);
      rawRows = parsed;
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid uploadType' });
    }

    const dataset = await Dataset.create({
      title,
      description,
      uploadType,
      columns,
      _createdBy: null
    });

    const docs = rawRows.map(r => ({
      dataset: dataset._id,
      data: r,
      rowId: r.id || r.ID || null
    }));

    if (docs.length) {
      await DatasetRow.insertMany(docs);
    }
    // WHAT DOES THIS DO?
    fs.unlinkSync(filePath);
    res.json({ success: true, datasetId: dataset._id });
  } catch (e) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;