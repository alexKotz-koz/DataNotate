import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../../hooks/useAuthUser';
import { useLogoutMutation } from '../../store';

export default function Root() {
    const navigate = useNavigate();
    const { user, isLoading } = useAuthUser();
    const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Outlet />;
    }

    const isResearcher = user.role === 'researcher' || user.role === 'admin';

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Failed to logout', err);
        }
    };

    return (
        <div className="d-flex min-vh-100">
            <nav className="bg-light border-end p-3" style={{ width: 260 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <NavLink to="/" className='text-decoration-none text-dark fw-semibold'>
                        DataNotate
                    </NavLink>
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout} disabled={isLoggingOut}>
                        {isLoggingOut ? '...' : 'Logout'}
                    </button>
                </div>
                <div className="mb-3">
                    <div className="fw-semibold">{user.firstName || user.username}</div>
                    <small className="text-muted text-uppercase">{user.role}</small>
                </div>
                <ul className="list-unstyled d-grid gap-2">
                    <li>
                        <NavLink
                            end
                            to="/"
                            className={({ isActive }) =>
                                `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'}`
                            }
                        >
                            Gallery
                        </NavLink>
                    </li>
                    {isResearcher && (
                        <li>
                            <NavLink
                                to="/upload_dataset"
                                className={({ isActive }) =>
                                    `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'}`
                                }
                            >
                                Upload Dataset
                            </NavLink>
                        </li>
                    )}
                    {isResearcher && (
                        <li>
                            <NavLink
                                to="/annotation-management"
                                className={({ isActive }) =>
                                    `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'}`
                                }
                            >
                                Annotation Management
                            </NavLink>
                        </li>
                    )}
                    <li>
                        <NavLink
                            to="/annotator"
                            className={({ isActive }) =>
                                `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'}`
                            }
                        >
                            Annotation Workspace
                        </NavLink>
                    </li>
                </ul>
            </nav>

            <main className="flex-grow-1 p-4">
                <Outlet />
            </main>
        </div>
    );
}