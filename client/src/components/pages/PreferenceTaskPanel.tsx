import { useState } from 'react';
import type { DatasetRow, Rubric } from '../../store';
import FieldInput from '../rubric/FieldInput';

interface PreferenceTaskPanelProps {
  rubric: Rubric;
  currentRow: DatasetRow;
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  initialPreferenceChoice: string | null;
  onChoosePreference: (column: string) => Promise<void>;
  isSaving: boolean;
  isLastRow: boolean;
  onSaveAndNext: () => Promise<void> | void;
  onSubmit: () => Promise<void> | void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  seed: string;
}

// FNV-1a string hash -> well-distributed 32-bit integer.
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Deterministic pseudo-random ordering so A/B position is stable across reloads
// for a given (row, annotator) pair, but varies ~50/50 from row to row / annotator to
// annotator (mitigates position bias). A naive charCode-sum + Math.sin seed skews
// heavily toward "unswapped" for Mongo ObjectId-style seeds, so we scramble the hash
// with a mulberry32-style mix before thresholding.
function seededOrder(seed: string, columns: [string, string]): [string, string] {
  let t = hashString(seed) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return rand < 0.5 ? columns : [columns[1], columns[0]];
}

function PreferenceTaskPanel({
  rubric,
  currentRow,
  formData,
  onFieldChange,
  initialPreferenceChoice,
  onChoosePreference,
  isSaving,
  isLastRow,
  onSaveAndNext,
  onSubmit,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  seed,
}: PreferenceTaskPanelProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(initialPreferenceChoice ? 2 : 1);
  const [preferenceChoice, setPreferenceChoice] = useState<string | null>(initialPreferenceChoice);
  const [choosing, setChoosing] = useState(false);

  const [colA, colB] = rubric.preferenceColumns || [];
  const [orderedA, orderedB] = seededOrder(seed, [colA, colB]);

  const stage2Fields = rubric.stage2Fields || [];
  const secondaryFields = rubric.secondaryFields || [];
  const secondaryDisplayColumns = rubric.secondaryDisplayColumns || [];
  const hasStage3 = secondaryFields.length > 0 || secondaryDisplayColumns.length > 0;
  const totalStages = hasStage3 ? 3 : 2;

  const handleChoose = async (column: string) => {
    if (column === preferenceChoice) return;
    setChoosing(true);
    try {
      await onChoosePreference(column);
      setPreferenceChoice(column);
      setStage(prev => (prev === 1 ? 2 : prev));
    } catch (err) {
      console.error('Failed to save preference choice:', err);
      alert('Failed to save your choice. Please try again.');
    } finally {
      setChoosing(false);
    }
  };

  const requiredStage2Missing = stage2Fields.some(
    f => f.required && (formData[f.name] === undefined || formData[f.name] === '')
  );
  const requiredSecondaryMissing = secondaryFields.some(
    f => f.required && (formData[f.name] === undefined || formData[f.name] === '')
  );

  const renderResponseBox = (column: string, position: 'A' | 'B', revealed: boolean) => {
    const isChosen = preferenceChoice === column;
    const changeable = stage === 2;
    return (
      <div
        key={column}
        role={changeable ? 'button' : undefined}
        tabIndex={changeable ? 0 : undefined}
        onClick={changeable ? () => handleChoose(column) : undefined}
        onKeyDown={changeable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoose(column); } } : undefined}
        className={`p-3 rounded border ${isChosen ? 'border-success border-2 bg-success-subtle' : 'border-secondary-subtle bg-light'} ${changeable ? 'preference-box-changeable' : ''}`}
        style={changeable ? { cursor: choosing ? 'wait' : 'pointer' } : undefined}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-bold text-primary">{revealed ? column : `Response ${position}`}</span>
          {isChosen && <span className="badge bg-success">Your choice</span>}
        </div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{String(currentRow.data[column] ?? '—')}</div>
      </div>
    );
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Preference Test</h5>
            <span className="badge bg-secondary">Stage {stage} of {totalStages}</span>
          </div>
          <div className="card-body">
            {rubric.displayColumns.length > 0 && (
              <div className="mb-4">
                {rubric.displayColumns.map(col => (
                  <div key={col} className="mb-3">
                    <label className="form-label fw-bold text-primary">{col}</label>
                    <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
                      {String(currentRow.data[col] ?? '—')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="row g-3 mb-4">
              <div className="col-md-6">{renderResponseBox(orderedA, 'A', hasStage3 && stage === 3)}</div>
              <div className="col-md-6">{renderResponseBox(orderedB, 'B', hasStage3 && stage === 3)}</div>
            </div>

            {stage === 1 && (
              <div>
                <h6>{rubric.preferenceQuestion}</h6>
                <div className="d-flex gap-2 mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary flex-grow-1"
                    disabled={choosing}
                    onClick={() => handleChoose(orderedA)}
                  >
                    Prefer Response A
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary flex-grow-1"
                    disabled={choosing}
                    onClick={() => handleChoose(orderedB)}
                  >
                    Prefer Response B
                  </button>
                </div>
              </div>
            )}

            {stage === 2 && (
              <div>
                <p className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  You can still click the other response above to change your preference.
                </p>
                {stage2Fields.map(field => (
                  <FieldInput
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    onChange={(v) => onFieldChange(field.name, v)}
                  />
                ))}
                {hasStage3 ? (
                  <button
                    type="button"
                    className="btn btn-primary mt-2"
                    disabled={requiredStage2Missing}
                    onClick={() => setStage(3)}
                  >
                    Continue <i className="bi bi-chevron-right ms-1"></i>
                  </button>
                ) : (
                  <div className="d-flex gap-2 mt-2">
                    {isLastRow ? (
                      <button
                        type="button"
                        className="btn btn-success flex-grow-1"
                        disabled={isSaving || requiredStage2Missing}
                        onClick={onSubmit}
                      >
                        {isSaving ? 'Saving...' : (<><i className="bi bi-check-circle me-2"></i>Submit Annotation</>)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary flex-grow-1"
                        disabled={isSaving || requiredStage2Missing}
                        onClick={onSaveAndNext}
                      >
                        {isSaving ? 'Saving...' : (<><i className="bi bi-check-lg me-1"></i>Save & Next</>)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {stage === 3 && hasStage3 && (
              <div>
                {secondaryDisplayColumns.length > 0 && (
                  <div className="mb-4">
                    {secondaryDisplayColumns.map(col => (
                      <div key={col} className="mb-3">
                        <label className="form-label fw-bold text-primary">{col}</label>
                        <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
                          {String(currentRow.data[col] ?? '—')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {secondaryFields.map(field => (
                  <FieldInput
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    onChange={(v) => onFieldChange(field.name, v)}
                  />
                ))}

                <div className="d-flex gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setStage(2)}>
                    <i className="bi bi-chevron-left me-1"></i>Back
                  </button>
                  {isLastRow ? (
                    <button
                      type="button"
                      className="btn btn-success flex-grow-1"
                      disabled={isSaving || requiredSecondaryMissing}
                      onClick={onSubmit}
                    >
                      {isSaving ? 'Saving...' : (<><i className="bi bi-check-circle me-2"></i>Submit Annotation</>)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary flex-grow-1"
                      disabled={isSaving || requiredSecondaryMissing}
                      onClick={onSaveAndNext}
                    >
                      {isSaving ? 'Saving...' : (<><i className="bi bi-check-lg me-1"></i>Save & Next</>)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h6 className="text-muted small mb-2">Row Navigation</h6>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={onPrevious} disabled={!canGoPrevious}>
                <i className="bi bi-chevron-left me-1"></i>Previous
              </button>
              <button className="btn btn-outline-secondary" onClick={onNext} disabled={!canGoNext}>
                Next<i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreferenceTaskPanel;
