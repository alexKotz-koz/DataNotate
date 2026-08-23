import type { RubricField } from '../../store';

interface FieldBuilderProps {
  fields: RubricField[];
  onChange: (fields: RubricField[]) => void;
  addLabel?: string;
  helpText?: string;
  emptyText?: string;
}

// Reusable "add/edit/remove custom annotation fields" builder, shared by the
// standard task's "Additional Annotation Fields" and the preference test's
// stage-2/stage-3 survey field sections.
function FieldBuilder({ fields, onChange, addLabel = 'Add Custom Field', helpText, emptyText = 'No fields yet.' }: FieldBuilderProps) {
  const handleAddField = () => {
    onChange([
      ...fields,
      { name: '', label: '', type: 'string', required: false, instructions: '', isDatasetColumn: false }
    ]);
  };

  const handleRemoveField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof RubricField, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        {helpText && <p className="text-muted small mb-0">{helpText}</p>}
        <button type="button" className="btn btn-sm btn-outline-primary ms-auto" onClick={handleAddField}>
          <i className="bi bi-plus-lg me-1"></i>{addLabel}
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={index} className="card mb-2">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Field name (e.g., quality_score)"
                  value={field.name}
                  onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Label (e.g., Quality Score)"
                  value={field.label}
                  onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                />
              </div>
              <div className="col-12">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Instructions (e.g., Only use 'vague' or 'clear')"
                  value={field.instructions || ''}
                  onChange={(e) => handleFieldChange(index, 'instructions', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={field.type}
                  onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes/No</option>
                  <option value="select">Dropdown</option>
                </select>
              </div>
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={field.required || false}
                    onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                    id={`field-required-${index}-${field.name}`}
                  />
                  <label className="form-check-label" htmlFor={`field-required-${index}-${field.name}`}>
                    Required
                  </label>
                </div>
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger w-100"
                  onClick={() => handleRemoveField(index)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
              {field.type === 'select' && (
                <div className="col-12">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Options (comma-separated, e.g., Good, Fair, Poor)"
                    value={field.options?.join(', ') || ''}
                    onChange={(e) => handleFieldChange(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {fields.length === 0 && (
        <p className="text-muted text-center py-3">{emptyText}</p>
      )}
    </div>
  );
}

export default FieldBuilder;
