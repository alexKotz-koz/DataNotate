import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFetchDatasetsQuery, useFetchDatasetRowsQuery, useGetRubricsByDatasetQuery, useFetchAnnotationStatsQuery, type Rubric } from '../../store';

function RubricItem({ rubric, datasetId }: { rubric: Rubric; datasetId: string }) {
  const { data: stats } = useFetchAnnotationStatsQuery({ datasetId, rubricId: rubric._id });
  
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/annotation/download-bulk/${datasetId}?rubricId=${rubric._id}`);
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rubric.title.replace(/\s+/g, '_')}_annotations.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download annotations:', error);
      alert('Failed to download annotations');
    }
  };

  return (
    <div className="list-group-item">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 className="mb-1">{rubric.title}</h6>
          <small className="text-muted">
            {(stats?.annotationRecords || 0)} records ({stats?.completedRecords || 0} completed), avg {stats?.averageRowsAnnotated || 0} rows
          </small>
        </div>
      </div>
      <div className="d-flex gap-2 mt-2">
        <Link 
          to={`/annotate/${datasetId}/${rubric._id}`}
          className="btn btn-sm btn-primary"
        >
          <i className="bi bi-pencil-square me-1"></i>Annotate
        </Link>
        {(stats?.annotationRecords || 0) > 0 && (
          <button 
            onClick={handleDownload}
            className="btn btn-sm btn-outline-success"
          >
            <i className="bi bi-download me-1"></i>
            Download ({stats?.annotationRecords})
          </button>
        )}
      </div>
    </div>
  );
}

export default function DatasetDashboard() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const { data: rows, isLoading: rowsLoading } = useFetchDatasetRowsQuery(datasetId || '', { skip: !datasetId });
  const { data: rubrics, isLoading: rubricsLoading } = useGetRubricsByDatasetQuery(datasetId || '', { skip: !datasetId });
  const { data: aggregateStats } = useFetchAnnotationStatsQuery({ datasetId: datasetId || '' }, { skip: !datasetId });
  
  const dataset = datasets?.find(d => d._id === datasetId);

  if (!dataset) {
    return (
      <div className="alert alert-warning">
        <h4>Dataset not found</h4>
        <Link to="/" className="btn btn-primary mt-2">Back to Gallery</Link>
      </div>
    );
  }

  const hasRubrics = rubrics && rubrics.length > 0;
  const rowCount = rows?.length || 0;
  const columnCount = dataset.columns?.length || 0;
  const annotationRecordCount = aggregateStats?.annotationRecordCount || 0;
  const completedRecordCount = aggregateStats?.completedRecordCount || 0;
  const rubricCount = rubrics?.length || 0;

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
          <Link to={`/rubrics/${datasetId}`} className="btn btn-primary">
            <i className="bi bi-list-check me-2"></i>
            Manage Rubrics
          </Link>
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
                  <h3 className="mb-0">{annotationRecordCount}</h3>
                  <small className="text-muted">Annotation Records{completedRecordCount ? ` (${completedRecordCount} completed)` : ''}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className={`${hasRubrics ? 'bg-info' : 'bg-secondary'} bg-opacity-10 rounded p-3`}>
                  <i className={`bi bi-list-check ${hasRubrics ? 'text-info' : 'text-secondary'} fs-4`}></i>
                </div>
                <div className="ms-3">
                  <h3 className="mb-0">{rubricCount}</h3>
                  <small className="text-muted">Rubrics</small>
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
                      {rows.slice(0, 5).map((row) => (
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

          {hasRubrics && (
            <div className="card shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Rubrics & Annotations</h5>
                <Link to={`/rubrics/${datasetId}`} className="btn btn-sm btn-outline-primary">
                  Manage
                </Link>
              </div>
              <div className="card-body">
                {rubricsLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {rubrics?.map(rubric => (
                      <RubricItem key={rubric._id} rubric={rubric} datasetId={datasetId || ''} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}