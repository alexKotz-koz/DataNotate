import { useEffect, useState } from 'react';
import { useFetchDatasetsQuery, useGetRubricsByDatasetQuery, useFetchAnnotationsByDatasetQuery, useDeleteAnnotationMutation } from '../../store';

export default function AnnotationManagement() {
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const [datasetId, setDatasetId] = useState<string>('');
  const [rubricId, setRubricId] = useState<string>('');
  const [deleteAnnotation, { isLoading: isDeleting }] = useDeleteAnnotationMutation();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId && datasets && datasets.length > 0) {
      setDatasetId(datasets[0]._id);
    }
  }, [datasets, datasetId]);

  const { data: rubrics } = useGetRubricsByDatasetQuery(datasetId, { skip: !datasetId });

  useEffect(() => {
    if (rubricId && rubrics && !rubrics.find(r => r._id === rubricId)) {
      setRubricId('');
    }
  }, [rubrics, rubricId]);

  const annotationsQuery = useFetchAnnotationsByDatasetQuery(
    { datasetId, rubricId: rubricId || undefined },
    { skip: !datasetId }
  );

  const annotations = annotationsQuery.data || [];

  const handleDownload = async (annotationId: string) => {
    window.open(`/api/annotation/download/${annotationId}`, '_blank');
  };

  const handleDelete = async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId).unwrap();
      setDeleteConfirm(null);
      // Refetch handled automatically by RTK Query invalidation
    } catch (error) {
      console.error('Error deleting annotation:', error);
      alert('Failed to delete annotation session. Please try again.');
    }
  };

  if (!datasets || datasets.length === 0) {
    return (
      <div className="alert alert-info">
        No datasets available. Upload a dataset to manage annotations.
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Annotation Management</h2>
          <p className="text-muted mb-0">Review annotation sessions by dataset and rubric</p>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Dataset</label>
              <select className="form-select" value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
                {datasets?.map(dataset => (
                  <option key={dataset._id} value={dataset._id}>{dataset.title}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Rubric</label>
              <select className="form-select" value={rubricId} onChange={(e) => setRubricId(e.target.value)} disabled={!rubrics?.length}>
                <option value="">All Rubrics</option>
                {rubrics?.map(rubric => (
                  <option key={rubric._id} value={rubric._id}>{rubric.title}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Sessions</label>
              <div className="form-control bg-light">{annotations.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {annotationsQuery.isFetching ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : annotations.length === 0 ? (
            <div className="text-center py-4 text-muted">No annotation sessions found for this selection.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Rubric</th>
                    <th>Annotator</th>
                    <th>Rows</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {annotations.map(annotation => {
                    const annotator = typeof annotation._annotator === 'object' && annotation._annotator
                      ? `${annotation._annotator.firstName || ''} ${annotation._annotator.lastName || ''}`.trim() || annotation._annotator.username
                      : 'Unknown';
                    const rubricTitle = typeof annotation.rubric === 'object' && annotation.rubric
                      ? annotation.rubric.title
                      : rubrics?.find(r => r._id === annotation.rubric)?.title || '—';
                    return (
                      <tr key={annotation._id}>
                        <td>
                          <div className="fw-semibold">{annotation.sessionLabel || `Session ${annotation.sessionNumber || ''}`}</div>
                          <small className="text-muted">#{annotation.sessionNumber || '—'}</small>
                        </td>
                        <td>{rubricTitle}</td>
                        <td>{annotator}</td>
                        <td>{annotation.rows.length}</td>
                        <td>
                          {annotation.completed ? (
                            <span className="badge bg-success">Completed</span>
                          ) : (
                            <span className="badge bg-warning text-dark">In Progress</span>
                          )}
                        </td>
                        <td>{annotation._dateUpdated ? new Date(annotation._dateUpdated).toLocaleString() : '—'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-sm btn-outline-primary" 
                              onClick={() => handleDownload(annotation._id)}
                              title="Download annotation data"
                            >
                              <i className="bi bi-download me-1"></i>
                              Download
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              onClick={() => setDeleteConfirm(annotation._id)}
                              disabled={isDeleting}
                              title="Delete annotation session"
                            >
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setDeleteConfirm(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteConfirm(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-1">Are you sure you want to delete this annotation session?</p>
                <p className="text-muted mb-0 small">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      Delete Session
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
