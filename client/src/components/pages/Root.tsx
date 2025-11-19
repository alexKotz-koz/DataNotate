import { Outlet, NavLink } from 'react-router-dom';

export default function Root() {
    return (
        <div className="d-flex min-vh-100">
            {/* Left Sidebar */}
            <nav className="bg-light border-end p-3" style={{ width: 240 }}>
                <h5 className="mb-4">DataNotate</h5>
                <ul className="list-unstyled d-grid gap-2">
                    <li>
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${
                                    isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2 border-sm shadow-sm'
                                }`
                            }
                        >
                            Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/upload"
                            className={({ isActive }) =>
                                `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${
                                    isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'
                                }`
                            }
                        >
                            Upload Dataset
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/configure"
                            className={({ isActive }) =>
                                `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${
                                    isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'
                                }`
                            }
                        >
                            Configure Rubric
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/annotate"
                            className={({ isActive }) =>
                                `nav-link-hover d-block px-3 py-2 text-decoration-none rounded border ${
                                    isActive ? 'bg-primary text-white border-primary' : 'text-dark border-gray2'
                                }`
                            }
                        >
                            Annotate
                        </NavLink>
                    </li>
                </ul>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow-1 p-4">
                <Outlet />
            </main>
        </div>
    );
}