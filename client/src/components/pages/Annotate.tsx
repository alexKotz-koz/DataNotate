import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useFetchDatasetsQuery,
  useFetchDatasetRowsQuery,
  useGetRubricByIdQuery,
  useSaveAnnotationMutation,
  useFetchAnnotationsByDatasetQuery,
} from '../../store';

export default function Annotate() {
  const { datasetId, rubricId } = useParams<{ datasetId: string; rubricId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const annotationSessionId = searchParams.get('session') || undefined;

  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const { data: rows } = useFetchDatasetRowsQuery(datasetId || '', { skip: !datasetId });
  const { data: rubric } = useGetRubricByIdQuery(rubricId || '', { skip: !rubricId });
  const { data: aggregateAnnotations } = useFetchAnnotationsByDatasetQuery(
    { datasetId: datasetId || '', rubricId: rubricId || '', mine: true, annotationId: annotationSessionId }, 
    { skip: !datasetId || !rubricId }
  );
  const [saveAnnotation, { isLoading: isSaving }] = useSaveAnnotationMutation();

  const dataset = datasets?.find(d => d._id === datasetId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Get current row
  const currentRow = rows?.[currentIndex];

  // Aggregate annotation record and row entry
  const aggregate = useMemo(() => {
    if (!aggregateAnnotations || aggregateAnnotations.length === 0) return null;
    if (annotationSessionId) {
      const match = aggregateAnnotations.find(a => a._id === annotationSessionId);
      if (match) return match;
    }
    return aggregateAnnotations[0];
  }, [aggregateAnnotations, annotationSessionId]);
  const existingRowEntry = aggregate?.rows.find(r => {
    const rowId = typeof r.datasetRow === 'string' ? r.datasetRow : r.datasetRow?._id;
    return rowId === currentRow?._id;
  });

  // Load existing annotation when row changes
  useEffect(() => {
    if (existingRowEntry) {
      setFormData(existingRowEntry.values || {});
    } else {
      setFormData({});
    }
  }, [currentRow?._id, existingRowEntry]);

  if (!dataset || !rubric) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>Dataset or Rubric not found</h4>
          <p>Please select a valid dataset and rubric to start annotating.</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary mt-2">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info">
          <h4>No data to annotate</h4>
          <button onClick={() => navigate(-1)} className="btn btn-primary mt-2">
            Back
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / rows.length) * 100;
  const annotatedCount = aggregate?.rows.length || 0;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < rows.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const saveCurrentRow = async () => {
    if (!currentRow || !rubricId || !datasetId) {
      throw new Error('Missing dataset, rubric, or row information.');
    }

    const result = await saveAnnotation({
      datasetId,
      rubricId,
      datasetRowId: currentRow._id,
      annotations: formData,
      annotationId: aggregate?._id || annotationSessionId,
    }).unwrap();

    if (!annotationSessionId) {
      setSearchParams({ session: result.annotation._id });
    }

    if (result.annotation.completed && !aggregate?.completed) {
      alert('Rubric annotation record completed!');
    }

    return result;
  };

  const handleSave = async () => {
    try {
      await saveCurrentRow();
      if (currentIndex < rows.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error('Failed to save annotation:', err);
      alert('Failed to save annotation. Please try again.');
    }
  };

  const handleSubmit = async () => {
    try {
      await saveCurrentRow();
      navigate('/annotator');
    } catch (err) {
      console.error('Failed to submit annotation:', err);
      alert('Failed to submit annotation. Please try again.');
    }
  };

  // Check if we're on the last row
  const isLastRow = currentIndex === rows.length - 1;

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-link p-0 mb-2 text-decoration-none">
            ← Back to Dataset
          </button>
          <h2 className="mb-1">Annotate: {dataset.title}</h2>
          <p className="text-muted mb-0">
            <strong>Rubric:</strong> {rubric.title} • Row {currentIndex + 1} of {rows.length} • {annotatedCount} annotated
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card shadow-sm mb-4">
        <div className="card-body py-2">
          <div className="d-flex align-items-center">
            <span className="text-muted small me-3">Progress:</span>
            <div className="progress flex-grow-1" style={{ height: 8 }}>
              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-muted small ms-3">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Panel - Data Display */}
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Data Row</h5>
              {existingRowEntry && (
                <span className="badge bg-success">Previously Annotated</span>
              )}
            </div>
            <div className="card-body">
              {currentRow && rubric.displayColumns.map(col => (
                <div key={col} className="mb-3">
                  <label className="form-label fw-bold text-primary">{col}</label>
                  <div className="p-3 bg-light rounded">
                    {String(currentRow.data[col] || '—')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Annotation Form */}
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Annotation Fields</h5>
            </div>
            <div className="card-body">
              {rubric.fields.map(field => (
                <div key={field.name} className="mb-3">
                  <label className="form-label">
                    {field.label}
                    {field.required && <span className="text-danger">*</span>}
                  </label>
                  {field.instructions && (
                    <div className="text-muted small mb-2">
                      {field.instructions}
                    </div>
                  )}

                  {field.type === 'string' && (
                    <textarea
                      className="form-control"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      required={field.required}
                      rows={3}
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      className="form-control"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value))}
                      required={field.required}
                      step="any"
                    />
                  )}

                  {field.type === 'boolean' && (
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!!formData[field.name]}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                      />
                    </div>
                  )}

                  {field.type === 'select' && field.options && (
                    <select
                      className="form-select"
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              {/* Action Buttons */}
              {isLastRow ? (
                <button
                  className="btn btn-success w-100 mt-4"
                  onClick={handleSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Submit Annotation
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="d-flex gap-2 mt-4">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                    >
                      <i className="bi bi-chevron-left me-1"></i>
                      Previous
                    </button>

                    <button
                      className="btn btn-primary flex-grow-1"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-1"></i>
                          Save
                        </>
                      )}
                    </button>

                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleNext}
                      disabled={currentIndex === rows.length - 1}
                    >
                      Next
                      <i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </div>

                  {/* Skip Button */}
                  <button
                    className="btn btn-outline-warning w-100 mt-2"
                    onClick={handleNext}
                    disabled={currentIndex === rows.length - 1}
                  >
                    Skip
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Navigation Helper */}
          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <h6 className="text-muted small mb-2">Quick Navigation</h6>
              <div className="input-group input-group-sm">
                <span className="input-group-text">Go to row:</span>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={rows.length}
                  value={currentIndex + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) - 1;
                    if (val >= 0 && val < rows.length) {
                      setCurrentIndex(val);
                    }
                  }}
                />
                <span className="input-group-text">/ {rows.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
