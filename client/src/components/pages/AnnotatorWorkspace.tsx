import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useFetchDatasetsQuery,
  useGetRubricsByDatasetQuery,
  useFetchAnnotationsByDatasetQuery,
  useCreateAnnotationSessionMutation
} from '../../store';

export default function AnnotatorWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const datasetParam = searchParams.get('dataset');
  const { data: datasets } = useFetchDatasetsQuery(undefined);
  const [datasetId, setDatasetId] = useState('');
  const [rubricId, setRubricId] = useState('');
  const [sessionLabel, setSessionLabel] = useState('');
  const [createSession, { isLoading: creatingSession }] = useCreateAnnotationSessionMutation();

  useEffect(() => {
    if (datasetParam) {
      setDatasetId(datasetParam);
    } else if (!datasetId && datasets && datasets.length > 0) {
      setDatasetId(datasets[0]._id);
    }
  }, [datasetParam, datasets, datasetId]);

  const { data: rubrics } = useGetRubricsByDatasetQuery(datasetId, { skip: !datasetId });

  useEffect(() => {
    if (rubrics && rubrics.length > 0 && !rubricId) {
      setRubricId(rubrics[0]._id);
    }
    if (rubricId && rubrics && !rubrics.find(r => r._id === rubricId)) {
      setRubricId(rubrics[0]?._id || '');
    }
  }, [rubrics, rubricId]);

  const annotationsQuery = useFetchAnnotationsByDatasetQuery(
    { datasetId, rubricId: rubricId || undefined, mine: true },
    { skip: !datasetId }
  );

  const sessions = annotationsQuery.data || [];

  const selectedDataset = useMemo(() => datasets?.find(d => d._id === datasetId), [datasets, datasetId]);

  const handleStartSession = async () => {
    if (!datasetId || !rubricId) return;
    const payload = { datasetId, rubricId, sessionLabel: sessionLabel.trim() || undefined };
    const result = await createSession(payload).unwrap();
    setSessionLabel('');
    navigate(`/annotate/${datasetId}/${rubricId}?session=${result.annotation._id}`);
  };

  const handleResume = (annotationId: string) => {
    if (!datasetId || !rubricId) return;
    navigate(`/annotate/${datasetId}/${rubricId}?session=${annotationId}`);
  };

  if (!datasets || datasets.length === 0) {
    return (
      <div className="alert alert-info">
        No datasets available yet. Please contact a researcher to add datasets and rubrics.
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Annotation Workspace</h2>
          <p className="text-muted mb-0">Start or resume annotation sessions</p>
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
              {selectedDataset && (
                <small className="text-muted">{selectedDataset.rowCount ?? 0} rows available</small>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label">Rubric</label>
              <select className="form-select" value={rubricId} onChange={(e) => setRubricId(e.target.value)} disabled={!rubrics?.length}>
                {rubrics?.map(rubric => (
                  <option key={rubric._id} value={rubric._id}>{rubric.title}</option>
                ))}
              </select>
              {rubrics?.length === 0 && <small className="text-danger">This dataset has no rubrics yet.</small>}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Start a new session</h5>
              <p className="text-muted small">Each session represents one complete pass across the rubric.</p>
              <div className="mb-3">
                <label className="form-label">Session Label (optional)</label>
                <input
                  className="form-control"
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                  placeholder="e.g., QA Batch #1"
                />
              </div>
              <button
                className="btn btn-primary w-100"
                disabled={!datasetId || !rubricId || creatingSession}
                onClick={handleStartSession}
              >
                {creatingSession ? 'Creating...' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="mb-3">Your Sessions</h5>
              {annotationsQuery.isFetching ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-muted">No sessions yet. Start one to begin annotating.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {sessions.map(session => (
                    <div key={session._id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{session.sessionLabel || `Session ${session.sessionNumber || ''}`}</div>
                        <small className="text-muted">
                          {session.rows.length} / {session.targetRowCount ?? 25} rows • {session.completed ? 'Completed' : 'In Progress'}
                        </small>
                      </div>
                      <button className="btn btn-outline-primary btn-sm" onClick={() => handleResume(session._id)}>
                        {session.completed ? 'Review' : 'Resume'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
