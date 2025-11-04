// src/modules/Admin/DataImport.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import FileUpload from './components/FileUpload';
import ColumnMapper from './components/ColumnMapper';

export default function DataImport() {
  const { permissions, isSuperAdmin, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedData, setUploadedData] = useState(null);
  const [selectedGender, setSelectedGender] = useState('men');
  const [mappedColumns, setMappedColumns] = useState(null);

  // Access control - only admins or super admins or owners
  if (!isSuperAdmin && !permissions?.['data-import'] && user?.role !== 'owner') {
    return (
      <div className="app-panel" style={{ display: 'block' }}>
        <div className="card pad">
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted)' }}>
            You do not have permission to access the Data Import tool. 
            Please contact your organization administrator.
          </p>
        </div>
      </div>
    );
  }

  // Step 1: File Upload - callback when file is parsed
  const handleFileUploaded = (data, gender) => {
    console.log('📁 File uploaded:', data);
    setUploadedData(data);
    setSelectedGender(gender);
    setCurrentStep(2); // Move to column mapping
  };

  // Step 2: Column Mapping - callback when mapping is complete
  const handleMappingComplete = (mappings) => {
    console.log('✅ Mappings completed:', mappings);
    setMappedColumns(mappings);
    setCurrentStep(3); // Move to preview
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    // Reset everything
    setCurrentStep(1);
    setUploadedData(null);
    setSelectedGender('men');
    setMappedColumns(null);
    window.showMainStatus('Import cancelled', false);
  };

  // Step indicator labels
  const stepLabels = [
    '1. Upload',
    '2. Map Columns',
    '3. Preview',
    '4. Import'
  ];

  return (
    <div className="app-panel" style={{ display: 'block' }}>
      {/* Step Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: 'var(--bg)',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div
              key={stepNum}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {/* Step circle */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                backgroundColor: isActive ? 'var(--accentB)' : (isCompleted ? 'var(--accentA)' : 'var(--border)'),
                color: isActive || isCompleted ? '#fff' : 'var(--muted)',
                transition: 'all 0.3s ease'
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>

              {/* Step label */}
              <span style={{
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? 'var(--ink)' : 'var(--muted)',
                transition: 'all 0.3s ease'
              }}>
                {label}
              </span>

              {/* Arrow between steps */}
              {stepNum < 4 && (
                <span style={{
                  margin: '0 8px',
                  color: 'var(--muted)',
                  fontSize: '1.2rem'
                }}>→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card pad" style={{ minHeight: '400px' }}>
        {currentStep === 1 && (
          <FileUpload 
            onFileUploaded={handleFileUploaded}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 2 && (
          <ColumnMapper
            uploadedData={uploadedData}
            selectedGender={selectedGender}
            onMappingComplete={handleMappingComplete}
            onBack={handleBack}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 3 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ marginBottom: '16px' }}>Step 3: Preview Data</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Coming in Phase 4!</p>
            <p style={{ 
              padding: '16px', 
              backgroundColor: 'var(--bg)', 
              borderRadius: '8px',
              color: 'var(--ink)',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}>
              Ready to import: {uploadedData?.rows?.length || 0} rows to <strong>{selectedGender}</strong> directory
              <br />
              Mapped columns: {mappedColumns ? Object.values(mappedColumns).filter(v => v !== null).length : 0}
            </p>
            
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn" onClick={handleBack}>
                ← Back
              </button>
              <button className="btn" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleNext}>
                Next →
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ marginBottom: '16px' }}>Step 4: Import Data</h2>
            <p style={{ color: 'var(--muted)' }}>Coming in Phase 5!</p>
            
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn" onClick={handleBack}>
                ← Back
              </button>
              <button className="btn" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => {
                window.showMainStatus('Import complete! (Phase 5 coming soon)', false);
                handleCancel();
              }}>
                Import Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}