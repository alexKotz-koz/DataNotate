import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Root from './components/pages/Root';
import Gallery from './components/pages/Gallery';
import DatasetDashboard from './components/pages/DatasetDashboard';
import NewDataset from './components/pages/NewDataset';
import Annotate from './components/pages/Annotate';
import RubricManagement from './components/pages/RubricManagement';
import AnnotationManagement from './components/pages/AnnotationManagement';
import AnnotatorWorkspace from './components/pages/AnnotatorWorkspace';
import Login from './components/pages/Login';
import Signup from './components/pages/Signup';
import RequireAuth from './components/auth/RequireAuth';

import 'bootstrap/dist/css/bootstrap.min.css';
import './custom-colors.css';


function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/" element={<Root />}>
                    <Route
                        index
                        element={(
                            <RequireAuth>
                                <Gallery />
                            </RequireAuth>
                        )}
                    />
                    <Route
                        path="dataset/:datasetId"
                        element={(
                            <RequireAuth allowedRoles={['researcher']}>
                                <DatasetDashboard />
                            </RequireAuth>
                        )}
                    />
                    <Route
                        path="upload_dataset"
                        element={(
                            <RequireAuth allowedRoles={['researcher']}>
                                <NewDataset />
                            </RequireAuth>
                        )}
                    />
                    <Route
                        path="rubrics/:datasetId"
                        element={(
                            <RequireAuth allowedRoles={['researcher']}>
                                <RubricManagement />
                            </RequireAuth>
                        )}
                    />
                    <Route
                        path="annotation-management"
                        element={(
                            <RequireAuth allowedRoles={['researcher']}>
                                <AnnotationManagement />
                            </RequireAuth>
                        )}
                    />
                    <Route
                        path="annotator"
                        element={(
                            <RequireAuth>
                                <AnnotatorWorkspace />
                            </RequireAuth>
                        )}
                    />
                    <Route
                        path="annotate/:datasetId/:rubricId"
                        element={(
                            <RequireAuth>
                                <Annotate />
                            </RequireAuth>
                        )}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;