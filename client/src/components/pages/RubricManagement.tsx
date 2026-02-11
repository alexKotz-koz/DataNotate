import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useFetchDatasetsQuery, 
  useGetRubricsByDatasetQuery,
  useCreateRubricMutation,
  useUpdateRubricMutation,
  useDeleteRubricMutation,
  type RubricField 
} from '../../store';

function RubricManagement() {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const { data: rubrics, isLoading: rubricsLoading } = useGetRubricsByDatasetQuery(datasetId || '', { skip: !datasetId });
  const [createRubric, { isLoading: isCreating }] = useCreateRubricMutation();
  const [updateRubric, { isLoading: isUpdating }] = useUpdateRubricMutation();
  const [deleteRubric] = useDeleteRubricMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
  const [rubricTitle, setRubricTitle] = useState('');
  const [selectedDisplayColumns, setSelectedDisplayColumns] = useState<string[]>([]);
  const [fields, setFields] = useState<RubricField[]>([]);

  const dataset = datasets?.find(d => d._id === datasetId);

  useEffect(() => {
    if (editingRubricId && rubrics) {
      const rubric = rubrics.find(r => r._id === editingRubricId);
      if (rubric) {
        setRubricTitle(rubric.title);
        setSelectedDisplayColumns(rubric.displayColumns);
        setFields(rubric.fields);
      }
    }
  }, [editingRubricId, rubrics]);

  const handleOpenModal = (rubricId?: string) => {
    if (rubricId) {
      setEditingRubricId(rubricId);
    } else {
      setEditingRubricId(null);
      setRubricTitle('');
      setSelectedDisplayColumns([]);
      setFields([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRubricId(null);
    setRubricTitle('');
    setSelectedDisplayColumns([]);
    setFields([]);
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      { name: '', label: '', type: 'string', required: false, instructions: '', isDatasetColumn: false }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
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

  const handleSave = async () => {
    if (!datasetId || !rubricTitle.trim()) {
      alert('Please provide a rubric title');
      return;
    }

    if (selectedDisplayColumns.length === 0) {
      alert('Please select at least one display column');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one annotation field');
      return;
    }

    try {
      if (editingRubricId) {
        await updateRubric({
          rubricId: editingRubricId,
          title: rubricTitle,
          displayColumns: selectedDisplayColumns,
          fields,
        }).unwrap();
      } else {
        await createRubric({
          datasetId,
          title: rubricTitle,
          displayColumns: selectedDisplayColumns,
          fields,
        }).unwrap();
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
                  <h5 className="card-title">{rubric.title}</h5>
                  <p className="card-text text-muted">
                    <small>{rubric.fields.length} annotation fields</small><br />
                    <small>{rubric.displayColumns.length} display columns</small>
                  </p>
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
                  <label className="form-label">Dataset Columns Configuration</label>
                  <p className="text-muted small">
                    <strong>Display:</strong> Show this column during annotation<br />
                    <strong>Rubric:</strong> Annotators will fill this field (existing column)
                  </p>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Column Name</th>
                          <th className="text-center">Display</th>
                          <th className="text-center">Rubric</th>
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

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">Additional Annotation Fields</label>
                    <button className="btn btn-sm btn-outline-primary" onClick={handleAddField}>
                      <i className="bi bi-plus-lg me-1"></i>Add Custom Field
                    </button>
                  </div>
                  <p className="text-muted small">Add new fields that are not in the dataset</p>
                  
                  {fields.filter(f => !f.isDatasetColumn).map((field) => {
                    const index = fields.indexOf(field);
                    return (
                    <div key={index} className="card mb-2">
                      <div className="card-body">
                        <div className="row g-2">
                          <div className="col-md-6">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Field name (e.g., quality_score)"
                              value={field.name}
                              onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="col-md-6">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Label (e.g., Quality Score)"
                              value={field.label}
                              onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                            />
                          </div>
                          <div className="col-12">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Instructions (e.g., Only use 'vague' or 'clear')"
                              value={field.instructions || ''}
                              onChange={(e) => handleFieldChange(index, 'instructions', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <select
                              className="form-select form-select-sm"
                              value={field.type}
                              onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                            >
                              <option value="string">Text</option>
                              <option value="number">Number</option>
                              <option value="boolean">Yes/No</option>
                              <option value="select">Dropdown</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={field.required || false}
                                onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                id={`required-${index}`}
                              />
                              <label className="form-check-label" htmlFor={`required-${index}`}>
                                Required
                              </label>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <button
                              className="btn btn-sm btn-outline-danger w-100"
                              onClick={() => handleRemoveField(index)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                          {field.type === 'select' && (
                            <div className="col-12">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Options (comma-separated, e.g., Good, Fair, Poor)"
                                value={field.options?.join(', ') || ''}
                                onChange={(e) => handleFieldChange(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  {fields.filter(f => !f.isDatasetColumn).length === 0 && (
                    <p className="text-muted text-center py-3">No custom fields yet. Click "Add Custom Field" to create one.</p>
                  )}
                </div>
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
