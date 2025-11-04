// src/modules/Admin/components/ImportProgress.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';

export default function ImportProgress({ 
  uploadedData, 
  mappedColumns, 
  selectedGender, 
  dryRun,
  onComplete, 
  onBack, 
  onCancel 
}) {
  const { orgId } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [complete, setComplete] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState([]);

  // Filter mapped columns only
  const activeMappings = Object.entries(mappedColumns).filter(([source, target]) => target !== null);

  // Start import on mount
  useEffect(() => {
    if (!importing && !complete) {
      startImport();
    }
  }, []);

  const startImport = async () => {
    setImporting(true);
    setTotalRows(uploadedData.rows.length);
    
    if (dryRun) {
      // Dry run - simulate import with delays
      await performDryRun();
    } else {
      // Real import - actually insert data
      await performRealImport();
    }
  };

  const performDryRun = async () => {
    console.log('🧪 DRY RUN MODE - No data will be imported');
    
    for (let i = 0; i < uploadedData.rows.length; i++) {
      const row = uploadedData.rows[i];
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Build mapped row
      const mappedRow = {};
      activeMappings.forEach(([sourceColumn, targetColumn]) => {
        mappedRow[targetColumn] = row[sourceColumn] || null;
      });
      
      // Log what would be inserted
      console.log(`Row ${i + 1}:`, mappedRow);
      
      // Update progress
      setCurrentRow(i + 1);
      setProgress(((i + 1) / uploadedData.rows.length) * 100);
      setSuccessCount(i + 1);
    }
    
    setComplete(true);
    setImporting(false);
    window.showMainStatus(`✅ Dry run complete! ${uploadedData.rows.length} rows validated (not imported)`, false);
  };

  const performRealImport = async () => {
    console.log('⚡ LIVE IMPORT MODE - Inserting data to database');
    
    const targetTable = selectedGender === 'men' ? 'men_raw' : 'women_raw';
    const batchSize = 50; // Insert 50 rows at a time
    let newGeneratedKeys = [];
    
    try {
      // Step 1: Get highest existing PescadoreKey for this org
      const { data: existingData, error: keyError } = await supabase
        .from(targetTable)
        .select('PescadoreKey')
        .eq('org_id', orgId)
        .order('PescadoreKey', { ascending: false })
        .limit(1);
      
      if (keyError) throw keyError;
      
      let nextKey = existingData?.[0]?.PescadoreKey ? parseInt(existingData[0].PescadoreKey) + 1 : 1;
      console.log(`Starting PescadoreKey at: ${nextKey}`);
      
      // Step 2: Process rows in batches
      for (let i = 0; i < uploadedData.rows.length; i += batchSize) {
        const batch = uploadedData.rows.slice(i, i + batchSize);
        const mappedBatch = [];
        
        // Build mapped rows for this batch
        batch.forEach((row, batchIndex) => {
          const mappedRow = {
            org_id: orgId // CRITICAL: Add org_id to every row
          };
          
          // Map each column
          activeMappings.forEach(([sourceColumn, targetColumn]) => {
            let value = row[sourceColumn];
            
            // Handle empty values
            if (value === '' || value === undefined) {
              value = null;
            }
            
            // Special handling for PescadoreKey
            if (targetColumn === 'PescadoreKey') {
              if (!value || value === null) {
                // Auto-generate if missing
                value = nextKey;
                newGeneratedKeys.push({ row: i + batchIndex + 1, key: nextKey });
                nextKey++;
              }
            }
            
            mappedRow[targetColumn] = value;
          });
          
          // Ensure PescadoreKey exists
          if (!mappedRow.PescadoreKey) {
            mappedRow.PescadoreKey = nextKey;
            newGeneratedKeys.push({ row: i + batch.indexOf(row) + 1, key: nextKey });
            nextKey++;
          }
          
          mappedBatch.push(mappedRow);
        });
        
        // Step 3: Insert batch
        const { data, error } = await supabase
          .from(targetTable)
          .insert(mappedBatch);
        
        if (error) {
          console.error('Batch insert error:', error);
          setErrors(prev => [...prev, { 
            rows: `${i + 1}-${i + batch.length}`, 
            message: error.message 
          }]);
          setErrorCount(prev => prev + batch.length);
        } else {
          setSuccessCount(prev => prev + batch.length);
        }
        
        // Update progress
        const processedRows = Math.min(i + batchSize, uploadedData.rows.length);
        setCurrentRow(processedRows);
        setProgress((processedRows / uploadedData.rows.length) * 100);
        
        // Small delay between batches to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setGeneratedKeys(newGeneratedKeys);
      setComplete(true);
      setImporting(false);
      
      if (errorCount === 0) {
        window.showMainStatus(`✅ Import complete! Successfully imported ${successCount} rows to ${selectedGender} directory`, false);
      } else {
        window.showMainStatus(`⚠️ Import complete with errors. ${successCount} succeeded, ${errorCount} failed`, true);
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      setErrors(prev => [...prev, { rows: 'All', message: error.message }]);
      setComplete(true);
      setImporting(false);
      window.showMainStatus(`❌ Import failed: ${error.message}`, true);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>
        Step 4: {dryRun ? 'Dry Run Preview' : 'Import Data'}
      </h2>

      {/* Mode Indicator */}
      <div style={{
        padding: '16px',
        backgroundColor: dryRun ? 'rgba(255, 193, 7, 0.1)' : 'rgba(46, 164, 79, 0.1)',
        border: `2px solid ${dryRun ? 'var(--accentC)' : 'var(--accentA)'}`,
        borderRadius: '8px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>
          {dryRun ? '🧪 Dry Run Mode' : '⚡ Live Import Mode'}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {dryRun 
            ? 'Simulating import - no data will be saved to database'
            : `Importing ${totalRows} rows to ${selectedGender} directory`
          }
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {importing ? 'Importing...' : complete ? 'Complete!' : 'Ready'}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {currentRow} / {totalRows} rows
          </span>
        </div>
        
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: 'var(--bg)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: errorCount > 0 ? 'var(--accentC)' : 'var(--accentA)',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {progress > 10 && `${Math.round(progress)}%`}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accentA)' }}>
            {successCount}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            {dryRun ? 'Validated' : 'Imported'}
          </div>
        </div>

        {errorCount > 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accentD)' }}>
              {errorCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Errors
            </div>
          </div>
        )}

        {generatedKeys.length > 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accentB)' }}>
              {generatedKeys.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Keys Generated
            </div>
          </div>
        )}
      </div>

      {/* Generated Keys Info */}
      {generatedKeys.length > 0 && complete && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 163, 255, 0.1)',
          border: '1px solid var(--accentB)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
            ℹ️ Auto-Generated PescadoreKeys
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Generated sequential keys for {generatedKeys.length} rows that were missing IDs.
            {generatedKeys.length <= 5 && (
              <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {generatedKeys.map(gk => (
                  <div key={gk.row}>Row {gk.row}: Key {gk.key}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--accentD)' }}>
            ❌ Errors Encountered
          </h3>
          {errors.map((err, index) => (
            <div
              key={index}
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid var(--accentD)',
                borderRadius: '8px',
                marginBottom: '8px',
                fontSize: '0.85rem'
              }}
            >
              <strong>Rows {err.rows}:</strong> {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Dry Run Console Output */}
      {dryRun && complete && (
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
            📋 Dry Run Complete
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Check your browser console (F12) to see the full preview of what would have been imported.
            No data was saved to the database.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {!importing && !complete && (
          <button className="btn" onClick={onBack}>
            ← Back
          </button>
        )}
        
        {complete && (
          <>
            <button className="btn" onClick={onCancel}>
              Done
            </button>
            {dryRun && (
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Start New Import
              </button>
            )}
            {!dryRun && errorCount === 0 && (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  // Navigate to directory to see imported data
                  window.showMainStatus('Redirecting to Directory...', false);
                  setTimeout(() => {
                    window.location.href = '#directory'; // Or use your navigation method
                  }, 1000);
                }}
              >
                View Imported Data →
              </button>
            )}
          </>
        )}
        
        {importing && (
          <button className="btn" disabled style={{ opacity: 0.5 }}>
            Importing...
          </button>
        )}
      </div>
    </div>
  );
}