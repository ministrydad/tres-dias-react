// src/modules/Admin/components/ImportProgress.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';

export default function ImportProgress({ 
  uploadedData, 
  mappedColumns, 
  selectedGender,
  shouldSplitByGender,
  genderColumnName,
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
  
  // Gender split stats
  const [menImported, setMenImported] = useState(0);
  const [womenImported, setWomenImported] = useState(0);

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
      if (shouldSplitByGender) {
        await performSplitImport();
      } else {
        await performRealImport();
      }
    }
  };

  const performDryRun = async () => {
    console.log('🧪 DRY RUN MODE - No data will be imported');
    
    if (shouldSplitByGender) {
      console.log('📊 Gender split mode enabled');
    }
    
    for (let i = 0; i < uploadedData.rows.length; i++) {
      const row = uploadedData.rows[i];
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Build mapped row
      const mappedRow = {};
      activeMappings.forEach(([sourceColumn, targetColumn]) => {
        mappedRow[targetColumn] = row[sourceColumn] || null;
      });
      
      // Determine gender if splitting
      if (shouldSplitByGender && genderColumnName) {
        const genderValue = row[genderColumnName];
        const gender = determineGender(genderValue);
        console.log(`Row ${i + 1} [${gender}]:`, mappedRow);
        
        if (gender === 'men') {
          setMenImported(prev => prev + 1);
        } else {
          setWomenImported(prev => prev + 1);
        }
      } else {
        console.log(`Row ${i + 1}:`, mappedRow);
      }
      
      // Update progress
      setCurrentRow(i + 1);
      setProgress(((i + 1) / uploadedData.rows.length) * 100);
      setSuccessCount(i + 1);
    }
    
    setComplete(true);
    setImporting(false);
    
    if (shouldSplitByGender) {
      window.showMainStatus(`✅ Dry run complete! ${menImported} men, ${womenImported} women validated (not imported)`, false);
    } else {
      window.showMainStatus(`✅ Dry run complete! ${uploadedData.rows.length} rows validated (not imported)`, false);
    }
  };

  // Helper function to determine gender from value
  const determineGender = (genderValue) => {
    const gender = (genderValue || '').toLowerCase().trim();
    
    if (gender === 'm' || gender === 'male' || gender === 'men' || gender === 'man') {
      return 'men';
    } else if (gender === 'f' || gender === 'female' || gender === 'women' || gender === 'woman') {
      return 'women';
    } else {
      // Unknown - default to men
      console.warn(`Unknown gender value: "${genderValue}" - defaulting to men`);
      return 'men';
    }
  };

  // Split data by gender and import to both tables
  const performSplitImport = async () => {
    console.log('⚡ SPLIT IMPORT MODE - Importing to both men_raw and women_raw');
    
    const batchSize = 50;
    let menGeneratedKeys = [];
    let womenGeneratedKeys = [];
    
    try {
      // Step 1: Get highest existing PescadoreKeys for both tables
      const { data: menData, error: menKeyError } = await supabase
        .from('men_raw')
        .select('PescadoreKey')
        .eq('org_id', orgId)
        .order('PescadoreKey', { ascending: false })
        .limit(1);
      
      const { data: womenData, error: womenKeyError } = await supabase
        .from('women_raw')
        .select('PescadoreKey')
        .eq('org_id', orgId)
        .order('PescadoreKey', { ascending: false })
        .limit(1);
      
      if (menKeyError) throw menKeyError;
      if (womenKeyError) throw womenKeyError;
      
      let nextMenKey = menData?.[0]?.PescadoreKey ? parseInt(menData[0].PescadoreKey) + 1 : 1;
      let nextWomenKey = womenData?.[0]?.PescadoreKey ? parseInt(womenData[0].PescadoreKey) + 1 : 1;
      
      console.log(`Starting Men's PescadoreKey at: ${nextMenKey}`);
      console.log(`Starting Women's PescadoreKey at: ${nextWomenKey}`);
      
      // Step 2: Split rows by gender
      const menRows = [];
      const womenRows = [];
      
      uploadedData.rows.forEach((row, index) => {
        const genderValue = row[genderColumnName];
        const gender = determineGender(genderValue);
        
        if (gender === 'men') {
          menRows.push({ originalRow: row, originalIndex: index });
        } else {
          womenRows.push({ originalRow: row, originalIndex: index });
        }
      });
      
      console.log(`Split: ${menRows.length} men, ${womenRows.length} women`);
      
      // Step 3: Import men's data
      if (menRows.length > 0) {
        await importToTable('men_raw', menRows, nextMenKey, menGeneratedKeys, 'men');
      }
      
      // Step 4: Import women's data
      if (womenRows.length > 0) {
        await importToTable('women_raw', womenRows, nextWomenKey, womenGeneratedKeys, 'women');
      }
      
      setGeneratedKeys([...menGeneratedKeys, ...womenGeneratedKeys]);
      setComplete(true);
      setImporting(false);
      
      if (errorCount === 0) {
        window.showMainStatus(`✅ Split import complete! ${menImported} men, ${womenImported} women imported`, false);
      } else {
        window.showMainStatus(`⚠️ Import complete with errors. ${successCount} succeeded, ${errorCount} failed`, true);
      }
      
    } catch (error) {
      console.error('Split import failed:', error);
      setErrors(prev => [...prev, { rows: 'All', message: error.message }]);
      setComplete(true);
      setImporting(false);
      window.showMainStatus(`❌ Import failed: ${error.message}`, true);
    }
  };

  // Helper function to import to a specific table
  const importToTable = async (tableName, rows, startingKey, generatedKeysArray, genderLabel) => {
    const batchSize = 50;
    let nextKey = startingKey;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const mappedBatch = [];
      
      batch.forEach(({ originalRow, originalIndex }, batchIndex) => {
        const mappedRow = {
          org_id: orgId
        };
        
        activeMappings.forEach(([sourceColumn, targetColumn]) => {
          // Skip gender column when inserting
          if (sourceColumn === genderColumnName) {
            return;
          }
          
          let value = originalRow[sourceColumn];
          
          if (value === '' || value === undefined) {
            value = null;
          }
          
          if (targetColumn === 'PescadoreKey') {
            if (!value || value === null) {
              value = nextKey;
              generatedKeysArray.push({ 
                row: originalIndex + 1, 
                key: nextKey,
                gender: genderLabel 
              });
              nextKey++;
            }
          }
          
          mappedRow[targetColumn] = value;
        });
        
        if (!mappedRow.PescadoreKey) {
          mappedRow.PescadoreKey = nextKey;
          generatedKeysArray.push({ 
            row: originalIndex + 1, 
            key: nextKey,
            gender: genderLabel 
          });
          nextKey++;
        }
        
        mappedBatch.push(mappedRow);
      });
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(mappedBatch);
      
      if (error) {
        console.error(`${tableName} batch insert error:`, error);
        setErrors(prev => [...prev, { 
          rows: `${genderLabel} ${i + 1}-${i + batch.length}`, 
          message: error.message 
        }]);
        setErrorCount(prev => prev + batch.length);
      } else {
        setSuccessCount(prev => prev + batch.length);
        
        if (genderLabel === 'men') {
          setMenImported(prev => prev + batch.length);
        } else {
          setWomenImported(prev => prev + batch.length);
        }
      }
      
      const totalProcessed = currentRow + batch.length;
      setCurrentRow(totalProcessed);
      setProgress((totalProcessed / totalRows) * 100);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Regular import (no gender split)
  const performRealImport = async () => {
    console.log('⚡ LIVE IMPORT MODE - Inserting data to database');
    
    const targetTable = selectedGender === 'men' ? 'men_raw' : 'women_raw';
    const batchSize = 50;
    let newGeneratedKeys = [];
    
    try {
      const { data: existingData, error: keyError } = await supabase
        .from(targetTable)
        .select('PescadoreKey')
        .eq('org_id', orgId)
        .order('PescadoreKey', { ascending: false })
        .limit(1);
      
      if (keyError) throw keyError;
      
      let nextKey = existingData?.[0]?.PescadoreKey ? parseInt(existingData[0].PescadoreKey) + 1 : 1;
      console.log(`Starting PescadoreKey at: ${nextKey}`);
      
      for (let i = 0; i < uploadedData.rows.length; i += batchSize) {
        const batch = uploadedData.rows.slice(i, i + batchSize);
        const mappedBatch = [];
        
        batch.forEach((row, batchIndex) => {
          const mappedRow = {
            org_id: orgId
          };
          
          activeMappings.forEach(([sourceColumn, targetColumn]) => {
            let value = row[sourceColumn];
            
            if (value === '' || value === undefined) {
              value = null;
            }
            
            if (targetColumn === 'PescadoreKey') {
              if (!value || value === null) {
                value = nextKey;
                newGeneratedKeys.push({ row: i + batchIndex + 1, key: nextKey });
                nextKey++;
              }
            }
            
            mappedRow[targetColumn] = value;
          });
          
          if (!mappedRow.PescadoreKey) {
            mappedRow.PescadoreKey = nextKey;
            newGeneratedKeys.push({ row: i + batch.indexOf(row) + 1, key: nextKey });
            nextKey++;
          }
          
          mappedBatch.push(mappedRow);
        });
        
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
        
        const processedRows = Math.min(i + batchSize, uploadedData.rows.length);
        setCurrentRow(processedRows);
        setProgress((processedRows / uploadedData.rows.length) * 100);
        
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
            ? shouldSplitByGender 
              ? 'Simulating gender split import - no data will be saved'
              : 'Simulating import - no data will be saved to database'
            : shouldSplitByGender
              ? `Importing ${totalRows} rows to both men's and women's directories`
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
        gridTemplateColumns: shouldSplitByGender ? 'repeat(auto-fit, minmax(120px, 1fr))' : 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {shouldSplitByGender ? (
          <>
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--bg)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accentB)' }}>
                {menImported}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Men {dryRun ? 'Validated' : 'Imported'}
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--bg)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#e91e63' }}>
                {womenImported}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Women {dryRun ? 'Validated' : 'Imported'}
              </div>
            </div>
          </>
        ) : (
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
        )}

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
                  <div key={`${gk.row}-${gk.key}`}>
                    Row {gk.row}{gk.gender ? ` (${gk.gender})` : ''}: Key {gk.key}
                  </div>
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
                  window.showMainStatus('Redirecting to Directory...', false);
                  setTimeout(() => {
                    window.location.href = '#directory';
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