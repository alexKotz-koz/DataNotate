import { useMemo, useState, type FormEvent } from 'react';
import { useFetchDatasetsQuery, useGetRubricByDatasetQuery, useSaveRubricMutation, type RubricField } from '../../store';

export default function DatasetConfigure() {
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const selectedDataset = useMemo(() => datasets?.find(d => d._id === selectedDatasetId), [datasets, selectedDatasetId]);

  const { data: existingRubric } = useGetRubricByDatasetQuery(selectedDatasetId, { skip: !selectedDatasetId });
  const [saveRubric, { isLoading }] = useSaveRubricMutation();

  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [rubricFields, setRubricFields] = useState<RubricField[]>([]);

  // Initialize defaults when dataset or existing rubric changes
  const columns = selectedDataset?.columns ?? [];
  useMemo(() => {
    if (!selectedDatasetId) return;
    if (existingRubric) {
      setDisplayColumns(existingRubric.displayColumns);
      setRubricFields(existingRubric.fields);
    } else if (columns.length) {
      // Heuristic defaults based on your example
      const defaultDisplay = columns.filter(c => ['qa_id','question','answer'].includes(c));
      const defaultRubric = ['label','cr_proportion','justification'].filter(c => columns.includes(c))
        .map(name => ({ name, label: name, type: name === 'cr_proportion' ? 'number' : 'string', required: false })) as RubricField[];
      setDisplayColumns(defaultDisplay);
      setRubricFields(defaultRubric);
    }
  }, [selectedDatasetId, existingRubric, columns]);

  const toggleDisplay = (col: string) => {
    setDisplayColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const toggleRubric = (col: string) => {
    setRubricFields(prev => {
      const exists = prev.find(f => f.name === col);
      if (exists) return prev.filter(f => f.name !== col);
      return [...prev, { name: col, label: col, type: 'string', required: false }];
    });
  };

  const updateRubricField = (name: string, patch: Partial<RubricField>) => {
    setRubricFields(prev => prev.map(f => f.name === name ? { ...f, ...patch } : f));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;
    await saveRubric({ datasetId: selectedDatasetId, displayColumns, fields: rubricFields }).unwrap();
    alert('Saved');
  };

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 800 }}>
      <h3>Configure Dataset</h3>

      <label>
        Dataset:
        <select value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)}>
          <option value="">Select a dataset…</option>
          {datasets?.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
        </select>
      </label>

      {selectedDataset && (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <h4>Columns</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {columns.map(col => (
                <li key={col} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ minWidth: 160 }}>{col}</label>
                  <label><input type="checkbox" checked={displayColumns.includes(col)} onChange={() => toggleDisplay(col)} /> Display</label>
                  <label><input type="checkbox" checked={!!rubricFields.find(f => f.name === col)} onChange={() => toggleRubric(col)} /> Rubric</label>
                  {rubricFields.find(f => f.name === col) && (
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <select value={rubricFields.find(f => f.name === col)!.type}
                        onChange={e => updateRubricField(col, { type: e.target.value as RubricField['type'] })}>
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="select">select</option>
                      </select>
                      <label>
                        Required
                        <input type="checkbox"
                          checked={!!rubricFields.find(f => f.name === col)?.required}
                          onChange={e => updateRubricField(col, { required: e.target.checked })} />
                      </label>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" disabled={isLoading}>Save configuration</button>
        </form>
      )}
    </div>
  );
}