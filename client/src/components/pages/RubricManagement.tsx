import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useFetchDatasetsQuery,
  useGetRubricsByDatasetQuery,
  useCreateRubricMutation,
  useUpdateRubricMutation,
  useDeleteRubricMutation,
  useFetchDatasetRowsQuery,
  type RubricField
} from '../../store';
import FieldBuilder from '../rubric/FieldBuilder';

function RubricManagement() {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const { data: rubrics, isLoading: rubricsLoading } = useGetRubricsByDatasetQuery(datasetId || '', { skip: !datasetId });
  const { data: datasetRows } = useFetchDatasetRowsQuery(datasetId || '', { skip: !datasetId });
  const [createRubric, { isLoading: isCreating }] = useCreateRubricMutation();
  const [updateRubric, { isLoading: isUpdating }] = useUpdateRubricMutation();
  const [deleteRubric] = useDeleteRubricMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<'standard' | 'preferenceTest'>('standard');
  const [rubricTitle, setRubricTitle] = useState('');
  const [selectedDisplayColumns, setSelectedDisplayColumns] = useState<string[]>([]);
  const [selectedDownloadOnlyColumns, setSelectedDownloadOnlyColumns] = useState<string[]>([]);
  const [fields, setFields] = useState<RubricField[]>([]);
  const [rowDisplayOrder, setRowDisplayOrder] = useState<'default' | 'random' | 'shuffle' | 'custom'>('default');
  const [customOrderColumn, setCustomOrderColumn] = useState<string>('');
  const [customRowOrder, setCustomRowOrder] = useState<any[]>([]);
  const [rangeFilterText, setRangeFilterText] = useState<string>('');

  // Preference Test fields
  const [preferenceColumnA, setPreferenceColumnA] = useState<string>('');
  const [preferenceColumnB, setPreferenceColumnB] = useState<string>('');
  const [preferenceQuestion, setPreferenceQuestion] = useState<string>('');
  const [stage2Fields, setStage2Fields] = useState<RubricField[]>([]);
  const [secondaryDisplayColumns, setSecondaryDisplayColumns] = useState<string[]>([]);
  const [secondaryFields, setSecondaryFields] = useState<RubricField[]>([]);

  const dataset = datasets?.find(d => d._id === datasetId);

  useEffect(() => {
    if (editingRubricId && rubrics) {
      const rubric = rubrics.find(r => r._id === editingRubricId);
      if (rubric) {
        setTaskType(rubric.taskType || 'standard');
        setRubricTitle(rubric.title);
        setSelectedDisplayColumns(rubric.displayColumns);
        setSelectedDownloadOnlyColumns(rubric.downloadOnlyColumns || []);
        setFields(rubric.fields);
        setRowDisplayOrder(rubric.rowDisplayOrder || 'default');
        setCustomOrderColumn(rubric.customOrderColumn || '');
        setCustomRowOrder(rubric.customRowOrder || []);
        setPreferenceColumnA(rubric.preferenceColumns?.[0] || '');
        setPreferenceColumnB(rubric.preferenceColumns?.[1] || '');
        setPreferenceQuestion(rubric.preferenceQuestion || '');
        setStage2Fields(rubric.stage2Fields || []);
        setSecondaryDisplayColumns(rubric.secondaryDisplayColumns || []);
        setSecondaryFields(rubric.secondaryFields || []);
      }
    }
  }, [editingRubricId, rubrics]);

  const resetModalState = () => {
    setTaskType('standard');
    setRubricTitle('');
    setSelectedDisplayColumns([]);
    setSelectedDownloadOnlyColumns([]);
    setFields([]);
    setRowDisplayOrder('default');
    setCustomOrderColumn('');
    setCustomRowOrder([]);
    setRangeFilterText('');
    setPreferenceColumnA('');
    setPreferenceColumnB('');
    setPreferenceQuestion('');
    setStage2Fields([]);
    setSecondaryDisplayColumns([]);
    setSecondaryFields([]);
  };

  const handleOpenModal = (rubricId?: string) => {
    if (rubricId) {
      setEditingRubricId(rubricId);
    } else {
      setEditingRubricId(null);
      resetModalState();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRubricId(null);
    resetModalState();
  };

  const handleFieldChange = (index: number, key: keyof RubricField, value: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], [key]: value };
    setFields(updatedFields);
  };

  const handleToggleDisplayColumn = (column: string) => {
    setSelectedDisplayColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const handleToggleDownloadOnlyColumn = (column: string) => {
    setSelectedDownloadOnlyColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const handleToggleRubricColumn = (column: string) => {
    const existingIndex = fields.findIndex(f => f.name === column && f.isDatasetColumn);
    
    if (existingIndex >= 0) {
      // Remove from rubric fields
      setFields(fields.filter((_, i) => i !== existingIndex));
    } else {
      // Add as rubric field from dataset
      setFields([...fields, { 
        name: column, 
        label: column, 
        type: 'string', 
        required: false,
        instructions: '',
        isDatasetColumn: true 
      }]);
    }
  };

  const handleCustomOrderColumnChange = (column: string) => {
    setCustomOrderColumn(column);
    
    if (column && datasetRows) {
      // Extract unique values from the selected column and sort them naturally
      const uniqueValues = Array.from(
        new Set(datasetRows.map(row => row.data[column]))
      ).filter(val => val !== null && val !== undefined);
      
      // Natural sort to handle patterns like 1_1, 1_2, ..., 1_10 correctly
      const sorted = uniqueValues.sort((a, b) => {
        return String(a).localeCompare(String(b), undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        });
      });
      
      setCustomRowOrder(sorted);
    } else {
      setCustomRowOrder([]);
    }
  };

  const handleReorderDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex !== dropIndex) {
      const newOrder = [...customRowOrder];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, removed);
      setCustomRowOrder(newOrder);
    }
  };

  const handleFilterByRange = (rangeText: string) => {
    if (!customOrderColumn || !datasetRows) return;

    // Parse range expressions like "1_1-1_5, 2_3-2_8, 3_1-3_10"
    const ranges = rangeText.split(',').map(r => r.trim()).filter(r => r.length > 0);
    
    if (ranges.length === 0) {
      // Reset to all values if empty
      handleCustomOrderColumnChange(customOrderColumn);
      return;
    }

    const allValues = Array.from(
      new Set(datasetRows.map(row => row.data[customOrderColumn]))
    ).filter(val => val !== null && val !== undefined);

    const selectedValues: any[] = [];

    ranges.forEach(range => {
      if (range.includes('-')) {
        // Range like "1_1-1_5"
        const [start, end] = range.split('-').map(s => s.trim());
        
        // Find all values that fall within this range
        const filtered = allValues.filter(val => {
          const valStr = String(val);
          return valStr.localeCompare(start, undefined, { numeric: true, sensitivity: 'base' }) >= 0 &&
                 valStr.localeCompare(end, undefined, { numeric: true, sensitivity: 'base' }) <= 0;
        });
        
        selectedValues.push(...filtered);
      } else {
        // Single value
        if (allValues.includes(range)) {
          selectedValues.push(range);
        }
      }
    });

    // Sort naturally and remove duplicates
    const uniqueSorted = Array.from(new Set(selectedValues)).sort((a, b) => {
      return String(a).localeCompare(String(b), undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
    });

    setCustomRowOrder(uniqueSorted);
  };

  const handleSave = async () => {
    if (!datasetId || !rubricTitle.trim()) {
      alert('Please provide a rubric title');
      return;
    }

    if (taskType === 'standard') {
      if (selectedDisplayColumns.length === 0) {
        alert('Please select at least one display column');
        return;
      }
      if (fields.length === 0) {
        alert('Please add at least one annotation field');
        return;
      }
    } else {
      if (!preferenceColumnA || !preferenceColumnB) {
        alert('Please select the two columns to compare');
        return;
      }
      if (preferenceColumnA === preferenceColumnB) {
        alert('The two preference columns must be different');
        return;
      }
      if (!preferenceQuestion.trim()) {
        alert('Please provide the preference question');
        return;
      }
    }

    const basePayload = {
      title: rubricTitle,
      taskType,
      displayColumns: selectedDisplayColumns,
      downloadOnlyColumns: selectedDownloadOnlyColumns,
      fields: taskType === 'standard' ? fields : [],
      rowDisplayOrder,
      customOrderColumn: rowDisplayOrder === 'custom' ? customOrderColumn : undefined,
      customRowOrder: rowDisplayOrder === 'custom' ? customRowOrder : undefined,
      ...(taskType === 'preferenceTest' ? {
        preferenceColumns: [preferenceColumnA, preferenceColumnB],
        preferenceQuestion,
        stage2Fields,
        secondaryDisplayColumns,
        secondaryFields,
      } : {}),
    };

    try {
      if (editingRubricId) {
        await updateRubric({ rubricId: editingRubricId, ...basePayload }).unwrap();
      } else {
        await createRubric({ datasetId, ...basePayload }).unwrap();
      }
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save rubric:', error);
      const errorMsg = error?.data?.error || 'Failed to save rubric';
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleDelete = async (rubricId: string) => {
    if (!window.confirm('Are you sure you want to delete this rubric? All annotations for this rubric will also be deleted.')) {
      return;
    }

    try {
      await deleteRubric(rubricId).unwrap();
    } catch (error) {
      console.error('Failed to delete rubric:', error);
      alert('Failed to delete rubric');
    }
  };

  if (!datasetId || !dataset) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Please select a dataset first.</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Rubrics for {dataset.title}</h2>
          <p className="text-muted">{dataset.description}</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg me-2"></i>Create New Rubric
        </button>
      </div>

      {rubricsLoading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : rubrics && rubrics.length > 0 ? (
        <div className="row">
          {rubrics.map(rubric => (
            <div key={rubric._id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">
                    {rubric.title}
                    {rubric.taskType === 'preferenceTest' && (
                      <span className="badge bg-info-subtle text-info-emphasis ms-2">Preference Test</span>
                    )}
                  </h5>
                  {rubric.taskType === 'preferenceTest' ? (
                    <p className="card-text text-muted">
                      <small>Comparing: {rubric.preferenceColumns?.join(' vs ')}</small><br />
                      <small>{(rubric.stage2Fields?.length || 0) + (rubric.secondaryFields?.length || 0)} survey fields</small>
                    </p>
                  ) : (
                    <p className="card-text text-muted">
                      <small>{rubric.fields.length} annotation fields</small><br />
                      <small>{rubric.displayColumns.length} display columns</small>
                    </p>
                  )}
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleOpenModal(rubric._id)}
                    >
                      <i className="bi bi-pencil me-1"></i>Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(rubric._id)}
                    >
                      <i className="bi bi-trash me-1"></i>Delete
                    </button>
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => navigate(`/annotate/${datasetId}/${rubric._id}`)}
                    >
                      <i className="bi bi-pencil-square me-1"></i>Annotate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info">
          No rubrics yet. Create one to start annotating!
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingRubricId ? 'Edit Rubric' : 'Create New Rubric'}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rubric Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={rubricTitle}
                    onChange={(e) => setRubricTitle(e.target.value)}
                    placeholder="e.g., Quality Assessment, Accuracy Check"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Task Type</label>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <input
                        type="radio"
                        className="btn-check"
                        name="taskType"
                        id="task-type-standard"
                        checked={taskType === 'standard'}
                        disabled={!!editingRubricId}
                        onChange={() => setTaskType('standard')}
                      />
                      <label className="btn btn-outline-primary w-100" htmlFor="task-type-standard">
                        <i className="bi bi-card-checklist me-2"></i>
                        Standard
                        <small className="d-block text-muted">Rate/annotate each row</small>
                      </label>
                    </div>
                    <div className="col-md-6">
                      <input
                        type="radio"
                        className="btn-check"
                        name="taskType"
                        id="task-type-preference"
                        checked={taskType === 'preferenceTest'}
                        disabled={!!editingRubricId}
                        onChange={() => setTaskType('preferenceTest')}
                      />
                      <label className="btn btn-outline-primary w-100" htmlFor="task-type-preference">
                        <i className="bi bi-arrow-left-right me-2"></i>
                        Preference Test
                        <small className="d-block text-muted">Compare two columns head-to-head</small>
                      </label>
                    </div>
                  </div>
                  {editingRubricId && (
                    <small className="text-muted d-block mt-1">Task type can't be changed after a rubric is created.</small>
                  )}
                </div>

                {taskType === 'standard' && (
                <div className="mb-4">
                  <label className="form-label">Dataset Columns Configuration</label>
                  <p className="text-muted small">
                    <strong>Display:</strong> Show this column during annotation<br />
                    <strong>Rubric:</strong> Annotators will fill this field (existing column)<br />
                    <strong>Download Only:</strong> Not shown during annotation; included only in the final data download
                  </p>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Column Name</th>
                          <th className="text-center">Display</th>
                          <th className="text-center">Rubric</th>
                          <th className="text-center">Download Only</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataset.columns.map(column => {
                          const rubricIndex = fields.findIndex(f => f.name === column && f.isDatasetColumn);
                          const isInRubric = rubricIndex >= 0;
                          return (
                            <tr key={column}>
                              <td>{column}</td>
                              <td className="text-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={selectedDisplayColumns.includes(column)}
                                  onChange={() => handleToggleDisplayColumn(column)}
                                />
                              </td>
                              <td className="text-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={isInRubric}
                                  onChange={() => handleToggleRubricColumn(column)}
                                />
                              </td>
                              <td className="text-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={selectedDownloadOnlyColumns.includes(column)}
                                  onChange={() => handleToggleDownloadOnlyColumn(column)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Optional field instructions"
                                  value={isInRubric ? fields[rubricIndex]?.instructions || '' : ''}
                                  onChange={(e) => handleFieldChange(rubricIndex, 'instructions', e.target.value)}
                                  disabled={!isInRubric}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}

                <div className="mb-4">
                  <label className="form-label">Row Display Order</label>
                  <p className="text-muted small">
                    Choose how dataset rows are displayed during annotation sessions
                  </p>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <input
                        type="radio"
                        className="btn-check"
                        name="rowDisplayOrder"
                        id="order-default"
                        checked={rowDisplayOrder === 'default'}
                        onChange={() => setRowDisplayOrder('default')}
                      />
                      <label className="btn btn-outline-primary w-100" htmlFor="order-default">
                        <i className="bi bi-list-ol me-2"></i>
                        Default Order
                        <small className="d-block text-muted">Original upload order</small>
                      </label>
                    </div>

                    <div className="col-md-6">
                      <input
                        type="radio"
                        className="btn-check"
                        name="rowDisplayOrder"
                        id="order-random"
                        checked={rowDisplayOrder === 'random'}
                        onChange={() => setRowDisplayOrder('random')}
                      />
                      <label className="btn btn-outline-primary w-100" htmlFor="order-random">
                        <i className="bi bi-shuffle me-2"></i>
                        Random
                        <small className="d-block text-muted">Different order per session</small>
                      </label>
                    </div>

                    <div className="col-md-6">
                      <input
                        type="radio"
                        className="btn-check"
                        name="rowDisplayOrder"
                        id="order-shuffle"
                        checked={rowDisplayOrder === 'shuffle'}
                        onChange={() => setRowDisplayOrder('shuffle')}
                      />
                      <label className="btn btn-outline-primary w-100" htmlFor="order-shuffle">
                        <i className="bi bi-arrow-down-up me-2"></i>
                        Shuffle Once
                        <small className="d-block text-muted">Same shuffled order for all</small>
                      </label>
                    </div>

                    <div className="col-md-6">
                      <input
                        type="radio"
                        className="btn-check"
                        name="rowDisplayOrder"
                        id="order-custom"
                        checked={rowDisplayOrder === 'custom'}
                        onChange={() => setRowDisplayOrder('custom')}
                      />
                      <label className="btn btn-outline-primary w-100" htmlFor="order-custom">
                        <i className="bi bi-sliders me-2"></i>
                        Custom Order
                        <small className="d-block text-muted">Sort & filter by column</small>
                      </label>
                    </div>
                  </div>

                  {rowDisplayOrder === 'custom' && (
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="mb-3">Custom Order Settings</h6>
                        <div className="mb-3">
                          <label className="form-label">Order by Column</label>
                          <select 
                            className="form-select" 
                            value={customOrderColumn}
                            onChange={(e) => handleCustomOrderColumnChange(e.target.value)}
                          >
                            <option value="">Select column...</option>
                            {dataset.columns.map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                          <small className="text-muted">Choose which column to use for custom ordering</small>
                        </div>

                        {customOrderColumn && customRowOrder.length > 0 && (
                          <>
                            <div className="mb-3">
                              <label className="form-label">Filter by Range (Optional)</label>
                              <input
                                type="text"
                                className="form-control font-monospace"
                                placeholder="e.g., 1_1-1_5, 2_3-2_8, 3_1-3_10"
                                value={rangeFilterText}
                                onChange={(e) => setRangeFilterText(e.target.value)}
                                onBlur={(e) => handleFilterByRange(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleFilterByRange((e.target as HTMLInputElement).value);
                                  }
                                }}
                              />
                              <small className="text-muted">
                                Enter ranges to include (e.g., <code>1_1-1_5, 2_1-2_10</code>) or leave blank for all values. Press Enter to apply.
                              </small>
                            </div>

                            <div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label mb-0">
                                  Row Order Preview ({customRowOrder.length} items)
                                </label>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => {
                                    setRangeFilterText('');
                                    handleCustomOrderColumnChange(customOrderColumn);
                                  }}
                                >
                                  <i className="bi bi-arrow-clockwise me-1"></i>
                                  Reset
                                </button>
                              </div>
                              <small className="text-muted d-block mb-2">
                                Rows are sorted naturally by default. Drag to reorder.
                              </small>
                              <div 
                                className="border rounded bg-white" 
                                style={{ maxHeight: '300px', overflowY: 'auto' }}
                              >
                                {customRowOrder.map((value, index) => (
                                  <div
                                    key={`${value}-${index}`}
                                    draggable
                                    onDragStart={(e) => handleReorderDragStart(e, index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleReorderDrop(e, index)}
                                    className="d-flex align-items-center p-2 border-bottom"
                                    style={{ cursor: 'move' }}
                                  >
                                    <span className="text-muted me-3" style={{ minWidth: '40px' }}>
                                      {index + 1}.
                                    </span>
                                    <i className="bi bi-grip-vertical text-muted me-2"></i>
                                    <code className="flex-grow-1">{String(value)}</code>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {taskType === 'standard' && (
                <div className="mb-3">
                  <label className="form-label mb-0">Additional Annotation Fields</label>
                  <FieldBuilder
                    fields={fields.filter(f => !f.isDatasetColumn)}
                    onChange={(updated) => setFields([...fields.filter(f => f.isDatasetColumn), ...updated])}
                    helpText="Add new fields that are not in the dataset"
                    emptyText='No custom fields yet. Click "Add Custom Field" to create one.'
                  />
                </div>
                )}

                {taskType === 'preferenceTest' && (
                <>
                  <div className="mb-4">
                    <label className="form-label">Preference Columns</label>
                    <p className="text-muted small">
                      Choose the two dataset columns to compare. These are shown blinded (as "Response A" / "Response B")
                      until the final stage.
                    </p>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label small">Response A</label>
                        <select
                          className="form-select"
                          value={preferenceColumnA}
                          onChange={(e) => setPreferenceColumnA(e.target.value)}
                        >
                          <option value="">Select column...</option>
                          {dataset.columns.filter(c => c !== preferenceColumnB).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small">Response B</label>
                        <select
                          className="form-select"
                          value={preferenceColumnB}
                          onChange={(e) => setPreferenceColumnB(e.target.value)}
                        >
                          <option value="">Select column...</option>
                          {dataset.columns.filter(c => c !== preferenceColumnA).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Preference Question</label>
                    <p className="text-muted small">Shown to the annotator alongside the two blinded responses (stage 1).</p>
                    <input
                      type="text"
                      className="form-control"
                      value={preferenceQuestion}
                      onChange={(e) => setPreferenceQuestion(e.target.value)}
                      placeholder="e.g., Which response do you prefer?"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Display Columns (context)</label>
                    <p className="text-muted small">
                      Optional dataset columns shown above the comparison at all times (e.g. the original prompt).
                    </p>
                    <div className="d-flex flex-wrap gap-3">
                      {dataset.columns.filter(c => c !== preferenceColumnA && c !== preferenceColumnB).map(col => (
                        <div className="form-check" key={col}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`display-${col}`}
                            checked={selectedDisplayColumns.includes(col)}
                            onChange={() => handleToggleDisplayColumn(col)}
                          />
                          <label className="form-check-label" htmlFor={`display-${col}`}>{col}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label mb-0">Stage 2: Follow-up Survey</label>
                    <FieldBuilder
                      fields={stage2Fields}
                      onChange={setStage2Fields}
                      addLabel="Add Question"
                      helpText="Shown after the annotator picks a preference; both responses remain blinded."
                      emptyText="No follow-up questions yet."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Stage 3: Secondary Reveal Columns</label>
                    <p className="text-muted small">
                      Additional dataset columns revealed only in the final, unblinded stage (e.g. a transcript).
                    </p>
                    <div className="d-flex flex-wrap gap-3">
                      {dataset.columns.filter(c => c !== preferenceColumnA && c !== preferenceColumnB).map(col => (
                        <div className="form-check" key={col}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`secondary-${col}`}
                            checked={secondaryDisplayColumns.includes(col)}
                            onChange={() => setSecondaryDisplayColumns(prev =>
                              prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                            )}
                          />
                          <label className="form-check-label" htmlFor={`secondary-${col}`}>{col}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label mb-0">Stage 3: Secondary Survey</label>
                    <FieldBuilder
                      fields={secondaryFields}
                      onChange={setSecondaryFields}
                      addLabel="Add Question"
                      helpText="Shown in the final stage, after real labels are revealed."
                      emptyText="No secondary questions yet."
                    />
                  </div>
                </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={isCreating || isUpdating}
                >
                  {isCreating || isUpdating ? 'Saving...' : 'Save Rubric'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RubricManagement;
