/**
 * @deprecated This component is deprecated. Use RubricManagement component instead.
 * This is kept only for backwards compatibility.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DatasetConfigure() {
    const navigate = useNavigate();

    // Redirect to gallery - this component is deprecated
    useEffect(() => {
        navigate('/');
    }, [navigate]);

    return (
        <div className="container mt-4">
            <div className="alert alert-info">
                <h4>This page has been moved</h4>
                <p>Rubric configuration is now done through the Dataset Dashboard. Redirecting...</p>
            </div>
        </div>
    );
}