import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFetchDatasetsQuery, useFetchDatasetRowsQuery, useGetRubricByDatasetQuery } from '../../store';

export default function DatasetDashboard() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const { data: rows, isLoading: rowsLoading } = useFetchDatasetRowsQuery(datasetId || '', { skip: !datasetId });
  const { data: rubric } = useGetRubricByDatasetQuery(datasetId || '', { skip: !datasetId });
  console.log(datasets)
  const dataset = datasets?.find(d => d._id === datasetId);

  if (!dataset) {
    return (
      <div className="alert alert-warning">
        <h4>Dataset not found</h4>
        <Link to="/" className="btn btn-primary mt-2">Back to Gallery</Link>
      </div>
    );
  }

  const hasRubric = !!rubric;
  const rowCount = rows?.length || 0;
  const columnCount = dataset.columns?.length || 0;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-link p-0 mb-2 text-decoration-none">
            ← Back
          </button>
          <h2 className="mb-1">{dataset.title}</h2>
          <p className="text-muted mb-0">{dataset.description || 'No description'}</p>
        </div>
        <div className="d-flex gap-2">
          <Link to={`/configure`} className="btn btn-outline-primary">
            {hasRubric ? 'Edit Rubric' : 'Configure Rubric'}
          </Link>
          {hasRubric && (
            <Link to={`/annotate/${datasetId}`} className="btn btn-primary">
              Start Annotating
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 rounded p-3">
                  <i className="bi bi-files text-primary fs-4"></i>
                </div>
                <div className="ms-3">
                  <h3 className="mb-0">{rowCount}</h3>
                  <small className="text-muted">Total Rows</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded p-3">
                  <i className="bi bi-columns text-success fs-4"></i>
                </div>
                <div className="ms-3">
                  <h3 className="mb-0">{columnCount}</h3>
                  <small className="text-muted">Columns</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded p-3">
                  <i className="bi bi-clipboard-check text-warning fs-4"></i>
                </div>
                <div className="ms-3">
                  <h3 className="mb-0">0</h3>
                  <small className="text-muted">Annotated</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className={`${hasRubric ? 'bg-info' : 'bg-danger'} bg-opacity-10 rounded p-3`}>
                  <i className={`bi bi-${hasRubric ? 'check-circle' : 'x-circle'} ${hasRubric ? 'text-info' : 'text-danger'} fs-4`}></i>
                </div>
                <div className="ms-3">
                  <h3 className="mb-0">{hasRubric ? 'Yes' : 'No'}</h3>
                  <small className="text-muted">Has Rubric</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="row g-4">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Dataset Preview</h5>
            </div>
            <div className="card-body">
              {rowsLoading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : rows && rows.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        {dataset.columns?.slice(0, 5).map(col => (
                          <th key={col}>{col}</th>
                        ))}
                        {dataset.columns && dataset.columns.length > 5 && <th>...</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, idx) => (
                        <tr key={row._id}>
                          {dataset.columns?.slice(0, 5).map(col => (
                            <td key={col} className="text-truncate" style={{ maxWidth: 200 }}>
                              {String(row.data[col] || '—')}
                            </td>
                          ))}
                          {dataset.columns && dataset.columns.length > 5 && <td>...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 5 && (
                    <div className="text-center text-muted small">
                      Showing 5 of {rows.length} rows
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted text-center p-4">No data available</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-header bg-white">
              <h5 className="mb-0">Dataset Details</h5>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-sm-5 text-muted small">Type</dt>
                <dd className="col-sm-7">
                  <span className="badge bg-secondary">{dataset.uploadType?.toUpperCase()}</span>
                </dd>

                <dt className="col-sm-5 text-muted small">Created</dt>
                <dd className="col-sm-7 small">
                  {new Date(dataset._dateCreated || '').toLocaleString()}
                </dd>

                <dt className="col-sm-5 text-muted small">Columns</dt>
                <dd className="col-sm-7">{columnCount}</dd>

                <dt className="col-sm-5 text-muted small">Rows</dt>
                <dd className="col-sm-7">{rowCount}</dd>
              </dl>
            </div>
          </div>

          {hasRubric && (
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">Rubric Info</h5>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-sm-6 text-muted small">Display Cols</dt>
                  <dd className="col-sm-6">{rubric.displayColumns?.length || 0}</dd>

                  <dt className="col-sm-6 text-muted small">Rubric Fields</dt>
                  <dd className="col-sm-6">{rubric.fields?.length || 0}</dd>
                </dl>
                <div className="mt-3">
                  <small className="text-muted d-block mb-1">Fields:</small>
                  <div className="d-flex flex-wrap gap-1">
                    {rubric.fields?.map(f => (
                      <span key={f.name} className="badge bg-info">{f.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}