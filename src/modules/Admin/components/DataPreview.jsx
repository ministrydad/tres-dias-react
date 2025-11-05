// src/modules/Admin/components/DataPreview.jsx
import { useState, useMemo } from 'react';

export default function DataPreview({ uploadedData, mappedColumns, selectedGender, onNext, onBack, onCancel }) {
  const [dryRun, setDryRun] = useState(true);
  const [editedData, setEditedData] = useState({}); // Track edited cells: { rowIndex: { columnName: newValue } }
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited: { rowIndex, column }
  const [rowsToShow, setRowsToShow] = useState(50); // Pagination: show 50 at a time
  const [showOnlyErrors, setShowOnlyErrors] = useState(false); // Filter: show only error rows

  // Filter mapped columns only (exclude skipped columns)
  const activeMappings = useMemo(() => {
    return Object.entries(mappedColumns).filter(([source, target]) => target !== null);
  }, [mappedColumns]);

  // Build preview rows using mapped columns with edits applied
  const previewRows = useMemo(() => {
    if (!uploadedData?.rows) return [];
    
    return uploadedData.rows.map((row, rowIndex) => {
      const mappedRow = { _originalIndex: rowIndex };
      
      activeMappings.forEach(([sourceColumn, targetColumn]) => {
        // Check if this cell has been edited
        const editedValue = editedData[rowIndex]?.[targetColumn];
        mappedRow[targetColumn] = editedValue !== undefined ? editedValue : (row[sourceColumn] || '');
      });
      
      return mappedRow;
    });
  }, [uploadedData, activeMappings, editedData]);

  // Get columns to display (target columns only)
  const displayColumns = useMemo(() => {
    return activeMappings.map(([source, target]) => target);
  }, [activeMappings]);

  // Check if column is required
  const isRequiredColumn = (column) => {
    return column === 'First' || column === 'Last';
  };

  // Validation warnings
  const warnings = useMemo(() => {
    const warningList = [];
    
    if (!uploadedData?.rows || uploadedData.rows.length === 0) {
      warningList.push({ type: 'error', message: 'No data rows found in file' });
      return warningList;
    }

    // Check for required columns being mapped
    const hasFirst = displayColumns.includes('First');
    const hasLast = displayColumns.includes('Last');
    
    if (!hasFirst || !hasLast) {
      warningList.push({ 
        type: 'error', 
        message: 'Missing required columns: Both "First" and "Last" name columns must be mapped' 
      });
      return warningList; // Can't proceed without columns mapped
    }

    // Check individual rows for missing required values
    let rowsWithErrors = [];
    previewRows.forEach((row, index) => {
      const firstName = row['First'];
      const lastName = row['Last'];
      
      if (!firstName || firstName.trim() === '' || !lastName || lastName.trim() === '') {
        rowsWithErrors.push({
          rowNumber: index + 1,
          missing: (!firstName || firstName.trim() === '') && (!lastName || lastName.trim() === '') 
            ? 'First and Last' 
            : (!firstName || firstName.trim() === '') 
              ? 'First' 
              : 'Last'
        });
      }
    });

    if (rowsWithErrors.length > 0) {
      warningList.push({ 
        type: 'error', 
        message: `${rowsWithErrors.length} rows missing required First or Last name (click cells below to edit)`,
        rowErrors: rowsWithErrors
      });
    }

    // Count missing optional data
    let missingEmailCount = 0;
    let missingPhoneCount = 0;
    let missingChurchCount = 0;
    let missingPescadoreKeyCount = 0;

    previewRows.forEach(row => {
      if (!row['Email'] || row['Email'].trim() === '') missingEmailCount++;
      if (!row['Phone1'] || row['Phone1'].trim() === '') missingPhoneCount++;
      if (!row['Church'] || row['Church'].trim() === '') missingChurchCount++;
      if (!row['PescadoreKey'] || row['PescadoreKey'].toString().trim() === '') missingPescadoreKeyCount++;
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
  }, [uploadedData, previewRows, displayColumns]);

  // Block proceed if there are errors
  const hasErrors = warnings.some(w => w.type === 'error');

  const handleNext = () => {
    if (hasErrors) {
      window.showMainStatus('Please fix errors before proceeding', true);
      return;
    }
    
    // Merge edited data back into uploadedData before proceeding
    const mergedData = {
      ...uploadedData,
      rows: uploadedData.rows.map((row, rowIndex) => {
        if (editedData[rowIndex]) {
          // Apply edits to this row
          const updatedRow = { ...row };
          Object.entries(editedData[rowIndex]).forEach(([targetColumn, newValue]) => {
            // Find source column for this target
            const sourceColumn = activeMappings.find(([s, t]) => t === targetColumn)?.[0];
            if (sourceColumn) {
              updatedRow[sourceColumn] = newValue;
            }
          });
          return updatedRow;
        }
        return row;
      })
    };
    
    onNext(dryRun, mergedData);
  };

  // Handle cell edit
  const handleCellEdit = (rowIndex, column, value) => {
    setEditedData(prev => ({
      ...prev,
      [rowIndex]: {
        ...(prev[rowIndex] || {}),
        [column]: value
      }
    }));
  };

  // Check if cell value is missing/empty
  const isCellEmpty = (value) => {
    return !value || value.toString().trim() === '';
  };

  // Check if row has errors
  const rowHasError = (rowIndex) => {
    const errorWarning = warnings.find(w => w.rowErrors);
    if (!errorWarning) return false;
    return errorWarning.rowErrors.some(err => err.rowNumber === rowIndex + 1);
  };

  // Count total errors
  const errorCount = useMemo(() => {
    return previewRows.filter((row, index) => rowHasError(index)).length;
  }, [previewRows, warnings]);

  // Filter and paginate rows for display
  const displayedRows = useMemo(() => {
    if (showOnlyErrors) {
      // Show only rows with errors (no pagination)
      return previewRows.filter((row, index) => rowHasError(index));
    }
    // Show first N rows (paginated)
    return previewRows.slice(0, rowsToShow);
  }, [previewRows, showOnlyErrors, rowsToShow, warnings]);

  const stats = {
    total: previewRows.length,
    mapped: activeMappings.length,
    warnings: warnings.length,
    errors: errorCount
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
            {stats.total}
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
            {stats.mapped}
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
            Issues
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: hasErrors ? 'var(--accentD)' : stats.warnings > 0 ? 'var(--accentC)' : 'var(--accentA)' }}>
            {stats.warnings}
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px' 
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Preview {showOnlyErrors ? `(${errorCount} ${errorCount === 1 ? 'Error' : 'Errors'})` : `(First ${Math.min(rowsToShow, previewRows.length)} of ${previewRows.length} Rows)`}
            {hasErrors && !showOnlyErrors && <span style={{ color: 'var(--accentD)' }}> - Click red cells to edit</span>}
          </h3>
          
          {/* Error Filter Checkbox */}
          {errorCount > 0 && (
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '8px 12px',
              backgroundColor: showOnlyErrors ? 'rgba(220, 53, 69, 0.1)' : 'var(--bg)',
              border: `1px solid ${showOnlyErrors ? 'var(--accentD)' : 'var(--border)'}`,
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, color: showOnlyErrors ? 'var(--accentD)' : 'var(--ink)' }}>
                Show only rows with errors ({errorCount})
              </span>
            </label>
          )}
        </div>
        
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '500px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg)', position: 'sticky', top: 0, zIndex: 1 }}>
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
                      color: isRequiredColumn(col) ? 'var(--accentD)' : 'var(--muted)',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem'
                    }}
                  >
                    {col} {isRequiredColumn(col) && '*'}
                  </th>
                ))}
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem'
                }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row, displayIndex) => {
                const rowIndex = row._originalIndex; // Get original row index
                return (
                  <tr
                    key={rowIndex}
                    style={{
                      backgroundColor: rowHasError(rowIndex) ? 'rgba(220, 53, 69, 0.05)' : (displayIndex % 2 === 0 ? '#fff' : 'var(--bg)')
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
                  {displayColumns.map(col => {
                    const value = row[col];
                    const isEmpty = isCellEmpty(value);
                    const isRequired = isRequiredColumn(col);
                    const hasError = isRequired && isEmpty;
                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.column === col;

                    return (
                      <td
                        key={col}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid var(--border)',
                          color: isEmpty ? 'var(--muted)' : 'var(--ink)',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          border: hasError ? '2px solid var(--accentD)' : '1px solid transparent',
                          cursor: hasError || (isRequired && !isEditing) ? 'pointer' : 'default',
                          position: 'relative'
                        }}
                        onClick={() => {
                          if (hasError || isRequired) {
                            setEditingCell({ rowIndex, column: col });
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={value}
                            onBlur={(e) => {
                              handleCellEdit(rowIndex, col, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(rowIndex, col, e.target.value);
                                setEditingCell(null);
                              }
                              if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '4px',
                              border: '1px solid var(--accentB)',
                              borderRadius: '4px',
                              fontSize: '0.85rem'
                            }}
                          />
                        ) : isEmpty ? (
                          <span style={{ 
                            fontStyle: 'italic',
                            color: hasError ? 'var(--accentD)' : 'var(--muted)'
                          }}>
                            {hasError ? '[Click to edit]' : '(empty)'}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                  <td style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'center'
                  }}>
                    {rowHasError(rowIndex) ? (
                      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    ) : (
                      <span style={{ fontSize: '1.2rem' }}>✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer with Pagination */}
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--muted)', 
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {showOnlyErrors ? (
              <span>
                Showing <strong style={{ color: 'var(--accentD)' }}>{errorCount}</strong> of {previewRows.length} total rows (rows with errors only)
              </span>
            ) : (
              <span>
                Showing <strong>{Math.min(rowsToShow, previewRows.length)}</strong> of <strong>{previewRows.length}</strong> total rows
                {errorCount > 0 && <span style={{ color: 'var(--accentD)' }}> • {errorCount} with errors</span>}
              </span>
            )}
            {isRequiredColumn && <span style={{ color: 'var(--accentD)' }}> • * = Required field</span>}
          </div>
          
          {/* Load More Button */}
          {!showOnlyErrors && rowsToShow < previewRows.length && (
            <button
              className="btn"
              onClick={() => setRowsToShow(rowsToShow + 50)}
              style={{ fontSize: '0.85rem' }}
            >
              Load Next 50 Rows
            </button>
          )}
          
          {/* Show All Button (only if more than 100 rows remaining) */}
          {!showOnlyErrors && rowsToShow < previewRows.length && (previewRows.length - rowsToShow) > 100 && (
            <button
              className="btn"
              onClick={() => setRowsToShow(previewRows.length)}
              style={{ fontSize: '0.85rem', marginLeft: '8px' }}
            >
              Show All {previewRows.length} Rows
            </button>
          )}
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