// src/modules/Admin/components/ColumnMapper.jsx
import { useState, useEffect } from 'react';

export default function ColumnMapper({ uploadedData, selectedGender, onMappingComplete, onBack, onCancel }) {
  const [mappings, setMappings] = useState({});
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Target database columns based on gender
  const getTargetColumns = () => {
    // Core columns (same for both genders)
    const coreColumns = [
      'PescadoreKey',
      'LastServiceKey',
      'First',
      'Last',
      'Preferred',
      'Email',
      'Phone1',
      'Phone2',
      'Church',
      'Address',
      'City',
      'State',
      'zip',
      'Candidate Weekend',
      'Last weekend worked'
    ];

    // Team roles
    const teamRoles = [
      'Rector', 'BUR', 'Rover', 'Head', 'Asst Head',
      'Head Spiritual Director', 'Spiritual Director',
      'Head Prayer', 'Prayer',
      'Head Kitchen', 'Asst Head Kitchen', 'Kitchen',
      'Head Table', 'Table',
      'Head Chapel', 'Chapel',
      'Head Dorm', 'Dorm',
      'Head Palanca', 'Palanca',
      'Head Gopher', 'Gopher',
      'Head Storeroom', 'Storeroom',
      'Head Floater Supply', 'Floater Supply',
      'Head Worship', 'Worship',
      'media', 'prof_silent'
    ];

    // Professor roles
    const profRoles = [
      'Prof_Ideal', 'Prof_Church', 'Prof_Piety', 'Prof_Study',
      'Prof_Action', 'Prof_Leaders', 'Prof_Environments',
      'Prof_CCIA', 'Prof_Reunion'
    ];

    // Service history columns
    const serviceColumns = [
      'Rector Service', 'BUR Service', 'Rover Service',
      'Head Service', 'Asst Head Service',
      'Head Spiritual Director Service', 'Spiritual Director Service',
      'Head Prayer Service', 'Prayer Service',
      'Head Kitchen Service', 'Asst Head Kitchen Service', 'Kitchen Service',
      'Head Table Service', 'Table Service',
      'Head Chapel Service', 'Chapel Service',
      'Head Dorm Service', 'Dorm Service',
      'Head Palanca Service', 'Palanca Service',
      'Head Gopher Service', 'Gopher Service',
      'Head Storeroom Service', 'Storeroom Service',
      'Head Floater Supply Service', 'Floater Supply Service',
      'Head Worship Service', 'Worship Service',
      'Media Service', 'Prof_Silent Service',
      'Prof_Ideal Service', 'Prof_Church Service', 'Prof_Piety Service',
      'Prof_Study Service', 'Prof_Action Service', 'Prof_Leaders Service',
      'Prof_Environments Service', 'Prof_CCIA Service', 'Prof_Reunion Service'
    ];

    return [...coreColumns, ...teamRoles, ...profRoles, ...serviceColumns];
  };

  // Normalize column name for matching
  const normalizeColumnName = (name) => {
    return name
      .toLowerCase()
      .replace(/[_\s-]/g, '')  // Remove underscores, spaces, hyphens
      .trim();
  };

  // Auto-map columns using intelligent matching
  const autoMapColumns = (sourceHeaders) => {
    const targetColumns = getTargetColumns();
    const newMappings = {};

    // Build normalized lookup for target columns
    const targetLookup = {};
    targetColumns.forEach(target => {
      const normalized = normalizeColumnName(target);
      targetLookup[normalized] = target;
    });

    // Common variations dictionary
    const variations = {
      // Names
      'first': 'First',
      'firstname': 'First',
      'fname': 'First',
      'last': 'Last',
      'lastname': 'Last',
      'lname': 'Last',
      'surname': 'Last',
      'preferred': 'Preferred',
      'preferredname': 'Preferred',
      'nickname': 'Preferred',
      'nick': 'Preferred',
      
      // Contact
      'email': 'Email',
      'emailaddress': 'Email',
      'mail': 'Email',
      'phone': 'Phone1',
      'phone1': 'Phone1',
      'cell': 'Phone1',
      'cellphone': 'Phone1',
      'mobile': 'Phone1',
      'mobilephone': 'Phone1',
      'primaryphone': 'Phone1',
      'phone2': 'Phone2',
      'homephone': 'Phone2',
      'home': 'Phone2',
      'secondaryphone': 'Phone2',
      'alternatephone': 'Phone2',
      'church': 'Church',
      'churchname': 'Church',
      'parish': 'Church',
      'parishname': 'Parish',
      'homechurch': 'Church',
      
      // Address
      'address': 'Address',
      'streetaddress': 'Address',
      'street': 'Address',
      'city': 'City',
      'state': 'State',
      'zip': 'zip',
      'zipcode': 'zip',
      'postalcode': 'zip',
      
      // IDs
      'pescadorekey': 'PescadoreKey',
      'pescadoreid': 'PescadoreKey',
      'id': 'PescadoreKey',
      'memberid': 'PescadoreKey',
      'key': 'PescadoreKey',
      'lastservicekey': 'LastServiceKey',
      
      // Weekends
      'candidateweekend': 'Candidate Weekend',
      'weekend': 'Candidate Weekend',
      'lastweekendworked': 'Last weekend worked',
      
      // Roles - lowercase variations
      'rector': 'Rector',
      'bur': 'BUR',
      'rover': 'Rover',
      'head': 'Head',
      'assistanthead': 'Asst Head',
      'assthead': 'Asst Head',
      'headspiritdirector': 'Head Spiritual Director',
      'headspiritualdirector': 'Head Spiritual Director',
      'spiritualdirector': 'Spiritual Director',
      'spiritdirector': 'Spiritual Director',
      'headprayer': 'Head Prayer',
      'prayer': 'Prayer',
      'headkitchen': 'Head Kitchen',
      'assistantheadkitchen': 'Asst Head Kitchen',
      'assistheadkitchen': 'Asst Head Kitchen',
      'kitchen': 'Kitchen',
      'headtable': 'Head Table',
      'table': 'Table',
      'headchapel': 'Head Chapel',
      'chapel': 'Chapel',
      'headdorm': 'Head Dorm',
      'dorm': 'Dorm',
      'headpalanca': 'Head Palanca',
      'palanca': 'Palanca',
      'headgopher': 'Head Gopher',
      'gopher': 'Gopher',
      'headstoreroom': 'Head Storeroom',
      'storeroom': 'Storeroom',
      'headfloatersupply': 'Head Floater Supply',
      'floatersupply': 'Floater Supply',
      'headworship': 'Head Worship',
      'worship': 'Worship',
      'media': 'media',
      'profsilent': 'prof_silent',
      
      // Professor roles
      'profideal': 'Prof_Ideal',
      'profchurch': 'Prof_Church',
      'profpiety': 'Prof_Piety',
      'profstudy': 'Prof_Study',
      'profaction': 'Prof_Action',
      'profleaders': 'Prof_Leaders',
      'profenvironments': 'Prof_Environments',
      'profccia': 'Prof_CCIA',
      'profreunion': 'Prof_Reunion'
    };

    // Try to match each source header
    sourceHeaders.forEach(sourceHeader => {
      const normalized = normalizeColumnName(sourceHeader);
      
      // Try variations dictionary first
      if (variations[normalized]) {
        newMappings[sourceHeader] = variations[normalized];
        return;
      }
      
      // Try direct normalized match with target columns
      if (targetLookup[normalized]) {
        newMappings[sourceHeader] = targetLookup[normalized];
        return;
      }
      
      // Try pattern matching for service history columns
      // Pattern: "rectorservice" or "rector service" → "Prof_Rector Service"
      if (normalized.includes('service')) {
        const rolePattern = normalized.replace('service', '').trim();
        
        // Check if it matches any role name
        targetColumns.forEach(target => {
          if (target.includes('Service')) {
            const targetRole = normalizeColumnName(target.replace('Service', '').trim());
            if (targetRole === rolePattern || normalized === normalizeColumnName(target)) {
              newMappings[sourceHeader] = target;
            }
          }
        });
      }
      
      // If no match found, leave unmapped (null)
      if (!newMappings[sourceHeader]) {
        newMappings[sourceHeader] = null;
      }
    });

    return newMappings;
  };

  // Initialize mappings on mount
  useEffect(() => {
    if (uploadedData?.headers) {
      const autoMapped = autoMapColumns(uploadedData.headers);
      setMappings(autoMapped);
    }
  }, [uploadedData]);

  // Update a single mapping
  const handleMappingChange = (sourceColumn, targetColumn) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetColumn || null
    }));
  };

  // Calculate statistics
  const getMappingStats = () => {
    const total = Object.keys(mappings).length;
    const mapped = Object.values(mappings).filter(v => v !== null).length;
    const unmapped = total - mapped;
    
    return { total, mapped, unmapped };
  };

  // Handle next step
  const handleNext = () => {
    const stats = getMappingStats();
    
    if (stats.mapped === 0) {
      window.showMainStatus('Please map at least one column before continuing', true);
      return;
    }
    
    // Pass mappings back to parent
    onMappingComplete(mappings);
  };

  const stats = getMappingStats();
  const targetColumns = getTargetColumns();
  const displayColumns = showAllColumns 
    ? Object.keys(mappings)
    : Object.keys(mappings).slice(0, 10);

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>
        Step 2: Map Columns
      </h2>

      {/* Statistics Card */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--bg)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>
            Column Mapping Results
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{stats.mapped}</span> mapped, {' '}
            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{stats.unmapped}</span> unmapped, {' '}
            <span style={{ fontWeight: 600 }}>{stats.total}</span> total columns
          </div>
        </div>
        <div style={{
          padding: '8px 16px',
          backgroundColor: stats.mapped > stats.total / 2 ? 'var(--successL)' : 'var(--warningL)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: stats.mapped > stats.total / 2 ? 'var(--success)' : 'var(--warning)'
        }}>
          {Math.round((stats.mapped / stats.total) * 100)}% Complete
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--accentL)',
        borderRadius: '8px',
        border: '1px solid var(--accent)',
        marginBottom: '24px',
        fontSize: '0.85rem',
        color: 'var(--ink)'
      }}>
        <strong>💡 Tip:</strong> We've automatically matched {stats.mapped} columns. 
        Review the mappings below and adjust any that need changes. 
        Unmapped columns will be skipped during import.
      </div>

      {/* Mapping Table */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '24px'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 50px 1fr 80px',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: '0.85rem',
          color: 'var(--muted)'
        }}>
          <div>Source Column (Your File)</div>
          <div style={{ textAlign: 'center' }}>→</div>
          <div>Target Column (Database)</div>
          <div style={{ textAlign: 'center' }}>Status</div>
        </div>

        {/* Table Rows */}
        {displayColumns.map((sourceColumn, index) => {
          const targetColumn = mappings[sourceColumn];
          const isMapped = targetColumn !== null;

          return (
            <div
              key={sourceColumn}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 50px 1fr 80px',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: index < displayColumns.length - 1 ? '1px solid var(--border)' : 'none',
                backgroundColor: index % 2 === 0 ? '#fff' : 'var(--bg)',
                alignItems: 'center'
              }}
            >
              {/* Source Column */}
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: 'var(--ink)',
                fontFamily: 'monospace'
              }}>
                {sourceColumn}
              </div>

              {/* Arrow */}
              <div style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--muted)' }}>
                →
              </div>

              {/* Target Column Dropdown */}
              <div>
                <select
                  value={targetColumn || ''}
                  onChange={(e) => handleMappingChange(sourceColumn, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '0.85rem',
                    border: `1px solid ${isMapped ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Skip (Don't Import) --</option>
                  {targetColumns.map(target => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Indicator */}
              <div style={{ textAlign: 'center' }}>
                {isMapped ? (
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: 'var(--successL)',
                    color: 'var(--success)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    ✓ Mapped
                  </span>
                ) : (
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: 'var(--warningL)',
                    color: 'var(--warning)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    ⚠ Skip
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {Object.keys(mappings).length > 10 && (
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <button
            className="btn"
            onClick={() => setShowAllColumns(!showAllColumns)}
            style={{ fontSize: '0.85rem' }}
          >
            {showAllColumns 
              ? `Show Less (Showing all ${Object.keys(mappings).length} columns)`
              : `Show All Columns (${Object.keys(mappings).length - 10} more)`
            }
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleNext}
          disabled={stats.mapped === 0}
        >
          Next: Preview Data →
        </button>
      </div>
    </div>
  );
}