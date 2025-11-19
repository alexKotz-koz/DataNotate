import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Root from './components/pages/Root';
import Gallery from './components/pages/Gallery';
import DatasetDashboard from './components/pages/DatasetDashboard';
// import Dashboard from './pages/Dashboard';
// import UploadPage from './pages/UploadPage';
// import ConfigurePage from './pages/ConfigurePage';
// import AnnotatePage from './pages/AnnotatePage';

import 'bootstrap/dist/css/bootstrap.min.css';
import './custom-colors.css';


function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Root />}>
                    <Route index element={<Gallery />} />
                    <Route path="/dataset/:datasetId" element={<DatasetDashboard />} />
                    {/* <Route path="upload" element={<UploadPage />} />
                    <Route path="configure" element={<ConfigurePage />} />
                    <Route path="annotate" element={<AnnotatePage />} /> */}
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;