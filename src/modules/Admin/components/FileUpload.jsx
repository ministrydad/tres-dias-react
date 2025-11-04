// src/modules/Admin/components/FileUpload.jsx
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function FileUpload({ onFileUploaded, onCancel }) {
  const [selectedGender, setSelectedGender] = useState('men');
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      window.showMainStatus('Invalid file type. Please upload .xlsx, .xls, or .csv files only.', true);
      return;
    }

    setParsing(true);
    window.showMainStatus('Parsing file...', false);

    try {
      const data = await parseFile(file);
      
      if (!data || !data.headers || data.headers.length === 0) {
        throw new Error('No data found in file or unable to detect column headers.');
      }

      if (!data.rows || data.rows.length === 0) {
        throw new Error('No data rows found in file.');
      }

      window.showMainStatus(`Successfully loaded ${data.rows.length} rows with ${data.headers.length} columns`, false);
      
      // Pass data back to parent with selected gender
      onFileUploaded(data, selectedGender);
      
    } catch (error) {
      console.error('File parsing error:', error);
      window.showMainStatus(`Error parsing file: ${error.message}`, true);
    } finally {
      setParsing(false);
    }
  };

  // Parse file using SheetJS
  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          let workbook;

          // Handle CSV vs Excel differently
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Parse as CSV
            workbook = XLSX.read(data, { type: 'string' });
          } else {
            // Parse as Excel
            workbook = XLSX.read(data, { type: 'array' });
          }

          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

          if (!jsonData || jsonData.length === 0) {
            reject(new Error('File appears to be empty or has no data rows.'));
            return;
          }

          // Extract headers from first row
          const headers = Object.keys(jsonData[0]);

          resolve({
            headers: headers,
            rows: jsonData,
            fileName: file.name,
            rowCount: jsonData.length,
            columnCount: headers.length
          });

        } catch (error) {
          reject(new Error(`Failed to parse file: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file. Please try again.'));
      };

      // Read file based on type
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // File input change handler
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>
        Step 1: Upload File
      </h2>

      {/* Gender Selection */}
      <div className="field" style={{ marginBottom: '32px' }}>
        <label className="label">Select Directory</label>
        <div className="toggle" style={{ display: 'flex', gap: '0' }}>
          <div
            className={`opt ${selectedGender === 'men' ? 'active' : ''}`}
            onClick={() => setSelectedGender('men')}
            style={{ cursor: 'pointer' }}
          >
            Men's Directory
          </div>
          <div
            className={`opt ${selectedGender === 'women' ? 'active' : ''}`}
            onClick={() => setSelectedGender('women')}
            style={{ cursor: 'pointer' }}
          >
            Women's Directory
          </div>
        </div>
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--muted)', 
          marginTop: '8px' 
        }}>
          Choose which directory to import data into
        </div>
      </div>

      {/* File Upload Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: dragActive ? 'var(--accentL)' : 'var(--bg)',
          cursor: parsing ? 'wait' : 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '24px'
        }}
      >
        {parsing ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              Parsing file...
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Please wait while we process your data
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              {dragActive ? 'Drop file here' : 'Drop file here or click to browse'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px' }}>
              Supported formats: .xlsx, .xls, .csv
            </div>
            <div style={{ 
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: 600,
              pointerEvents: 'none'
            }}>
              Choose File
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={parsing}
        />
      </div>

      {/* Instructions */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--bg)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        marginBottom: '24px'
      }}>
        <div style={{ 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          marginBottom: '8px',
          color: 'var(--ink)'
        }}>
          📋 Instructions:
        </div>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '20px', 
          fontSize: '0.85rem', 
          color: 'var(--muted)',
          lineHeight: '1.6'
        }}>
          <li>Prepare your Excel or CSV file with member data</li>
          <li>Ensure column headers are in the first row</li>
          <li>Common columns: First, Last, Email, Phone, Church, PescadoreKey</li>
          <li>Service history columns will be auto-detected</li>
          <li>You'll be able to map columns in the next step</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button 
          className="btn" 
          onClick={onCancel}
          disabled={parsing}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
