// src/utils/profilePrintUtils.js
// Shared utility for generating printable profile HTML
// Used by Directory.jsx and TeamList.jsx for print profile functionality

export const ROLE_CONFIG = {
  team: [
    { name: 'Rector', key: 'Rector' },
    { name: 'BUR', key: 'BUR' },
    { name: 'Rover', key: 'Rover' },
    { name: 'Head', key: 'Head' },
    { name: 'Asst Head', key: 'Asst Head' },
    { name: 'Head Spiritual Director', key: 'Head Spiritual Director' },
    { name: 'Spiritual Director', key: 'Spiritual Director' },
    { name: 'Head Prayer', key: 'Head Prayer' },
    { name: 'Prayer', key: 'Prayer' },
    { name: 'Head Kitchen', key: 'Head Kitchen' },
    { name: 'Asst Head Kitchen', key: 'Asst Head Kitchen' },
    { name: 'Kitchen', key: 'Kitchen' },
    { name: 'Head Table', key: 'Head Table' },
    { name: 'Table', key: 'Table' },
    { name: 'Head Chapel', key: 'Head Chapel' },
    { name: 'Chapel', key: 'Chapel' },
    { name: 'Head Dorm', key: 'Head Dorm' },
    { name: 'Dorm', key: 'Dorm' },
    { name: 'Head Palanca', key: 'Head Palanca' },
    { name: 'Palanca', key: 'Palanca' },
    { name: 'Head Gopher', key: 'Head Gopher' },
    { name: 'Gopher', key: 'Gopher' },
    { name: 'Head Storeroom', key: 'Head Storeroom' },
    { name: 'Storeroom', key: 'Storeroom' },
    { name: 'Head Floater Supply', key: 'Head Floater Supply' },
    { name: 'Floater Supply', key: 'Floater Supply' },
    { name: 'Head Worship', key: 'Head Worship' },
    { name: 'Worship', key: 'Worship' },
    { name: 'Head Media', key: 'Head Media' },
    { name: 'Media', key: 'Media' }
  ],
  professor: [
    { name: 'Silent', key: 'Prof_Silent' },
    { name: 'Ideals', key: 'Prof_Ideals' },
    { name: 'Church', key: 'Prof_Church' },
    { name: 'Piety', key: 'Prof_Piety' },
    { name: 'Study', key: 'Prof_Study' },
    { name: 'Action', key: 'Prof_Action' },
    { name: 'Leaders', key: 'Prof_Leaders' },
    { name: 'Environments', key: 'Prof_Environments' },
    { name: 'CCIA', key: 'Prof_CCIA' },
    { name: 'Reunion', key: 'Prof_Reunion' }
  ]
};

/**
 * Complete embedded CSS for printing profiles
 * UPDATED: Changed grid-template-columns from 60% 15% 15% 10% to 70% 12% 13% 5%
 * Reason: Prevents long role names like "Head Spiritual Director" from wrapping
 */
