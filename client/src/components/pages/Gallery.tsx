import { Link } from 'react-router-dom';
import { useFetchDatasetsQuery } from '../../store';

// Simple function to generate consistent avatar color based on title
const getAvatarColor = (title: string) => {
  const colors = ['primary', 'success', 'danger', 'warning', 'info', 'purple', 'pink', 'teal'];
  const index = title.charCodeAt(0) % colors.length;
  return colors[index];
};

// Get initials from title
const getInitials = (title: string) => {
  return title
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Gallery() {
  const { data: datasets, isLoading, error } = useFetchDatasetsQuery(undefined);

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Failed to load datasets
      </div>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <div className="text-center p-5">
        <h3 className="text-muted">No datasets yet</h3>
        <p className="text-muted">Upload your first dataset to get started</p>
        <Link to="/upload" className="btn btn-primary">
          Upload Dataset
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Datasets</h2>
        <Link to="/upload" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          New Dataset
        </Link>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {datasets.map((dataset) => {
          const avatarColor = getAvatarColor(dataset.title);
          const initials = getInitials(dataset.title);
          
          return (
            <div key={dataset._id} className="col">
              <Link 
                to={`/dataset/${dataset._id}`} 
                className="text-decoration-none"
              >
                <div className="card h-100 shadow-sm nav-link-hover border">
                  <div className="card-body">
                    <div className="d-flex align-items-start mb-3">
                      {/* Avatar */}
                      <div 
                        className={`bg-${avatarColor} text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}
                        style={{ width: 56, height: 56, fontSize: '1.25rem', fontWeight: 600 }}
                      >
                        {initials}
                      </div>
                      
                      <div className="ms-3 flex-grow-1">
                        <h5 className="card-title mb-1 text-dark">{dataset.title}</h5>
                        <small className="text-muted">
                          {dataset.uploadType?.toUpperCase()} • {new Date(dataset._dateCreated || '').toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    <p className="card-text text-muted small mb-3" style={{ minHeight: '3rem' }}>
                      {dataset.description || 'No description provided'}
                    </p>

                    {/* Statistics */}
                    <div className="d-flex justify-content-between pt-3 border-top">
                      <div className="text-center">
                        <div className="fw-bold text-primary">{dataset.columns?.length || 0}</div>
                        <small className="text-muted">Columns</small>
                      </div>
                      <div className="text-center">
                        <div className="fw-bold text-success">—</div>
                        <small className="text-muted">Rows</small>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}