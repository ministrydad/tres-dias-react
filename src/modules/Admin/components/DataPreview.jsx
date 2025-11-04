// src/modules/Admin/components/DataPreview.jsx
import { useState, useMemo } from 'react';

export default function DataPreview({ uploadedData, mappedColumns, selectedGender, onNext, onBack, onCancel }) {
  const [dryRun, setDryRun] = useState(true); // Default to dry run for safety

  // Filter mapped columns only (exclude skipped columns)
  const activeMappings = useMemo(() => {
    return Object.entries(mappedColumns).filter(([source, target]) => target !== null);
  }, [mappedColumns]);

  // Build preview rows using mapped columns
  const previewRows = useMemo(() => {
    if (!uploadedData?.rows) return [];
    
    // Take first 10 rows for preview
    return uploadedData.rows.slice(0, 10).map(row => {
      const mappedRow = {};
      
      // Map each source column to target column
      activeMappings.forEach(([sourceColumn, targetColumn]) => {
        mappedRow[targetColumn] = row[sourceColumn] || '';
      });
      
      return mappedRow;
    });
  }, [uploadedData, activeMappings]);

  // Get columns to display (target columns only)
  const displayColumns = useMemo(() => {
    return activeMappings.map(([source, target]) => target);
  }, [activeMappings]);

  // Validation warnings
  const warnings = useMemo(() => {
    const warningList = [];
    
    if (!uploadedData?.rows || uploadedData.rows.length === 0) {
      warningList.push({ type: 'error', message: 'No data rows found in file' });
      return warningList;
    }

    // Check for required fields
    const hasFirstOrLast = displayColumns.includes('First') || displayColumns.includes('Last');
    if (!hasFirstOrLast) {
      warningList.push({ 
        type: 'error', 
        message: 'Missing required field: Must map either "First" or "Last" name column' 
      });
    }

    // Count missing data
    let missingEmailCount = 0;
    let missingPhoneCount = 0;
    let missingChurchCount = 0;
    let missingPescadoreKeyCount = 0;

    uploadedData.rows.forEach(row => {
      activeMappings.forEach(([sourceColumn, targetColumn]) => {
        const value = row[sourceColumn];
        if (!value || value === '' || value === null) {
          if (targetColumn === 'Email') missingEmailCount++;
          if (targetColumn === 'Phone1') missingPhoneCount++;
          if (targetColumn === 'Church') missingChurchCount++;
          if (targetColumn === 'PescadoreKey') missingPescadoreKeyCount++;
        }
      });
    });

    if (missingEmailCount > 0) {
      warningList.push({ 
        type: 'warning', 
        message: `${missingEmailCount} rows missing Email (recommended but optional)` 
      });
    }

    if (missingPhoneCount > 0) {
      warningList.push({ 
        type: 'warning', 
        message: `${missingPhoneCount} rows missing Phone1 (recommended but optional)` 
      });
    }

    if (missingChurchCount > 0) {
      warningList.push({ 
        type: 'warning', 
        message: `${missingChurchCount} rows missing Church (recommended but optional)` 
      });
    }

    if (missingPescadoreKeyCount > 0) {
      warningList.push({ 
        type: 'info', 
        message: `${missingPescadoreKeyCount} rows missing PescadoreKey (will auto-generate sequential IDs)` 
      });
    }

    return warningList;
  }, [uploadedData, activeMappings, displayColumns]);

  // Block proceed if there are errors
  const hasErrors = warnings.some(w => w.type === 'error');

  const handleNext = () => {
    if (hasErrors) {
      window.showMainStatus('Please fix errors before proceeding', true);
      return;
    }
    onNext(dryRun);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>
        Step 3: Preview Data
      </h2>

      {/* Dry Run Toggle */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--bg)',
        borderRadius: '8px',
        border: `2px solid ${dryRun ? 'var(--accentC)' : 'var(--accentA)'}`,
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <input
          type="checkbox"
          id="dryRunToggle"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          style={{
            width: '20px',
            height: '20px',
            cursor: 'pointer'
          }}
        />
        <label 
          htmlFor="dryRunToggle" 
          style={{ 
            cursor: 'pointer', 
            fontWeight: 600,
            flex: 1,
            userSelect: 'none'
          }}
        >
          <span style={{ fontSize: '1rem' }}>
            {dryRun ? '🧪 Dry Run Mode' : '⚡ Live Import Mode'}
          </span>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
            {dryRun 
              ? 'Preview only - no data will be imported to the database'
              : 'WARNING: Data will be imported to your live database!'
            }
          </div>
        </label>
      </div>

      {/* Summary Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
            Total Rows
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>
            {uploadedData?.rows?.length || 0}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
            Mapped Columns
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>
            {activeMappings.length}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
            Target Directory
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', textTransform: 'capitalize' }}>
            {selectedGender}
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>
            Warnings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: warnings.length > 0 ? 'var(--accentC)' : 'var(--accentA)' }}>
            {warnings.length}
          </div>
        </div>
      </div>

      {/* Validation Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {warnings.map((warning, index) => (
            <div
              key={index}
              style={{
                padding: '12px 16px',
                backgroundColor: 
                  warning.type === 'error' ? 'rgba(220, 53, 69, 0.1)' :
                  warning.type === 'warning' ? 'rgba(255, 193, 7, 0.1)' :
                  'rgba(0, 163, 255, 0.1)',
                border: `1px solid ${
                  warning.type === 'error' ? 'var(--accentD)' :
                  warning.type === 'warning' ? 'var(--accentC)' :
                  'var(--accentB)'
                }`,
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>
                {warning.type === 'error' ? '❌' : warning.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span style={{ 
                fontSize: '0.9rem', 
                color: 'var(--ink)',
                flex: 1
              }}>
                {warning.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Preview Table */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
          Preview: First 10 Rows
        </h3>
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '400px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg)', position: 'sticky', top: 0 }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem'
                }}>
                  #
                </th>
                {displayColumns.map(col => (
                  <th
                    key={col}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--muted)',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem'
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    backgroundColor: rowIndex % 2 === 0 ? '#fff' : 'var(--bg)'
                  }}
                >
                  <td style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontWeight: 600
                  }}>
                    {rowIndex + 1}
                  </td>
                  {displayColumns.map(col => (
                    <td
                      key={col}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {row[col] || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>(empty)</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--muted)', 
          marginTop: '8px',
          textAlign: 'center'
        }}>
          Showing first 10 of {uploadedData?.rows?.length || 0} total rows
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button 
          className={`btn ${hasErrors ? '' : 'btn-primary'}`}
          onClick={handleNext}
          disabled={hasErrors}
          style={{
            opacity: hasErrors ? 0.5 : 1,
            cursor: hasErrors ? 'not-allowed' : 'pointer'
          }}
        >
          {dryRun ? 'Next: Preview Import →' : 'Next: Import Data →'}
        </button>
      </div>
    </div>
  );
}