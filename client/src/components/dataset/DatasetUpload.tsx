import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadDatasetMutation, useFetchDatasetsQuery } from '../../store';

interface UploadFormData {
    title: string;
    description: string;
    uploadType: 'csv' | 'json';
    file: File | null;
}

export default function DatasetUpload() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<UploadFormData>({
        title: '',
        description: '',
        uploadType: 'csv',
        file: null
    });

    const [uploadDataset, { isLoading }] = useUploadDatasetMutation();
    const { data: datasets } = useFetchDatasetsQuery();

    const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const kind = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
            setFormData(f => ({ ...f, file, uploadType: kind as 'csv' | 'json' }));
        }
    };

    /**
     * 
     * @param FormEvent 
     * - TypeScript type from React
     * - Purpose: Types the even object when a form is submitted, gives access to e.preventDefault();
     * 
     * @param FormData
     * - Type: Built-in browser API (Web API)
     * - Purpose: Constructs key/value pairs to send form data, especially files
     */

    const submit = async (e: FormEvent) => {

        e.preventDefault();
        if (!formData.file) return;
        const fd = new FormData();
        fd.append('file', formData.file);
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('uploadType', formData.uploadType);
        try {
            await uploadDataset(fd).unwrap();
            setFormData({ title: '', description: '', uploadType: 'csv', file: null });
            navigate('/');

        } catch (err) {
            console.error("Error uploading file")
        }
    };


    return (
        <div style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
            <form onSubmit={submit} style={{ display: 'grid', gap: '.75rem' }}>
                <input
                    placeholder="Title"
                    value={formData.title}
                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                    required
                />
                <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                />
                <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFile}
                    required
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Uploading…' : 'Upload'}
                </button>
            </form>

            <div>
                <h4>Datasets</h4>
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                    {datasets?.map(d => (
                        <li key={d._id}>{d.title} ({d.uploadType})</li>
                    )) || null}
                </ul>
            </div>
        </div>
    );
}