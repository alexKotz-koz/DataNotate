import { useNavigate } from 'react-router-dom';
import DatasetUpload from '../dataset/DatasetUpload';

export default function NewDataset() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-link p-0 mb-2 text-decoration-none">
            ← Back
          </button>
          <h2 className="mb-1">Upload New Dataset</h2>
          <p className="text-muted mb-0">Upload a CSV or JSON file to create a new dataset</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Dataset Information</h5>
            </div>
            <div className="card-body">
              <DatasetUpload />
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Upload Guidelines</h5>
            </div>
            <div className="card-body">
              <h6 className="text-primary">Supported Formats</h6>
              <ul className="small mb-3">
                <li>CSV (.csv)</li>
                <li>JSON (.json)</li>
              </ul>

              <h6 className="text-primary">Requirements</h6>
              <ul className="small mb-3">
                <li>File must contain headers/keys</li>
                <li>JSON must be an array of objects</li>
                <li>CSV should have consistent columns</li>
              </ul>

              <div className="alert alert-info small mb-0">
                <i className="bi bi-info-circle me-2"></i>
                After uploading, you'll be redirected to configure your annotation rubric.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
