// src/modules/TeamViewer/Directory.jsx
// UPDATED: Added sliding role selector panel + active team management

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const ROLE_CONFIG = {
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

export default function Directory() {
  const { orgId } = useAuth();
  
  const { allPescadores, loading, refreshData } = usePescadores();
  
  const [filteredPescadores, setFilteredPescadores] = useState([]);
  const [currentGender, setCurrentGender] = useState('men');
  const [nameFormat, setNameFormat] = useState('firstLast');
  const [searchTerm, setSearchTerm] = useState('');
  const [primaryFilter, setPrimaryFilter] = useState('');
  const [secondarySort, setSecondarySort] = useState('alpha-asc');
  const [currentView, setCurrentView] = useState('directory');
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(-1);
  
  // Team management state
  const [activeTeamIdentifier, setActiveTeamIdentifier] = useState('');
  const [activeTeamRoster, setActiveTeamRoster] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  
  // Role selector panel state
  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);

  const primaryDropdownRef = useRef(null);
  const secondaryDropdownRef = useRef(null);

  useEffect(() => {
    performSearch();
  }, [allPescadores, currentGender, searchTerm, primaryFilter, secondarySort]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (primaryDropdownRef.current && !primaryDropdownRef.current.contains(event.target)) {
        primaryDropdownRef.current.classList.remove('open');
      }
      if (secondaryDropdownRef.current && !secondaryDropdownRef.current.contains(event.target)) {
        secondaryDropdownRef.current.classList.remove('open');
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (orgId && activeTeamIdentifier) {
      const genderFromIdentifier = activeTeamIdentifier.toLowerCase().includes('men') ? 'men' : 'women';
      if (genderFromIdentifier !== currentGender) {
        setActiveTeamIdentifier('');
        setActiveTeamRoster([]);
      }
    }
  }, [currentGender, activeTeamIdentifier, orgId]);

  function performSearch() {
    let data = [...allPescadores[currentGender]];
    data.forEach(p => delete p.searchMatch);

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const serviceKeys = [
        ...ROLE_CONFIG.team.map(r => ({ dbKey: `${r.key} Service`, displayName: r.name })),
        ...ROLE_CONFIG.professor.map(r => ({ dbKey: `${r.key} Service`, displayName: r.name }))
      ];

      data = data.filter(p => {
        const searchableName = `${p.First || ''} ${p.Last || ''} ${p.Preferred || ''}`.toLowerCase();
        if (searchableName.includes(searchLower)) {
          return true;
        }

        const candidateWeekend = (p["Candidate Weekend"] || '').toString().toLowerCase();
        if (candidateWeekend.includes(searchLower)) {
          p.searchMatch = { type: 'candidate' };
          return true;
        }

        for (const role of serviceKeys) {
          const serviceValue = (p[role.dbKey] || '').toString().toLowerCase();
          if (serviceValue.includes(searchLower)) {
            p.searchMatch = { type: 'service', role: role.displayName };
            return true;
          }
        }

        return false;
      });
    }

    switch (primaryFilter) {
      case 'recent':
        break;
      case 'never-served':
        data = data.filter(p => !p["Last weekend worked"]);
        break;
      case 'rector-qualified':
        data = data.filter(p => 
          getRectorQualificationStatus(p) === 4 && 
          p['Rector'] !== 'E'
        );
        break;
      case 'rector-qualified-minus-1':
        data = data.filter(p => getRectorQualificationStatus(p) === 3);
        break;
      case 'rector-qualified-minus-2':
        data = data.filter(p => getRectorQualificationStatus(p) === 2);
        break;
      case 'head-asst-head-qualified':
        data = data.filter(p => p['Head'] === 'E' || p['Asst Head'] === 'E');
        break;
      case 'kitchen-qualified':
        data = data.filter(p => p['Head Kitchen'] === 'E' || p['Asst Head Kitchen'] === 'E');
        break;
      case 'bur-qualified':
        data = data.filter(p => p['BUR'] === 'E');
        break;
      case 'dorm-qualified':
        data = data.filter(p => p['Head Dorm'] === 'E');
        break;
      case 'prayer-qualified':
        data = data.filter(p => p['Head Prayer'] === 'E');
        break;
      case 'chapel-qualified':
        data = data.filter(p => p['Head Chapel'] === 'E');
        break;
      case 'table-qualified':
        data = data.filter(p => p['Head Table'] === 'E');
        break;
      case 'worship-qualified':
        data = data.filter(p => p['Head Worship'] === 'E');
        break;
      case 'palanca-qualified':
        data = data.filter(p => p['Head Palanca'] === 'E');
        break;
      case 'gopher-qualified':
        data = data.filter(p => p['Head Gopher'] === 'E');
        break;
      case 'storeroom-qualified':
        data = data.filter(p => p['Head Storeroom'] === 'E');
        break;
      case 'floater-supply-qualified':
        data = data.filter(p => p['Head Floater Supply'] === 'E');
        break;
      case 'spiritual-director-qualified':
        data = data.filter(p => p['Spiritual Director'] === 'E');
        break;
      case 'role-rector-e':
        data = data.filter(p => p['Rector'] === 'E');
        break;
    }

    const parseWeekendNumber = (str) => {
      if (!str) return 0;
      const match = str.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    };

    if (primaryFilter === 'recent') {
      data.sort((a, b) => {
        const aVal = a["Last weekend worked"] || '';
        const bVal = b["Last weekend worked"] || '';
        return bVal.localeCompare(aVal);
      });
    } else if (searchTerm) {
      data.sort((a, b) => {
        const aIsCandidate = a.searchMatch?.type === 'candidate';
        const bIsCandidate = b.searchMatch?.type === 'candidate';
        
        if (aIsCandidate && !bIsCandidate) return -1;
        if (!aIsCandidate && bIsCandidate) return 1;
        
        if (a.searchMatch?.type === 'service' && b.searchMatch?.type === 'service') {
          const aRole = a.searchMatch.role;
          const bRole = b.searchMatch.role;
          
          const teamRoleOrder = ROLE_CONFIG.team.map(r => r.name);
          const professorRoleOrder = ROLE_CONFIG.professor.map(r => r.name);
          
          const aTeamIndex = teamRoleOrder.indexOf(aRole);
          const bTeamIndex = teamRoleOrder.indexOf(bRole);
          const aProfIndex = professorRoleOrder.indexOf(aRole);
          const bProfIndex = professorRoleOrder.indexOf(bRole);
          
          if (aTeamIndex !== -1 && bTeamIndex !== -1) {
            return aTeamIndex - bTeamIndex;
          }
          if (aProfIndex !== -1 && bProfIndex !== -1) {
            return aProfIndex - bProfIndex;
          }
          if (aTeamIndex !== -1 && bProfIndex !== -1) return -1;
          if (aProfIndex !== -1 && bTeamIndex !== -1) return 1;
        }
        
        return (a.Last || '').localeCompare(b.Last || '');
      });
    } else {
      switch (secondarySort) {
        case 'alpha-asc':
          data.sort((a, b) => (a.Last || '').localeCompare(b.Last || ''));
          break;
        case 'alpha-desc':
          data.sort((a, b) => (b.Last || '').localeCompare(a.Last || ''));
          break;
        case 'weekend-desc':
          data.sort((a, b) => parseWeekendNumber(b["Last weekend worked"]) - parseWeekendNumber(a["Last weekend worked"]));
          break;
        case 'weekend-asc':
          data.sort((a, b) => parseWeekendNumber(a["Last weekend worked"]) - parseWeekendNumber(b["Last weekend worked"]));
          break;
      }
    }

    setFilteredPescadores(data);
  }

  function getRectorQualificationStatus(person) {
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

    let count = 0;
    if (hasHeadRole) count++;
    if (hasKitchenHeadRole) count++;
    if (hasProfRequirement) count++;
    if (hasChaRequirement) count++;
    return count;
  }

  async function handleManageLatestWeekend() {
    setLoadingTeam(true);
    try {
      const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
      
      const { data: teams, error } = await supabase
        .from(rosterTable)
        .select('weekend_identifier')
        .eq('org_id', orgId);
      
      if (error) throw error;

      const prefix = currentGender.charAt(0).toUpperCase() + currentGender.slice(1) + "'s ";
      let latest = { number: 0, identifier: null };

      (teams || []).forEach(team => {
        const idStr = (team.weekend_identifier || '').trim();
        if (idStr.startsWith(prefix)) {
          const num = parseInt(idStr.match(/\d+/)?.[0] || '0', 10);
          if (num > latest.number) {
            latest = { number: num, identifier: idStr };
          }
        }
      });

      if (latest.identifier) {
        const { data: roster, error: rosterError } = await supabase
          .from(rosterTable)
          .select('*')
          .eq('weekend_identifier', latest.identifier)
          .eq('org_id', orgId);
        
        if (rosterError) throw rosterError;

        setActiveTeamIdentifier(latest.identifier);
        setActiveTeamRoster(roster || []);
        window.showMainStatus(`Loaded ${latest.identifier} - ${(roster || []).length} members`, false);
      } else {
        window.showMainStatus(`No ${currentGender}'s team found. Create one in Team List first.`, true);
      }
    } catch (error) {
      console.error('Error loading latest team:', error);
      window.showMainStatus(`Error loading team: ${error.message}`, true);
    } finally {
      setLoadingTeam(false);
    }
  }

  async function assignRole(roleName) {
    if (!activeTeamIdentifier) {
      window.showMainStatus('Please load a team first using "Manage Latest Weekend"', true);
      return;
    }

    if (!currentProfile) return;

    const existing = activeTeamRoster.find(
      m => m.pescadore_key === currentProfile.PescadoreKey && m.role === roleName
    );
    
    if (existing) {
      window.showMainStatus(
        `${currentProfile.Preferred || currentProfile.First} is already assigned as ${roleName}`,
        true
      );
      return;
    }

    try {
      const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
      
      const { data, error } = await supabase
        .from(rosterTable)
        .insert({
          weekend_identifier: activeTeamIdentifier,
          role: roleName,
          pescadore_key: currentProfile.PescadoreKey,
          org_id: orgId
        })
        .select();
      
      if (error) throw error;

      setActiveTeamRoster([...activeTeamRoster, data[0]]);
      
      window.showMainStatus(
        `${currentProfile.Preferred || currentProfile.First} added as ${roleName}`,
        false
      );
    } catch (error) {
      console.error('Error assigning role:', error);
      window.showMainStatus(`Error: ${error.message}`, true);
    }
  }

  function getRoleCount(roleName) {
    return activeTeamRoster.filter(m => m.role === roleName).length;
  }

  function handleSearch() {
    performSearch();
  }

  function handleClear() {
    setSearchTerm('');
    setPrimaryFilter('');
    setSecondarySort('alpha-asc');
  }

  function showProfile(index) {
    setCurrentProfileIndex(index);
    setCurrentProfile(filteredPescadores[index]);
    setCurrentView('profile');
  }

  function showDirectory() {
    setCurrentView('directory');
    setCurrentProfile(null);
    setCurrentProfileIndex(-1);
    setRoleSelectorOpen(false);
  }

  function navigateProfile(direction) {
    const newIndex = currentProfileIndex + direction;
    if (newIndex >= 0 && newIndex < filteredPescadores.length) {
      setCurrentProfileIndex(newIndex);
      setCurrentProfile(filteredPescadores[newIndex]);
    }
  }

  function openRoleSelector() {
    console.log('openRoleSelector called, activeTeamIdentifier:', activeTeamIdentifier);
    if (!activeTeamIdentifier) {
      window.showMainStatus('Please load a team first using "Manage Latest Weekend"', true);
      return;
    }
    console.log('Setting roleSelectorOpen to true');
    setRoleSelectorOpen(true);
  }

  function closeRoleSelector() {
    setRoleSelectorOpen(false);
  }

  function toggleDropdown(ref) {
    const dropdown = ref.current;
    if (!dropdown) return;
    
    const btn = dropdown.querySelector('.dropdown-btn');
    if (btn && btn.classList.contains('disabled')) return;

    if (ref === primaryDropdownRef && secondaryDropdownRef.current) {
      secondaryDropdownRef.current.classList.remove('open');
    } else if (ref === secondaryDropdownRef && primaryDropdownRef.current) {
      primaryDropdownRef.current.classList.remove('open');
    }

    dropdown.classList.toggle('open');
  }

  function selectPrimaryFilter(value) {
    setPrimaryFilter(value);
    if (primaryDropdownRef.current) {
      primaryDropdownRef.current.classList.remove('open');
    }
  }

  function selectSecondarySort(value) {
    setSecondarySort(value);
    if (secondaryDropdownRef.current) {
      secondaryDropdownRef.current.classList.remove('open');
    }
  }

  function getPrimaryFilterLabel() {
    const labels = {
      '': 'None (Default Sort)',
      'recent': 'Most Recently Served',
      'never-served': 'Never Served',
      'rector-qualified': 'Rector Qualified',
      'rector-qualified-minus-1': 'Rector Qualified (Minus 1)',
      'rector-qualified-minus-2': 'Rector Qualified (Minus 2)',
      'head-asst-head-qualified': 'Head / Asst Head Qualified',
      'kitchen-qualified': 'Head / Asst Kitchen Qualified',
      'bur-qualified': 'BUR Qualified',
      'dorm-qualified': 'Head Dorm Qualified',
      'prayer-qualified': 'Head Prayer Qualified',
      'chapel-qualified': 'Head Chapel Qualified',
      'table-qualified': 'Head Table Qualified',
      'worship-qualified': 'Head Worship Qualified',
      'palanca-qualified': 'Head Palanca Qualified',
      'gopher-qualified': 'Head Gopher Qualified',
      'storeroom-qualified': 'Head Storeroom Qualified',
      'floater-supply-qualified': 'Head Floater Supply Qualified',
      'spiritual-director-qualified': 'Spiritual Director Qualified',
      'role-rector-e': 'Experienced Rector'
    };
    return labels[primaryFilter] || 'Select Primary Filter...';
  }

  function getSecondarySortLabel() {
    switch (secondarySort) {
      case 'alpha-asc': return 'Last Name (A-Z)';
      case 'alpha-desc': return 'Last Name (Z-A)';
      case 'weekend-desc': return 'Weekend # (High-Low)';
      case 'weekend-asc': return 'Weekend # (Low-High)';
      default: return 'Select Sort Order...';
    }
  }

  if (loading) {
  return (
    <section id="team-viewer-app" className="app-panel" style={{ 
  display: 'block',
  height: '100%',
  overflow: 'hidden'
}}>
  <div className="container" style={{
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px'
  }}>
        <SkeletonLoader />
      </div>
    </section>
  );
}

  return (
  <section id="team-viewer-app" className="app-panel" style={{ 
    display: 'block',
    height: '100vh',
    overflow: 'hidden'
  }}>
    <div className="container" style={{
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '0px'
    }}>
      
      {currentView === 'directory' && (
          <div id="directoryView" className="directory-container">
            <div className="card">
              <div className="controls-main-grid">
                <div className="controls-left-panel">
                  <div className="search-group">
                    <label className="label">Search By</label>
                    <div className="search-input-group">
                      <input
                        type="text"
                        id="nameSearch"
                        className="search-input"
                        placeholder="First, Last or Weekend Number"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button className="search-button" onClick={handleSearch}>Search</button>
                    </div>
                  </div>
                  <div className="search-group">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label className="label">Primary Filter</label>
                        <div 
                          ref={primaryDropdownRef}
                          id="primaryFilterDropdown"
                          className="dropdown-container"
                          data-selected-value={primaryFilter}
                        >
                          <button 
                            className="dropdown-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(primaryDropdownRef);
                            }}
                          >
                            {getPrimaryFilterLabel()}
                          </button>
                          <div className="dropdown-content">
                            <a href="#" className={primaryFilter === '' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter(''); }}>None (Default Sort)</a>
                            <a href="#" className={primaryFilter === 'recent' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('recent'); }}>Most Recently Served</a>
                            <a href="#" className={primaryFilter === 'never-served' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('never-served'); }}>Never Served</a>
                            <div className="dropdown-divider"></div>
                            <a href="#" className={primaryFilter === 'rector-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('rector-qualified'); }}>Rector Qualified</a>
                            <a href="#" className={primaryFilter === 'rector-qualified-minus-1' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('rector-qualified-minus-1'); }}>Rector Qualified (Minus 1)</a>
                            <a href="#" className={primaryFilter === 'rector-qualified-minus-2' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('rector-qualified-minus-2'); }}>Rector Qualified (Minus 2)</a>
                            <div className="dropdown-divider"></div>
                            <a href="#" className={primaryFilter === 'head-asst-head-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('head-asst-head-qualified'); }}>Head / Asst Head Qualified</a>
                            <a href="#" className={primaryFilter === 'kitchen-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('kitchen-qualified'); }}>Head / Asst Kitchen Qualified</a>
                            <a href="#" className={primaryFilter === 'bur-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('bur-qualified'); }}>BUR Qualified</a>
                            <a href="#" className={primaryFilter === 'dorm-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('dorm-qualified'); }}>Head Dorm Qualified</a>
                            <a href="#" className={primaryFilter === 'prayer-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('prayer-qualified'); }}>Head Prayer Qualified</a>
                            <a href="#" className={primaryFilter === 'chapel-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('chapel-qualified'); }}>Head Chapel Qualified</a>
                            <a href="#" className={primaryFilter === 'table-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('table-qualified'); }}>Head Table Qualified</a>
                            <a href="#" className={primaryFilter === 'worship-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('worship-qualified'); }}>Head Worship Qualified</a>
                            <a href="#" className={primaryFilter === 'palanca-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('palanca-qualified'); }}>Head Palanca Qualified</a>
                            <a href="#" className={primaryFilter === 'gopher-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('gopher-qualified'); }}>Head Gopher Qualified</a>
                            <a href="#" className={primaryFilter === 'storeroom-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('storeroom-qualified'); }}>Head Storeroom Qualified</a>
                            <a href="#" className={primaryFilter === 'floater-supply-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('floater-supply-qualified'); }}>Head Floater Supply Qualified</a>
                            <div className="dropdown-divider"></div>
                            <a href="#" className={primaryFilter === 'spiritual-director-qualified' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('spiritual-director-qualified'); }}>Spiritual Director Qualified</a>
                            <div className="dropdown-divider"></div>
                            <a href="#" className={primaryFilter === 'role-rector-e' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectPrimaryFilter('role-rector-e'); }}>Experienced Rector</a>
                          </div>
                        </div>
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label className="label">Secondary Sort</label>
                        <div 
                          ref={secondaryDropdownRef}
                          id="secondarySortDropdown"
                          className="dropdown-container"
                          data-selected-value={secondarySort}
                        >
                          <button 
                            className={`dropdown-btn ${primaryFilter === 'recent' ? 'disabled' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(secondaryDropdownRef);
                            }}
                          >
                            {getSecondarySortLabel()}
                          </button>
                          <div className="dropdown-content">
                            <a href="#" className={secondarySort === 'alpha-asc' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectSecondarySort('alpha-asc'); }}>Last Name (A-Z)</a>
                            <a href="#" className={secondarySort === 'alpha-desc' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectSecondarySort('alpha-desc'); }}>Last Name (Z-A)</a>
                            <a href="#" className={secondarySort === 'weekend-desc' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectSecondarySort('weekend-desc'); }}>Weekend # (High-Low)</a>
                            <a href="#" className={secondarySort === 'weekend-asc' ? 'selected' : ''} onClick={(e) => { e.preventDefault(); selectSecondarySort('weekend-asc'); }}>Weekend # (Low-High)</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="controls-right-panel">
                  <label className="label">Select Team</label>
                  <div className="toggle-inset-container" id="genderToggleContainer">
                    <div 
                      className={`toggle-inset-option ${currentGender === 'men' ? 'active' : ''}`}
                      onClick={() => setCurrentGender('men')}
                    >
                      Men
                    </div>
                    <div 
                      className={`toggle-inset-option ${currentGender === 'women' ? 'active' : ''}`}
                      onClick={() => setCurrentGender('women')}
                    >
                      Women
                    </div>
                  </div>
                  <label className="label">Display Options</label>
                  <div className="toggle-inset-container" id="nameFormatToggle">
                    <div 
                      className={`toggle-inset-option ${nameFormat === 'firstLast' ? 'active' : ''}`}
                      onClick={() => setNameFormat('firstLast')}
                    >
                      First / Last
                    </div>
                    <div 
                      className={`toggle-inset-option ${nameFormat === 'lastFirst' ? 'active' : ''}`}
                      onClick={() => setNameFormat('lastFirst')}
                    >
                      Last / First
                    </div>
                  </div>
                  <div className="utility-buttons">
                    <button className="clear-button" onClick={handleClear}>Clear</button>
                    <button className="print-button">Print Report</button>
                    <button 
                      className="view-team-button" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={handleManageLatestWeekend}
                      disabled={loadingTeam}
                    >
                      {loadingTeam ? 'Loading...' : 'Manage Latest Weekend'}
                      {activeTeamRoster.length > 0 && (
                        <span className="team-count-badge" style={{ display: 'inline-block' }}>
                          {activeTeamRoster.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="card pad">
              <div className="directory-header">
                <h2 className="directory-title" id="directoryTitle">
                  {activeTeamIdentifier ? `Directory - ${activeTeamIdentifier}` : 'Directory'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="directory-count">
                    Total Candidates: <strong>{filteredPescadores.filter(p => p.searchMatch?.type === 'candidate').length}</strong>
                  </span>
                  <span className="directory-count">
                    Total Team: <strong>{filteredPescadores.filter(p => p.searchMatch?.type === 'service').length}</strong>
                  </span>
                  <span className="directory-count" id="directoryCount">{filteredPescadores.length} results</span>
                </div>
              </div>
              {(() => {
                const rowsNeeded = Math.ceil(filteredPescadores.length / 5);
                
                return (
                  <div 
                    className="names-grid" 
                    id="namesGrid"
                    style={{ 
                      gridTemplateRows: `repeat(${rowsNeeded}, auto)`,
                      gridAutoFlow: 'column'
                    }}
                  >
                    {filteredPescadores.length === 0 ? (
                      <div className="loading">No results found.</div>
                    ) : (
                      filteredPescadores.map((person, index) => {
                        const displayName = nameFormat === 'firstLast'
                          ? `${person.Preferred || person.First || ''} ${person.Last || ''}`
                          : `${person.Last || ''}, ${person.Preferred || person.First || ''}`;

                        const hasSearchMatch = person.searchMatch;
                        const showFilterBadge = primaryFilter && !hasSearchMatch;
                        
                        return (
                          <div 
                            key={person.PescadoreKey || index}
                            className={`name-box ${hasSearchMatch || showFilterBadge ? 'enhanced-search-result' : ''}`}
                            onClick={() => showProfile(index)}
                          >
                            {hasSearchMatch ? (
                              <>
                                <div className="name-section">{displayName.trim()}</div>
                                <div className={`search-match-badge ${person.searchMatch.type}`}>
                                  {person.searchMatch.type === 'candidate' ? 
                                    `Candidate: ${person["Candidate Weekend"]}` :
                                    `Served: ${person.searchMatch.role}`
                                  }
                                </div>
                              </>
                            ) : showFilterBadge ? (
                              <>
                                <div className="name-section">{displayName.trim()}</div>
                                <div className="search-match-badge filter">
                                  {getPrimaryFilterLabel()}
                                </div>
                              </>
                            ) : (
                              displayName.trim()
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {currentView === 'profile' && currentProfile && (
          <ProfileView 
            profile={currentProfile}
            index={currentProfileIndex}
            total={filteredPescadores.length}
            onBack={showDirectory}
            onNavigate={navigateProfile}
            getRectorQualificationStatus={getRectorQualificationStatus}
            activeTeamIdentifier={activeTeamIdentifier}
            roleSelectorOpen={roleSelectorOpen}
            onOpenRoleSelector={openRoleSelector}
            onCloseRoleSelector={closeRoleSelector}
            onAssignRole={assignRole}
            getRoleCount={getRoleCount}
          />
        )}

      </div>
    </section>
  );
}

function ProfileView({ 
  profile, 
  index, 
  total, 
  onBack, 
  onNavigate, 
  getRectorQualificationStatus,
  activeTeamIdentifier,
  roleSelectorOpen,
  onOpenRoleSelector,
  onCloseRoleSelector,
  onAssignRole,
  getRoleCount
}) {
  const isDeceased = profile.Deceased === true || (profile.Deceased || '').toLowerCase() === 'y' || (profile.Deceased || '').toLowerCase() === 'yes';
  const isDoNotCall = profile.Do_Not_Call === true || (profile.Do_Not_Call || '').toLowerCase() === 'y' || (profile.Do_Not_Call || '').toLowerCase() === 'yes';
  const isSpiritualDirector = (profile['Spiritual Director'] || 'N').toUpperCase() === 'E';
  const fullName = `${profile.Preferred || profile.First || ''} ${profile.Last || ''}`.trim();
  const legalName = profile.First !== profile.Preferred && profile.Preferred ? profile.First : null;
  // ===== PHASE 1: Edit Mode State =====
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // ===== PHASE 2: Edited Profile State =====
  const [editedProfile, setEditedProfile] = useState(null);
  
  const EDIT_PASSWORD = 'edit';
  
  const handleRequestEdit = () => {
    setShowPasswordModal(true);
    setPasswordError(false);
  };
  
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError(false);
  };
  
  const handleCheckPassword = () => {
    if (passwordInput === EDIT_PASSWORD) {
      handleClosePasswordModal();
      // Clone profile into editedProfile when entering edit mode
      setEditedProfile({ ...profile });
      setIsEditMode(true);
    } else {
      setPasswordError(true);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedProfile(null); // Discard all changes
  };
  
  // ===== PHASE 2: Field Change Handler =====
  const handleFieldChange = (fieldName, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  const handleSaveChanges = () => {
    window.showMainStatus('Save functionality coming in Phase 2!');
    setIsEditMode(false);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCheckPassword();
    }
  };
  

  return (
    <div id="profileView" className="profile-view" style={{ 
    display: 'block',
    height: 'calc(100vh - 48px)', /* ← Full height minus padding */
    overflowY: 'auto', /* ← Make THIS the scroll container */
    paddingBottom: '40px'
  }}>
      <div className="navigation" style={{ marginTop: 0, marginBottom: '16px' }}>
        <button className="back-button" onClick={onBack}>← Back to Directory</button>
        <div className="nav-controls">
          <button 
            id="prevButton" 
            className="nav-button" 
            onClick={() => onNavigate(-1)}
            disabled={index === 0}
          >
            Previous
          </button>
          <span id="profileCounter" className="profile-counter">
            {index + 1} of {total}
          </span>
          <button 
            id="nextButton" 
            className="nav-button" 
            onClick={() => onNavigate(1)}
            disabled={index === total - 1}
          >
            Next
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="print-button" onClick={() => window.print()}>Print Profile</button>
          <button 
            className="view-team-button" 
            onClick={onOpenRoleSelector}
          >
            Add to Team
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '16px',
        alignItems: 'flex-start'
      }}>
        <div 
          style={{ 
            width: roleSelectorOpen ? '70%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div id="profileContainer" className="profile-container">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '16px' }}>
              <div className={`card pad profile-main-info${isEditMode ? ' edit-mode' : ''}`} style={{ position: 'relative' }}>
                <div className="profile-header">
                  {!isEditMode ? (
                    // VIEW MODE: Display name as before
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <h2 className="profile-name">{fullName}</h2>
                      {legalName && (
                        <span className="legal-name-badge">Legal: {legalName}</span>
                      )}
                      {(profile["Candidate Weekend"] || profile["Last weekend worked"]) && (
                        <span className="name-separator"></span>
                      )}
                      {profile["Candidate Weekend"] && (
                        <span className="profile-weekend-info">
                          Candidate: <span className="last-served-highlight">{profile["Candidate Weekend"]}</span>
                        </span>
                      )}
                      {profile["Last weekend worked"] && (
                        <span className="profile-weekend-info">
                          Last Served: <span className="last-served-highlight">{profile["Last weekend worked"]}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    // EDIT MODE: Show name input fields
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <label className="main-info-label" style={{ display: 'block', marginBottom: '4px' }}>First Name:</label>
                        <input
                          type="text"
                          className="editable-field"
                          value={editedProfile?.First || ''}
                          onChange={(e) => handleFieldChange('First', e.target.value)}
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label className="main-info-label" style={{ display: 'block', marginBottom: '4px' }}>Preferred Name:</label>
                        <input
                          type="text"
                          className="editable-field"
                          value={editedProfile?.Preferred || ''}
                          onChange={(e) => handleFieldChange('Preferred', e.target.value)}
                          placeholder="Preferred Name"
                        />
                      </div>
                      <div>
                        <label className="main-info-label" style={{ display: 'block', marginBottom: '4px' }}>Last Name:</label>
                        <input
                          type="text"
                          className="editable-field"
                          value={editedProfile?.Last || ''}
                          onChange={(e) => handleFieldChange('Last', e.target.value)}
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
                <div className="main-info-item">
                  <span className="main-info-label">Address:</span>
                  <span className="main-info-value">
                    {profile.Address || ''}, {profile.City || ''}, {profile.State || ''} {profile.Zip || ''}
                  </span>
                </div>
                <div className="main-info-item">
                  <span className="main-info-label">Church:</span>
                  <span className="main-info-value">{profile.Church || 'N/A'}</span>
                </div>
                <div className="main-info-item">
                  <span className="main-info-label">Email:</span>
                  <span className="main-info-value">{profile.Email || 'N/A'}</span>
                </div>
                <div className="main-info-item">
                  <span className="main-info-label">Phone:</span>
                  <span className="main-info-value">{profile.Phone1 || 'N/A'}</span>
                </div>
                
                {/* Floating status badge - matches Rector badge style */}
                {(isDeceased || isDoNotCall || isSpiritualDirector) && (
                  <div style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    bottom: '24px',
                    width: '122px',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${isDeceased ? '#000000' : isDoNotCall ? '#dc3545' : '#28a745'}`,
                    backgroundColor: 'transparent',
                    color: '#333',
                    boxShadow: isDeceased ? '0 0 10px rgba(0, 0, 0, 0.4)' : isDoNotCall ? '0 0 10px rgba(220, 53, 69, 0.4)' : '0 0 10px rgba(40, 167, 69, 0.4)',
                    cursor: 'default',
                    transition: 'all 0.2s ease',
                    zIndex: 10,
                    lineHeight: '1.3'
                  }}>
                    {isDeceased ? 'DECEASED' : isDoNotCall ? 'DO NOT CALL' : 'SPIRITUAL DIRECTOR'}
                  </div>
                )}
              </div>

              <RectorQualificationCard profile={profile} getRectorQualificationStatus={getRectorQualificationStatus} />
            </div>
            <TeamRolesCard profile={profile} />
            <ProfessorRolesCard profile={profile} />
          </div>

          {!isEditMode && (
  <div style={{ marginTop: '16px', textAlign: 'center' }}>
    <button 
      id="editButton" 
      className="edit-button"
      onClick={handleRequestEdit}
    >
      Edit Profile
    </button>
  </div>
)}

{isEditMode && (
  <div className="save-cancel-buttons" style={{ 
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '20px'
  }}>
    <button 
      className="cancel-button"
      onClick={handleCancelEdit}
    >
      Cancel
    </button>
    <button 
      className="save-button"
      onClick={handleSaveChanges}
    >
      Save Changes
    </button>
  </div>
)}
        </div>

        {roleSelectorOpen && (
          <div 
            className="card pad role-selector-slide-in"
            style={{
              width: '30%',
              minWidth: 0,
              height: 'fit-content',
              position: 'sticky',
              top: '16px'
            }}
          >
            <RoleSelectorPanel 
              onClose={onCloseRoleSelector}
              onAssignRole={onAssignRole}
              getRoleCount={getRoleCount}
              activeTeamIdentifier={activeTeamIdentifier}
            />
          </div>
        )}
      </div>
      
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal" style={{
          display: 'block',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000
        }}>
          <div className="password-modal-content" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            width: '95%',
            maxWidth: '400px'
          }}>
            <h3 style={{ 
              marginBottom: '20px',
              color: '#333',
              fontSize: '1.5rem'
            }}>
              Enter Password to Edit
            </h3>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter password"
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                border: `2px solid ${passwordError ? '#dc3545' : '#ccc'}`,
                borderRadius: '4px',
                fontSize: '16px',
                marginBottom: '10px'
              }}
            />
            {passwordError && (
              <p style={{
                color: '#dc3545',
                fontSize: '14px',
                marginBottom: '15px'
              }}>
                Incorrect password. Please try again.
              </p>
            )}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleClosePasswordModal}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckPassword}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleSelectorPanel({ onClose, onAssignRole, getRoleCount, activeTeamIdentifier }) {
  const teamRowsNeeded = Math.ceil(ROLE_CONFIG.team.length / 4);
  const profRowsNeeded = Math.ceil(ROLE_CONFIG.professor.length / 4);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Assign Role</h3>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--muted)',
            lineHeight: '1',
            padding: '0',
            width: '24px',
            height: '24px'
          }}
        >
          ×
        </button>
      </div>

      {activeTeamIdentifier && (
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--muted)', 
          marginBottom: '16px',
          padding: '8px',
          background: 'var(--surface)',
          borderRadius: '6px'
        }}>
          Adding to: <strong>{activeTeamIdentifier}</strong>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.9rem', 
          fontWeight: '600',
          color: 'var(--ink)'
        }}>
          Team Roles
        </h4>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: `repeat(${teamRowsNeeded}, auto)`,
            gridAutoFlow: 'column',
            gap: '8px'
          }}
        >
          {ROLE_CONFIG.team.map(role => {
            const count = getRoleCount(role.name);
            return (
              <button
                key={role.key}
                onClick={() => onAssignRole(role.name)}
                style={{
                  padding: '8px 10px',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--accentB)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <span style={{ flex: '1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {role.name}
                </span>
                {count > 0 && (
                  <span style={{
                    background: '#2ea44f',
                    color: 'white',
                    borderRadius: '999px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    minWidth: '20px',
                    textAlign: 'center'
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.9rem', 
          fontWeight: '600',
          color: 'var(--ink)'
        }}>
          Professor Roles
        </h4>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: `repeat(${profRowsNeeded}, auto)`,
            gridAutoFlow: 'column',
            gap: '8px'
          }}
        >
          {ROLE_CONFIG.professor.map(role => {
            const count = getRoleCount(role.name);
            return (
              <button
                key={role.key}
                onClick={() => onAssignRole(role.name)}
                style={{
                  padding: '8px 10px',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--accentB)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <span style={{ flex: '1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {role.name}
                </span>
                {count > 0 && (
                  <span style={{
                    background: '#2ea44f',
                    color: 'white',
                    borderRadius: '999px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    minWidth: '20px',
                    textAlign: 'center'
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RectorQualificationCard({ profile, getRectorQualificationStatus }) {
  const speakingProfRoles = ROLE_CONFIG.professor.filter(r => r.key !== 'Prof_Silent').map(r => r.key);
  const allTeamRoles = ROLE_CONFIG.team.map(r => r.key);
  
  const hasHeadRole = (profile['Head'] === 'E' || profile['Asst Head'] === 'E');
  const hasKitchenHeadRole = (profile['Head Kitchen'] === 'E' || profile['Asst Head Kitchen'] === 'E');
  
  const experiencedProfRoles = ROLE_CONFIG.professor.map(r => r.key).filter(role => profile[role] === 'E');
  const hasTwoProfRoles = experiencedProfRoles.length >= 2;
  const hasOneSpeakingRole = experiencedProfRoles.some(role => speakingProfRoles.includes(role));
  const hasProfRequirement = hasTwoProfRoles && hasOneSpeakingRole;
  
  const experiencedChaRoles = allTeamRoles.filter(role => profile[role] === 'E');
  const hasTwoChaRoles = experiencedChaRoles.length >= 2;
  const hasCoreChaRole = experiencedChaRoles.some(role => ['Palanca', 'Chapel', 'Gopher'].includes(role));
  const hasChaRequirement = hasTwoChaRoles && hasCoreChaRole;

  return (
    <div className="card pad" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="roles-section">
        <div className="roles-title" style={{ marginBottom: '12px' }}>Rector Qualification</div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div className="rector-qualification-grid">
          <div className="qualification-labels">
            <div className="qualification-label">Head / Asst Head</div>
            <div className="qualification-label">Head / Asst Kitchen</div>
            <div className="qualification-label">2 Prof Roles (1 Speaking)</div>
            <div className="qualification-label">2 Cha Roles (1 Timed)</div>
          </div>
          <div className="segmented-bar-container">
            <div className={`bar-segment ${hasHeadRole ? 'pass' : 'fail'}`}></div>
            <div className={`bar-segment ${hasKitchenHeadRole ? 'pass' : 'fail'}`}></div>
            <div className={`bar-segment ${hasProfRequirement ? 'pass' : 'fail'}`}></div>
            <div className={`bar-segment ${hasChaRequirement ? 'pass' : 'fail'}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamRolesCard({ profile }) {
  const createRoleItem = (role) => {
    const status = (profile[role.key] || 'N').toUpperCase();
    const serviceNumber = profile[`${role.key} Service`] || '';
    const quantityNumber = profile[`${role.key.replace(/ /g, '_')}_Service_Qty`] || '';

    return (
      <div key={role.key} className="role-item">
        <div className="role-name">{role.name}</div>
        <div className="role-status-cell">
          <span className={`role-status status-${status}`}>{status}</span>
        </div>
        <div className="role-last-cell">
          <span className="service-number">{serviceNumber}</span>
        </div>
        <div className="role-qty-cell">
          <span className="quantity-number">{quantityNumber}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="card pad">
      <div className="roles-section">
        <div className="roles-header-container">
          <div className="roles-title">Team Roles</div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color status-N"></div>
              <span>Never</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-I"></div>
              <span>Inexp.</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-E"></div>
              <span>Exp.</span>
            </div>
          </div>
        </div>
        <div className="role-header-legend team-headers">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="role-header-set">
              <div className="role-header-name">Role</div>
              <div className="role-header-status">Status</div>
              <div className="role-header-last">Last</div>
              <div className="role-header-qty">Qty</div>
            </div>
          ))}
        </div>
        <div className="role-grid team-grid">
          {ROLE_CONFIG.team.map(role => createRoleItem(role))}
        </div>
      </div>
    </div>
  );
}

function ProfessorRolesCard({ profile }) {
  const createRoleItem = (role) => {
    const status = (profile[role.key] || 'N').toUpperCase();
    const serviceNumber = profile[`${role.key} Service`] || '';
    const quantityNumber = profile[`${role.key}_Service_Qty`] || '';

    return (
      <div key={role.key} className="role-item">
        <div className="role-name">{role.name}</div>
        <div className="role-status-cell">
          <span className={`role-status status-${status}`}>{status}</span>
        </div>
        <div className="role-last-cell">
          <span className="service-number">{serviceNumber}</span>
        </div>
        <div className="role-qty-cell">
          <span className="quantity-number">{quantityNumber}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="card pad">
      <div className="roles-section">
        <div className="roles-header-container">
          <div className="roles-title">Professor Roles</div>
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color status-N"></div>
              <span>Never</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-I"></div>
              <span>Inexp.</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-E"></div>
              <span>Exp.</span>
            </div>
          </div>
        </div>
        <div className="role-header-legend professor-headers">
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="role-header-set">
              <div className="role-header-name">Role</div>
              <div className="role-header-status">Status</div>
              <div className="role-header-last">Last</div>
              <div className="role-header-qty">Qty</div>
            </div>
          ))}
        </div>
        <div className="role-grid professor-grid">
          {ROLE_CONFIG.professor.map(role => createRoleItem(role))}
        </div>
      </div>
    </div>
  );
}