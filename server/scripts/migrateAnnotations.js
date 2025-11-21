/**
 * Migration Script: Convert legacy per-row Annotation documents into aggregate annotation records.
 *
 * Legacy schema (OLD): One Annotation per datasetRow with fields: dataset, rubric, datasetRow, annotations
 * New schema (NEW): One Annotation per (dataset, rubric, annotator) containing rows[] subdocuments each with
 *                   { datasetRow, values }
 *
 * Strategy:
 * 1. Find legacy docs: documents that have `datasetRow` and no `rows` array.
 * 2. Group legacy docs by (dataset, rubric, _annotator/null).
 * 3. For each group, locate existing aggregate doc; if missing create one.
 * 4. Append each legacy row's annotations into aggregate.rows (skip duplicates).
 * 5. Mark aggregate completed if rows.length >= targetRowCount.
 * 6. Remove legacy documents after successful migration.
 * 7. Report summary.
 *
 * Usage:
 *   NODE_ENV=development node server/scripts/migrateAnnotations.js
 */

const mongoose = require('mongoose');
const keys = require('../../config/keys');

// Load models
require('../models/User');
require('../models/Dataset');
require('../models/DatasetRow');
require('../models/Rubric');
require('../models/Annotation');

const Annotation = mongoose.model('Annotation');

async function runMigration() {
  await mongoose.connect(keys.mongoURI);
  console.log('[Migration] Connected to MongoDB');

  // Find legacy docs: have datasetRow field and do NOT have rows array
  const legacyDocs = await Annotation.find({ datasetRow: { $exists: true }, rows: { $exists: false } });
  if (!legacyDocs.length) {
    console.log('[Migration] No legacy annotation documents found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`[Migration] Found ${legacyDocs.length} legacy annotation documents.`);

  // Group by composite key
  const groups = new Map();
  for (const doc of legacyDocs) {
    const key = `${doc.dataset.toString()}::${doc.rubric.toString()}::${doc._annotator ? doc._annotator.toString() : 'null'}`;
    if (!groups.has(key)) {
      groups.set(key, { meta: { dataset: doc.dataset, rubric: doc.rubric, _annotator: doc._annotator || null }, rows: [] });
    }
    groups.get(key).rows.push(doc);
  }

  let aggregateCreated = 0;
  let aggregateUpdated = 0;
  let legacyProcessed = 0;

  for (const [key, group] of groups.entries()) {
    const { dataset, rubric, _annotator } = group.meta;
    let aggregate = await Annotation.findOne({ dataset, rubric, _annotator, rows: { $exists: true } });
    if (!aggregate) {
      aggregate = await Annotation.create({ dataset, rubric, _annotator, rows: [], targetRowCount: 25 });
      aggregateCreated++;
    } else {
      aggregateUpdated++;
    }

    const existingRowIds = new Set(aggregate.rows.map(r => r.datasetRow.toString()));

    for (const legacy of group.rows) {
      // Skip if already present
      if (existingRowIds.has(legacy.datasetRow.toString())) continue;
      aggregate.rows.push({ datasetRow: legacy.datasetRow, values: legacy.annotations || {} });
      existingRowIds.add(legacy.datasetRow.toString());
      legacyProcessed++;
    }

    if (aggregate.rows.length >= aggregate.targetRowCount) {
      aggregate.completed = true;
    }
    aggregate._dateUpdated = new Date();
    await aggregate.save();
  }

  // Delete legacy docs after successful migration
  const legacyIds = legacyDocs.map(d => d._id);
  await Annotation.deleteMany({ _id: { $in: legacyIds } });

  console.log('[Migration] Summary:');
  console.log(`  Legacy docs processed: ${legacyDocs.length}`);
  console.log(`  Row annotations migrated: ${legacyProcessed}`);
  console.log(`  Aggregates created: ${aggregateCreated}`);
  console.log(`  Aggregates updated: ${aggregateUpdated}`);
  console.log('  Legacy documents removed.');

  await mongoose.disconnect();
  console.log('[Migration] MongoDB disconnected. Migration complete.');
}

runMigration().catch(err => {
  console.error('[Migration] Fatal error:', err);
  mongoose.disconnect();
});
