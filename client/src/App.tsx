import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Root from './components/pages/Root';
import Gallery from './components/pages/Gallery';
import DatasetDashboard from './components/pages/DatasetDashboard';
import NewDataset from './components/pages/NewDataset';
import Annotate from './components/pages/Annotate';
import RubricManagement from './components/pages/RubricManagement';

import 'bootstrap/dist/css/bootstrap.min.css';
import './custom-colors.css';


function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Root />}>
                    <Route index element={<Gallery />} />
                    <Route path="dataset/:datasetId" element={<DatasetDashboard />} />
                    <Route path="upload_dataset" element={<NewDataset />} />
                    <Route path="rubrics/:datasetId" element={<RubricManagement />} />
                    <Route path="annotate/:datasetId/:rubricId" element={<Annotate />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;