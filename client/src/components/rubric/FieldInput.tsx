import type { RubricField } from '../../store';

interface FieldInputProps {
  field: RubricField;
  value: any;
  onChange: (value: any) => void;
}

// Renders a single annotation control for a RubricField, matching its `type`.
// Shared by the standard annotation form and the Preference Test survey stages.
function FieldInput({ field, value, onChange }: FieldInputProps) {
  return (
    <div className="mb-3">
      <label className="form-label">
        {field.label}
        {field.required && <span className="text-danger">*</span>}
      </label>
      {field.instructions && (
        <div className="text-muted small mb-2">{field.instructions}</div>
      )}

      {field.type === 'string' && (
        <textarea
          className="form-control"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          rows={3}
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          className="form-control"
          value={value ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          required={field.required}
          step="any"
        />
      )}

      {field.type === 'boolean' && (
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      )}

      {field.type === 'select' && field.options && (
        <select
          className="form-select"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select...</option>
          {field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default FieldInput;
