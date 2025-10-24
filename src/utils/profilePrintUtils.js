// src/utils/profilePrintUtils.js
// Shared utility for generating printable profile HTML
// Used by Directory.jsx and TeamList.jsx

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