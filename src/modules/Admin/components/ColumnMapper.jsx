// src/modules/Admin/components/ColumnMapper.jsx
import { useState, useEffect } from 'react';
import { UserGroupIcon, LightBulbIcon } from '@heroicons/react/24/outline';

export default function ColumnMapper({ uploadedData, selectedGender, onMappingComplete, onBack, onCancel }) {
  const [mappings, setMappings] = useState({});
  const [showAllColumns, setShowAllColumns] = useState(false);
  
  // Gender detection and modal
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [genderColumnDetected, setGenderColumnDetected] = useState(null);

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
      'Do_Not_Call',
      'Deceased',
      'Church',
      'Address',
      'City',
      'State',
      'Zip',
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
      'Media', 'Prof_Silent'
    ];

    // Professor roles
    const profRoles = [
      'Prof_Ideals', 'Prof_Church', 'Prof_Piety', 'Prof_Study',
      'Prof_Action', 'Prof_Leaders', 'Prof_Environments',
      'Prof_CCIA', 'Prof_Reunion'
    ];

    // Service history columns - Format: [Role] Service and [Role]_Service_Qty
    const serviceColumns = [
      'Rector Service', 'Rector_Service_Qty',
      'BUR Service', 'BUR_Service_Qty',
      'Rover Service', 'Rover_Service_Qty',
      'Head Service', 'Head_Service_Qty',
      'Asst Head Service', 'Asst_Head_Service_Qty',
      'Head Spiritual Director Service', 'Head_Spiritual_Director_Service_Qty',
      'Spiritual Director Service', 'Spiritual_Dir_Service_Qty',
      'Head Prayer Service', 'Head_Prayer_Service_Qty',
      'Prayer Service', 'Prayer_Service_Qty',
      'Head Kitchen Service', 'Head_Kitchen_Service_Qty',
      'Asst Head Kitchen Service', 'Asst_Head_Kitchen_Service_Qty',
      'Kitchen Service', 'Kitchen_Service_Qty',
      'Head Table Service', 'Head_Table_Service_Qty',
      'Table Service', 'Table_Service_Qty',
      'Head Chapel Service', 'Head_Chapel_Service_Qty',
      'Chapel Service', 'Chapel_Service_Qty',
      'Head Dorm Service', 'Head_Dorm_Service_Qty',
      'Dorm Service', 'Dorm_Service_Qty',
      'Head Palanca Service', 'Head_Palanca_Service_Qty',
      'Palanca Service', 'Palanca_Service_Qty',
      'Head Gopher Service', 'Head_Gopher_Service_Qty',
      'Gopher Service', 'Gopher_Service_Qty',
      'Head Storeroom Service', 'Head_Storeroom_Service_Qty',
      'Storeroom Service', 'Storeroom_Service_Qty',
      'Head Floater Supply Service', 'Head_Floater_Supply_Service_Qty',
      'Floater Supply Service', 'Floater_Supply_Service_Qty',
      'Head Worship Service', 'Head_Worship_Service_Qty',
      'Worship Service', 'Worship_Service_Qty',
      'Head Media Service', 'Head_Media_Service_Qty',
      'Media Service', 'Media_Service_Qty',
      'Prof_Silent Service', 'Prof_Silent_Service_Qty',
      'Prof_Ideals Service', 'Prof_Ideals_Service_Qty',
      'Prof_Church Service', 'Prof_Church_Service_Qty',
      'Prof_Piety Service', 'Prof_Piety_Service_Qty',
      'Prof_Study Service', 'Prof_Study_Service_Qty',
      'Prof_Action Service', 'Prof_Action_Service_Qty',
      'Prof_Leaders Service', 'Prof_Leaders_Service_Qty',
      'Prof_Environments Service', 'Prof_Environments_Service_Qty',
      'Prof_CCIA Service', 'Prof_CCIA_Service_Qty',
      'Prof_Reunion Service', 'Prof_Reunion_Service_Qty'
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
      'parishname': 'Church',
      'homechurch': 'Church',
      
      // Flags
      'donotcall': 'Do_Not_Call',
      'deceased': 'Deceased',
      'dead': 'Deceased',
      
      // Address
      'address': 'Address',
      'streetaddress': 'Address',
      'street': 'Address',
      'city': 'City',
      'state': 'State',
      'zip': 'Zip',
      'zipcode': 'Zip',
      'postalcode': 'Zip',
      
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
      'asstHeadkitchen': 'Asst Head Kitchen',
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
      'media': 'Media',
      'headmedia': 'Head Media Service',
      'profsilent': 'Prof_Silent',
      
      // Professor roles
      'profideals': 'Prof_Ideals',
      'profideal': 'Prof_Ideals',
      'profchurch': 'Prof_Church',
      'profpiety': 'Prof_Piety',
      'profstudy': 'Prof_Study',
      'profaction': 'Prof_Action',
      'profleaders': 'Prof_Leaders',
      'profenvironments': 'Prof_Environments',
      'profccia': 'Prof_CCIA',
      'profreunion': 'Prof_Reunion',
      
      // Quantity columns - Format: [Role]_Service_Qty
      'rectorserviceqty': 'Rector_Service_Qty',
      'burserviceqty': 'BUR_Service_Qty',
      'roverserviceqty': 'Rover_Service_Qty',
      'headserviceqty': 'Head_Service_Qty',
      'asstHeadserviceqty': 'Asst_Head_Service_Qty',
      'headspiritdirectorserviceqty': 'Head_Spiritual_Director_Service_Qty',
      'headspiritualdirectorserviceqty': 'Head_Spiritual_Director_Service_Qty',
      'spiritualdirserviceqty': 'Spiritual_Dir_Service_Qty',
      'spiritualdirectorserviceqty': 'Spiritual_Dir_Service_Qty',
      'headprayerserviceqty': 'Head_Prayer_Service_Qty',
      'prayerserviceqty': 'Prayer_Service_Qty',
      'headkitchenserviceqty': 'Head_Kitchen_Service_Qty',
      'asstHeadkitchenserviceqty': 'Asst_Head_Kitchen_Service_Qty',
      'kitchenserviceqty': 'Kitchen_Service_Qty',
      'headtableserviceqty': 'Head_Table_Service_Qty',
      'tableserviceqty': 'Table_Service_Qty',
      'headchapelserviceqty': 'Head_Chapel_Service_Qty',
      'chapelserviceqty': 'Chapel_Service_Qty',
      'headdormserviceqty': 'Head_Dorm_Service_Qty',
      'dormserviceqty': 'Dorm_Service_Qty',
      'headpalancaserviceqty': 'Head_Palanca_Service_Qty',
      'palancaserviceqty': 'Palanca_Service_Qty',
      'headgopherserviceqty': 'Head_Gopher_Service_Qty',
      'gopherserviceqty': 'Gopher_Service_Qty',
      'headstoreroomserviceqty': 'Head_Storeroom_Service_Qty',
      'storeroomserviceqty': 'Storeroom_Service_Qty',
      'headfloatersupplyserviceqty': 'Head_Floater_Supply_Service_Qty',
      'floatersupplyserviceqty': 'Floater_Supply_Service_Qty',
      'headworshipserviceqty': 'Head_Worship_Service_Qty',
      'worshipserviceqty': 'Worship_Service_Qty',
      'headmediaserviceqty': 'Head_Media_Service_Qty',
      'mediaserviceqty': 'Media_Service_Qty',
      'profsilentserviceqty': 'Prof_Silent_Service_Qty',
      'profidealsserviceqty': 'Prof_Ideals_Service_Qty',
      'profidealserviceqty': 'Prof_Ideals_Service_Qty',
      'profchurchserviceqty': 'Prof_Church_Service_Qty',
      'profpietyserviceqty': 'Prof_Piety_Service_Qty',
      'profstudyserviceqty': 'Prof_Study_Service_Qty',
      'profactionserviceqty': 'Prof_Action_Service_Qty',
      'profleadersserviceqty': 'Prof_Leaders_Service_Qty',
      'profenvironmentsserviceqty': 'Prof_Environments_Service_Qty',
      'profcciaserviceqty': 'Prof_CCIA_Service_Qty',
      'profreunionserviceqty': 'Prof_Reunion_Service_Qty'
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
      // Pattern: "rectorservice" or "rector service" → "Rector Service"
      if (normalized.includes('service') && !normalized.includes('qty')) {
        const rolePattern = normalized.replace('service', '').trim();
        
        // Check if it matches any role name
        targetColumns.forEach(target => {
          if (target.includes(' Service') && !target.includes('_Qty')) {
            const targetRole = normalizeColumnName(target.replace(' Service', '').trim());
            if (targetRole === rolePattern || normalized === normalizeColumnName(target)) {
              newMappings[sourceHeader] = target;
            }
          }
        });
      }
      
      // Try pattern matching for Qty columns
      // Pattern: "rectorserviceqty" or "rector_service_qty" → "Rector_Service_Qty"
      if (normalized.includes('serviceqty') || (normalized.includes('service') && normalized.includes('qty'))) {
        const rolePattern = normalized.replace('service', '').replace('qty', '').trim();
        
        // Check if it matches any role name
        targetColumns.forEach(target => {
          if (target.includes('_Service_Qty')) {
            const targetRole = normalizeColumnName(target.replace('_Service_Qty', '').trim());
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

  // Detect gender column
  const detectGenderColumn = () => {
    // Check if any source column looks like a gender column
    const genderMapping = Object.entries(mappings).find(([source, target]) => {
      const sourceLower = source.toLowerCase();
      return sourceLower.includes('gender') || sourceLower.includes('sex') || 
             sourceLower === 'm/f' || sourceLower === 'male/female';
    });
    
    return genderMapping ? genderMapping[0] : null; // Return source column name
  };

  // Handle next step with gender detection
  const handleNext = () => {
    const stats = getMappingStats();
    
    if (stats.mapped === 0) {
      window.showMainStatus('Please map at least one column before continuing', true);
      return;
    }
    
    // Check for gender column
    const genderCol = detectGenderColumn();
    if (genderCol) {
      setGenderColumnDetected(genderCol);
      setShowGenderModal(true);
    } else {
      // No gender column, proceed normally
      onMappingComplete(mappings, false, null);
    }
  };

  // Handle gender split decision
  const handleGenderSplit = (shouldSplit) => {
    setShowGenderModal(false);
    onMappingComplete(mappings, shouldSplit, genderColumnDetected);
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
            <span style={{ color: 'var(--accentA)', fontWeight: 600 }}>{stats.mapped}</span> mapped, {' '}
            <span style={{ color: 'var(--accentC)', fontWeight: 600 }}>{stats.unmapped}</span> unmapped, {' '}
            <span style={{ fontWeight: 600 }}>{stats.total}</span> total columns
          </div>
        </div>
        <div style={{
          padding: '8px 16px',
          backgroundColor: stats.mapped > stats.total / 2 ? 'rgba(46, 164, 79, 0.15)' : 'rgba(255, 193, 7, 0.15)',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: stats.mapped > stats.total / 2 ? 'var(--accentA)' : 'var(--accentC)'
        }}>
          {Math.round((stats.mapped / stats.total) * 100)}% Complete
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(0, 163, 255, 0.15)',
        borderRadius: '8px',
        border: '1px solid var(--accentB)',
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
                    border: `1px solid ${isMapped ? 'var(--accentA)' : 'var(--border)'}`,
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
                    backgroundColor: 'rgba(46, 164, 79, 0.15)',
                    color: 'var(--accentA)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    ✓ Mapped
                  </span>
                ) : (
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: 'rgba(255, 193, 7, 0.15)',
                    color: 'var(--accentC)',
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

      {/* Gender Detection Modal */}
      {showGenderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserGroupIcon style={{ width: '32px', height: '32px', color: 'var(--accentB)' }} />
              Gender Column Detected!
            </h3>
            
            <p style={{ fontSize: '1rem', marginBottom: '24px', color: 'var(--ink)', lineHeight: '1.6' }}>
              We detected a gender column (<strong>{genderColumnDetected}</strong>) in your file.
              <br /><br />
              Would you like us to automatically split this data into both Men's and Women's directories?
            </p>

            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(0, 163, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid var(--accentB)',
              marginBottom: '24px',
              fontSize: '0.9rem',
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <LightBulbIcon style={{ width: '20px', height: '20px', color: 'var(--accentB)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Tip:</strong> If you choose "Yes", we'll automatically separate men and women into their respective directories based on the gender column values.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn"
                onClick={() => handleGenderSplit(false)}
                style={{ flex: 1 }}
              >
                No, Import to Single Directory
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleGenderSplit(true)}
                style={{ flex: 1 }}
              >
                Yes, Split Automatically
              </button>
            </div>
          </div>
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