export const PRINT_PROFILE_CSS = `
  body { 
    font-family: Arial, sans-serif; 
    margin: 0; 
    font-size: 10pt; 
    color: #333; 
    -webkit-print-color-adjust: exact; 
    print-color-adjust: exact; 
  }
  .page-container { 
    padding: 0.2in; 
  }
  .profile-main-info, 
  .roles-section { 
    page-break-inside: avoid; 
  }
  .profile-main-info { 
    background-color: #f8f9fa; 
    padding: 15px; 
    border-radius: 8px; 
    margin-bottom: 15px; 
    border: 1px solid #dee2e6; 
    position: relative;
  }
  .profile-header { 
    display: flex; 
    align-items: baseline; 
    flex-wrap: wrap; 
    margin-bottom: 10px; 
  }
  .profile-name { 
    font-size: 22pt; 
    font-weight: bold; 
    margin: 0 15px 0 0; 
  }
  .profile-weekend-info { 
    font-size: 0.8em; 
    font-weight: 600; 
    margin-left: 10px; 
  }
  .last-served-highlight { 
    background-color: #ffc107; 
    padding: 2px 6px; 
    border-radius: 3px; 
    font-weight: bold; 
    color: #333; 
  }
  .main-info-item { 
    margin: 4px 0; 
    display: flex; 
  }
  .main-info-label { 
    font-weight: bold; 
    width: 100px; 
    flex-shrink: 0; 
  }
  .roles-section { 
    margin-top: 15px; 
  }
  .roles-title { 
    font-weight: bold; 
    margin-bottom: 10px; 
    font-size: 14pt; 
    border-bottom: 2px solid #007bff; 
    padding-bottom: 5px; 
  }
  .role-grid { 
    display: grid; 
    grid-auto-flow: column; 
    gap: 10px; 
  }
  .team-grid { 
    grid-template-columns: repeat(3, 1fr); 
    grid-template-rows: repeat(10, auto); 
  }
  .professor-grid { 
    grid-template-columns: repeat(2, 1fr); 
    grid-template-rows: repeat(5, auto); 
  }
  .role-header-set { 
    display: grid; 
    grid-template-columns: 55% 16% 14% 10%; 
    gap: 2px; 
  }
  .role-header-legend { 
    display: grid; 
    grid-auto-flow: column; 
    gap: 10px; 
    margin-bottom: 5px; 
  }
  .role-header-legend.team-headers { 
    grid-template-columns: repeat(3, 1fr); 
  }
  .role-header-legend.professor-headers { 
    grid-template-columns: repeat(2, 1fr); 
  }
  .role-header-name, 
  .role-header-status, 
  .role-header-last, 
  .role-header-qty { 
    padding: 4px; 
    background-color: #495057; 
    color: white; 
    border-radius: 3px; 
    text-align: center; 
    font-size: 7pt; 
    font-weight: bold; 
    text-transform: uppercase; 
  }
  .role-header-name { 
    text-align: left; 
  }
  .role-item { 
    display: grid; 
    grid-template-columns: 55% 16% 14% 10%; 
    gap: 2px; 
    align-items: stretch; 
    margin-bottom: 2px; 
    min-height: 24px; 
    font-size: 7pt; 
  }
  .role-name, 
  .role-status-cell, 
  .role-last-cell, 
  .role-qty-cell { 
    padding: 4px; 
    background-color: #f8f9fa; 
    border-radius: 3px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
  }
  .role-name { 
    justify-content: flex-start; 
    font-weight: 600; 
  }
  .role-status { 
    display: inline-block; 
    width: 20px;
    height: 20px;
    padding: 3px 6px; 
    border-radius: 4px; 
    font-weight: bold; 
    font-size: 7pt; 
    text-align: center; 
    line-height: 14px;
  }
  .role-status.status-N { 
    background-color: #6c757d; 
    color: white; 
  }
  .role-status.status-I { 
    background-color: #ffc107; 
    color: #333; 
  }
  .role-status.status-E { 
    background-color: #28a745; 
    color: white; 
  }
  .service-number, 
  .quantity-number { 
    font-size: 7pt; 
    color: #495057; 
  }
  .legend { 
    display: flex; 
    gap: 15px; 
    margin-top: 10px; 
    margin-bottom: 15px; 
    font-size: 9pt; 
  }
  .legend-item { 
    display: flex; 
    align-items: center; 
    gap: 5px; 
  }
  .legend-color { 
    width: 16px; 
    height: 16px; 
    border-radius: 3px; 
    border: 1px solid #dee2e6; 
  }
  .legend-color.status-N { 
    background-color: #6c757d; 
  }
  .legend-color.status-I { 
    background-color: #ffc107; 
  }
  .legend-color.status-E { 
    background-color: #28a745; 
  }
  .rector-qualification-grid { 
    display: flex; 
    flex-direction: column; 
    gap: 4px; 
  }
  .qualification-labels { 
    display: flex; 
    justify-content: space-around; 
  }
  .qualification-label { 
    flex: 1; 
    text-align: center; 
    font-size: 8pt; 
    font-weight: 600; 
    color: #555; 
    padding: 0 4px; 
  }
  .segmented-bar-container { 
    display: flex; 
    width: 100%; 
    height: 12px; 
    border-radius: 6px; 
    overflow: hidden; 
    border: 1px solid #dee2e6; 
    background-color: #e9ecef; 
  }
  .bar-segment { 
    flex: 1; 
    height: 100%; 
  }
  .bar-segment.pass { 
    background-color: #28a745 !important; 
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
  }
  .bar-segment.fail { 
    background-color: #dc3545 !important; 
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
  }
  
  /* Do Not Call / Deceased styling */
  .profile-main-info.do-not-call {
    border-left: 30px solid #dc3545 !important;
    background-color: rgba(220, 53, 69, 0.05) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .profile-main-info.do-not-call::before {
    content: "DO NOT CALL" !important;
    position: absolute !important;
    left: -73px !important;
    top: 50% !important;
    transform: translateY(-50%) rotate(-90deg) !important;
    color: white !important;
    font-weight: bold !important;
    font-size: 14pt !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .profile-main-info.deceased {
    border-left: 30px solid #000000 !important;
    background-color: rgba(0, 0, 0, 0.05) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .profile-main-info.deceased::before {
    content: "DECEASED" !important;
    position: absolute !important;
    left: -73px !important;
    top: 50% !important;
    transform: translateY(-50%) rotate(-90deg) !important;
    color: white !important;
    font-weight: bold !important;
    font-size: 14pt !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
`;

/**
 * Generates complete printable HTML for a single profile
 * @param {Object} profile - The profile object from the database
 * @returns {string} - HTML string for printing
 */
export function generatePrintableProfileHTML(profile) {
  // Helper function to generate a role item
  const createRoleItemHTML = (displayName, status, serviceNumber, quantityNumber) => {
    const sanitizedStatus = (status || 'N').toUpperCase();
    return `
      <div class="role-item">
        <div class="role-name">${displayName}</div>
        <div class="role-status-cell">
          <span class="role-status status-${sanitizedStatus}">${sanitizedStatus}</span>
        </div>
        <div class="role-last-cell"><span class="service-number">${serviceNumber || ''}</span></div>
        <div class="role-qty-cell"><span class="quantity-number">${quantityNumber || ''}</span></div>
      </div>`;
  };

  // Helper to generate Rector Qualification Section
  const createRectorCriteriaHTML = (person) => {
    const speakingProfRoles = ROLE_CONFIG.professor.filter(r => r.key !== 'Prof_Silent').map(r => r.key);
    const allTeamRoles = ROLE_CONFIG.team.map(r => r.key);
    const hasHeadRole = (person['Head'] === 'E' || person['Asst Head'] === 'E');
    const hasKitchenHeadRole = (person['Head Kitchen'] === 'E' || person['Asst Head Kitchen'] === 'E');
    const experiencedProfRoles = ROLE_CONFIG.professor.map(r => r.key).filter(role => person[role] === 'E');
    const hasTwoProfRoles = experiencedProfRoles.length >= 2;
    const hasOneSpeakingRole = experiencedProfRoles.some(role => speakingProfRoles.includes(role));
    const hasProfRequirement = hasTwoProfRoles && hasOneSpeakingRole;
    const experiencedChaRoles = allTeamRoles.filter(role => person[role] === 'E');
    const hasTwoChaRoles = experiencedChaRoles.length >= 2;
    const hasCoreChaRole = experiencedChaRoles.some(role => ['Palanca', 'Chapel', 'Gopher'].includes(role));
    const hasChaRequirement = hasTwoChaRoles && hasCoreChaRole;

    return `
      <div class="card pad">
        <div class="roles-section">
          <div class="roles-title" style="margin-bottom: 12px;">Rector Qualification</div>
          <div class="rector-qualification-grid">
            <div class="qualification-labels">
              <div class="qualification-label">Head / Asst Head</div>
              <div class="qualification-label">Head / Asst Kitchen</div>
              <div class="qualification-label">2 Prof Roles (1 Speaking)</div>
              <div class="qualification-label">2 Cha Roles (1 Timed)</div>
            </div>
            <div class="segmented-bar-container">
              <div class="bar-segment ${hasHeadRole ? 'pass' : 'fail'}"></div>
              <div class="bar-segment ${hasKitchenHeadRole ? 'pass' : 'fail'}"></div>
              <div class="bar-segment ${hasProfRequirement ? 'pass' : 'fail'}"></div>
              <div class="bar-segment ${hasChaRequirement ? 'pass' : 'fail'}"></div>
            </div>
          </div>
        </div>
      </div>`;
  };

  // Generate HTML for Team Roles
  const teamRolesHTML = ROLE_CONFIG.team.map(role => {
    const status = profile[role.key];
    const serviceNumber = profile[`${role.key} Service`];
    const quantityNumber = profile[`${role.key.replace(/ /g, '_')}_Service_Qty`];
    return createRoleItemHTML(role.name, status, serviceNumber, quantityNumber);
  }).join('');

  // Generate HTML for Professor Roles
  const professorRolesHTML = ROLE_CONFIG.professor.map(role => {
    const status = profile[role.key];
    const serviceNumber = profile[`${role.key} Service`];
    const quantityNumber = profile[`${role.key}_Service_Qty`];
    return createRoleItemHTML(role.name, status, serviceNumber, quantityNumber);
  }).join('');

  const rectorCriteriaHTML = createRectorCriteriaHTML(profile);

  // Determine status classes for Do Not Call / Deceased
  const isDeceased = profile.Deceased === true || (profile.Deceased || '').toLowerCase() === 'y' || (profile.Deceased || '').toLowerCase() === 'yes';
  const isDoNotCall = profile.Do_Not_Call === true || (profile.Do_Not_Call || '').toLowerCase() === 'y' || (profile.Do_Not_Call || '').toLowerCase() === 'yes';
  let statusClasses = '';
  if (isDeceased) statusClasses = ' deceased';
  else if (isDoNotCall) statusClasses = ' do-not-call';

  // Build the complete profile HTML
  return `
    <div class="profile-main-info${statusClasses}">
      <div class="profile-header">
        <h2 class="profile-name">${profile.First || ''} ${profile.Last || ''}</h2>
        ${profile["Candidate Weekend"] ? `<span class="profile-weekend-info">Candidate: <span class="last-served-highlight">${profile["Candidate Weekend"]}</span></span>` : ''}
        ${profile["Last weekend worked"] ? `<span class="profile-weekend-info">Last Served: <span class="last-served-highlight">${profile["Last weekend worked"]}</span></span>` : ''}
      </div>
      <div class="main-info-item"><span class="main-info-label">Address:</span><span>${profile.Address || ''}, ${profile.City || ''}, ${profile.State || ''} ${profile.Zip || ''}</span></div>
      <div class="main-info-item"><span class="main-info-label">Church:</span><span>${profile.Church || 'N/A'}</span></div>
      <div class="main-info-item"><span class="main-info-label">Email:</span><span>${profile.Email || 'N/A'}</span></div>
      <div class="main-info-item"><span class="main-info-label">Phone:</span><span>${profile.Phone1 || 'N/A'}</span></div>
    </div>
    ${rectorCriteriaHTML}
    <div class="legend">
      <div class="legend-item"><div class="legend-color status-N"></div><span>N - Never Worked</span></div>
      <div class="legend-item"><div class="legend-color status-I"></div><span>I - Inexperienced</span></div>
      <div class="legend-item"><div class="legend-color status-E"></div><span>E - Experienced</span></div>
    </div>
    <div class="roles-section">
      <div class="roles-title">Team Roles</div>
      <div class="role-header-legend team-headers">
        ${Array(3).fill('<div class="role-header-set"><div class="role-header-name">Role</div><div class="role-header-status">Status</div><div class="role-header-last">Last</div><div class="role-header-qty">Qty</div></div>').join('')}
      </div>
      <div class="role-grid team-grid">${teamRolesHTML}</div>
    </div>
    <div class="roles-section">
      <div class="roles-title">Professor Roles</div>
      <div class="role-header-legend professor-headers">
        ${Array(2).fill('<div class="role-header-set"><div class="role-header-name">Role</div><div class="role-header-status">Status</div><div class="role-header-last">Last</div><div class="role-header-qty">Qty</div></div>').join('')}
      </div>
      <div class="role-grid professor-grid">${professorRolesHTML}</div>
    </div>
  `;
}