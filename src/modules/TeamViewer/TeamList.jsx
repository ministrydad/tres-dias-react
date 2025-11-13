// src/modules/TeamViewer/TeamList.jsx
// UPDATED: Card-based PDF preview (no modal), removed guided tour, ADDED ROVER TO LEADERSHIP SECTION
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { generatePrintableProfileHTML, PRINT_PROFILE_CSS } from './../../utils/profilePrintUtils';
import { Document, Page, Text, View, StyleSheet, PDFViewer, Font } from '@react-pdf/renderer';
import { HiDocumentText, HiUsers, HiCircleStack, HiCalendarDays, HiBookOpen, HiIdentification } from 'react-icons/hi2';
import DatePicker from '../../components/common/DatePicker';

// Register Source Sans 3 font from local TTF files
Font.register({
  family: 'Source Sans 3',
  fonts: [
    { src: '/fonts/SourceSans3-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/SourceSans3-Italic.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: '/fonts/SourceSans3-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/SourceSans3-Bold.ttf', fontWeight: 700 },
  ],
});

// PDF Styles - Matching CombinedRoster.jsx exactly
const pdfStyles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: 'Source Sans 3' },
  sectionHeader: { fontSize: 17, fontWeight: 700, marginBottom: 10, paddingBottom: 5, borderBottom: '2 solid #333' },
  roleHeader: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 4, color: '#2c5aa0', backgroundColor: '#f5f5f5', padding: '3 5' },
  twoColumnContainer: { display: 'flex', flexDirection: 'row', gap: 12 },
  threeColumnContainer: { display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 12 },
  column: { flex: 1, paddingLeft: 6 },
  columnNoIndent: { flex: 1, paddingLeft: 5 },
  memberRow: { marginBottom: 6, paddingBottom: 4, borderBottom: '0.5 solid #ddd' },
  memberName: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  memberDetails: { fontSize: 8.5, color: '#444', lineHeight: 1.3 },
});

// PDF Document Component for Team Roster
const TeamRosterPDFDocument = ({ weekendIdentifier, teamMembers, roleOrder }) => {
  return (
    <Document>
      {/* Team Members Page 1 - Leadership Structure */}
      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionHeader}>
          Team Roster - {weekendIdentifier.replace(/^(Men's|Women's)\s*(\d+)$/i, "$1 Weekend #$2")}
        </Text>
        
        {/* Rector */}
        {(() => {
          const rectorMembers = teamMembers.filter(m => m.role === 'Rector');
          if (rectorMembers.length === 0) return null;
          
          return (
            <View wrap={false} style={{ marginBottom: 16 }}>
              <Text style={pdfStyles.roleHeader}>Rector</Text>
              <View style={pdfStyles.twoColumnContainer}>
                <View style={pdfStyles.column}>
                  {rectorMembers.filter((_, idx) => idx % 2 === 0).map((member, idx) => (
                    <View key={idx} style={pdfStyles.memberRow}>
                      <Text style={pdfStyles.memberName}>{member.name}</Text>
                      <Text style={pdfStyles.memberDetails}>
                        {member.address && `${member.address}\n`}
                        {member.email && `${member.email}\n`}
                        {member.phone && `${member.phone}\n`}
                        {member.church && `${member.church}`}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={pdfStyles.column}>
                  {rectorMembers.filter((_, idx) => idx % 2 === 1).map((member, idx) => (
                    <View key={idx} style={pdfStyles.memberRow}>
                      <Text style={pdfStyles.memberName}>{member.name}</Text>
                      <Text style={pdfStyles.memberDetails}>
                        {member.address && `${member.address}\n`}
                        {member.email && `${member.email}\n`}
                        {member.phone && `${member.phone}\n`}
                        {member.church && `${member.church}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })()}
        
        {/* Row 2: BUR, Head, Asst Head */}
        <View style={pdfStyles.threeColumnContainer} wrap={false}>
          {['BUR', 'Head', 'Asst Head'].map((role) => {
            const members = teamMembers.filter(m => m.role === role);
            if (members.length === 0) return <View key={role} style={pdfStyles.columnNoIndent} />;
            
            return (
              <View key={role} style={pdfStyles.columnNoIndent}>
                <Text style={pdfStyles.roleHeader}>{role}</Text>
                {members.map((member, idx) => (
                  <View key={idx} style={pdfStyles.memberRow}>
                    <Text style={pdfStyles.memberName}>{member.name}</Text>
                    <Text style={pdfStyles.memberDetails}>
                      {member.address && `${member.address}\n`}
                      {member.email && `${member.email}\n`}
                      {member.phone && `${member.phone}\n`}
                      {member.church && `${member.church}`}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
        
        {/* Row 3: Head Spiritual Director, Spiritual Director(s), Rover */}
        <View style={pdfStyles.threeColumnContainer} wrap={false}>
          {['Head Spiritual Director', 'Spiritual Director', 'Rover'].map((role) => {
            const members = teamMembers.filter(m => m.role === role);
            if (members.length === 0) return <View key={role} style={pdfStyles.columnNoIndent} />;
            
            return (
              <View key={role} style={pdfStyles.columnNoIndent}>
                <Text style={pdfStyles.roleHeader}>{role}</Text>
                {members.map((member, idx) => (
                  <View key={idx} style={pdfStyles.memberRow}>
                    <Text style={pdfStyles.memberName}>{member.name}</Text>
                    <Text style={pdfStyles.memberDetails}>
                      {member.address && `${member.address}\n`}
                      {member.email && `${member.email}\n`}
                      {member.phone && `${member.phone}\n`}
                      {member.church && `${member.church}`}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </Page>

      {/* Team Members Page 2+ - Service Teams and Professors */}
      <Page size="LETTER" style={pdfStyles.page}>
        
        {/* All non-professor, non-leadership roles */}
        {roleOrder.filter(role => 
          !['Rector', 'BUR', 'Head', 'Asst Head', 'Head Spiritual Director', 'Spiritual Director', 'Rover'].includes(role) &&
          !role.startsWith('Prof_')
        ).map(role => {
          const members = teamMembers.filter(m => m.role === role);
          if (members.length === 0) return null;
          
          return (
            <View key={role} wrap={false} style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.roleHeader}>{role}</Text>
              <View style={pdfStyles.twoColumnContainer}>
                <View style={pdfStyles.column}>
                  {members.filter((_, idx) => idx % 2 === 0).map((member, idx) => (
                    <View key={idx} style={pdfStyles.memberRow}>
                      <Text style={pdfStyles.memberName}>{member.name}</Text>
                      <Text style={pdfStyles.memberDetails}>
                        {member.address && `${member.address}\n`}
                        {member.email && `${member.email}\n`}
                        {member.phone && `${member.phone}\n`}
                        {member.church && `${member.church}`}
                      </Text>
                    </View>
                  ))}
                </View>
                
                <View style={pdfStyles.column}>
                  {members.filter((_, idx) => idx % 2 === 1).map((member, idx) => (
                    <View key={idx} style={pdfStyles.memberRow}>
                      <Text style={pdfStyles.memberName}>{member.name}</Text>
                      <Text style={pdfStyles.memberDetails}>
                        {member.address && `${member.address}\n`}
                        {member.email && `${member.email}\n`}
                        {member.phone && `${member.phone}\n`}
                        {member.church && `${member.church}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
        
        {/* All Professors grouped together in 2 columns */}
        {(() => {
          const allProfessors = roleOrder
            .filter(role => role.startsWith('Prof_'))
            .flatMap(role => {
              const members = teamMembers.filter(m => m.role === role);
              return members.map(member => ({
                ...member,
                displayRole: role.replace(/^Prof_/, '')
              }));
            });
          
          if (allProfessors.length === 0) return null;
          
          return (
            <View wrap={false} style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.roleHeader}>Professors</Text>
              <View style={pdfStyles.twoColumnContainer}>
                <View style={pdfStyles.column}>
                  {allProfessors.filter((_, idx) => idx % 2 === 0).map((member, idx) => (
                    <View key={idx} style={pdfStyles.memberRow}>
                      <Text style={pdfStyles.memberName}>{member.name} - {member.displayRole}</Text>
                      <Text style={pdfStyles.memberDetails}>
                        {member.address && `${member.address}\n`}
                        {member.email && `${member.email}\n`}
                        {member.phone && `${member.phone}\n`}
                        {member.church && `${member.church}`}
                      </Text>
                    </View>
                  ))}
                </View>
                
                <View style={pdfStyles.column}>
                  {allProfessors.filter((_, idx) => idx % 2 === 1).map((member, idx) => (
                    <View key={idx} style={pdfStyles.memberRow}>
                      <Text style={pdfStyles.memberName}>{member.name} - {member.displayRole}</Text>
                      <Text style={pdfStyles.memberDetails}>
                        {member.address && `${member.address}\n`}
                        {member.email && `${member.email}\n`}
                        {member.phone && `${member.phone}\n`}
                        {member.church && `${member.church}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })()}
      </Page>
    </Document>
  );
};

export default function TeamList() {
  const { user, orgId } = useAuth();
  const { allPescadores, loading: pescadoresLoading } = usePescadores();
  const [currentGender, setCurrentGender] = useState('men');
  const [weekendIdentifier, setWeekendIdentifier] = useState('');
  const [teamRoster, setTeamRoster] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [changingMember, setChangingMember] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  
  const [newRole, setNewRole] = useState('');
  const [showBadgePanel, setShowBadgePanel] = useState(false);
  const [badgeExportType, setBadgeExportType] = useState('team');
  const [badgeCommunity, setBadgeCommunity] = useState('');
  const [badgeScripture, setBadgeScripture] = useState('');
  const [badgeTheme, setBadgeTheme] = useState('');
  const [badgeProfPosition, setBadgeProfPosition] = useState('blank');
  const [candidates, setCandidates] = useState([]);
  
  // Setup Next Weekend state
  const [showSetupNextWeekend, setShowSetupNextWeekend] = useState(false);
  const [nextWeekendTheme, setNextWeekendTheme] = useState('');
  const [nextWeekendVerse, setNextWeekendVerse] = useState('');
  const [nextWeekendThemeSong, setNextWeekendThemeSong] = useState('');
  const [nextWeekendStartDate, setNextWeekendStartDate] = useState('');
  const [nextWeekendEndDate, setNextWeekendEndDate] = useState('');
  const [nextWeekendImage, setNextWeekendImage] = useState(null);
  const [isCreatingNextWeekend, setIsCreatingNextWeekend] = useState(false);

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

  const LEADERSHIP_ROLES = [
    'Rector', 'BUR', 'Rover',
    'Head', 'Asst Head',
    'Head Kitchen', 'Asst Head Kitchen',
    'Head Prayer', 'Head Table', 'Head Chapel',
    'Head Dorm', 'Head Palanca', 'Head Gopher',
    'Head Storeroom', 'Head Floater Supply',
    'Head Worship', 'Head Media',
    'Head Spiritual Director'
  ];

  const unifiedTeamGroups = [
    { title: 'Kitchen Team', head: 'Head Kitchen', assistantHead: 'Asst Head Kitchen', team: 'Kitchen' },
    { title: 'Prayer Team', head: 'Head Prayer', team: 'Prayer' },
    { title: 'Table Team', head: 'Head Table', team: 'Table' },
    { title: 'Chapel Team', head: 'Head Chapel', team: 'Chapel' },
    { title: 'Dorm Team', head: 'Head Dorm', team: 'Dorm' },
    { title: 'Palanca Team', head: 'Head Palanca', team: 'Palanca' },
    { title: 'Gopher Team', head: 'Head Gopher', team: 'Gopher' },
    { title: 'Storeroom Team', head: 'Head Storeroom', team: 'Storeroom' },
    { title: 'Floater Supply Team', head: 'Head Floater Supply', team: 'Floater Supply' },
    { title: 'Worship Team', head: 'Head Worship', team: 'Worship' },
    { title: 'Media Team', head: 'Head Media', team: 'Media' }
  ];

  const ROLE_ORDER = [
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
    'Head Media', 'Media',
    'Prof_Silent', 'Prof_Ideals', 'Prof_Church', 'Prof_Piety',
    'Prof_Study', 'Prof_Action', 'Prof_Leaders', 'Prof_Environments',
    'Prof_CCIA', 'Prof_Reunion'
  ];

  useEffect(() => {
    if (!pescadoresLoading && orgId && allPescadores[currentGender]?.length > 0) {
      loadLatestTeam();
    }
  }, [currentGender, pescadoresLoading, orgId, allPescadores]);

  const loadLatestTeam = async () => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    setLoadingTeam(true);
    
    try {
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
        setWeekendIdentifier(latest.identifier);
        await loadTeamRoster(latest.identifier);
      } else {
        setWeekendIdentifier('');
        setTeamRoster([]);
        setLoadingTeam(false);
      }
    } catch (error) {
      console.error('Error loading latest team:', error);
      setTeamRoster([]);
      setLoadingTeam(false);
    }
  };

  const loadTeamRoster = async (identifier) => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    const rawTableData = currentGender === 'men' 
      ? allPescadores['men']
      : [...allPescadores['women'], ...allPescadores['men']];

    try {
      const { data, error } = await supabase
        .from(rosterTable)
        .select('pescadore_key, role')
        .eq('weekend_identifier', identifier)
        .eq('org_id', orgId);

      if (error) throw error;

      const newRoster = [];
      if (data) {
        data.forEach(entry => {
          const profile = rawTableData.find(p => p.PescadoreKey === entry.pescadore_key);
          if (profile) {
            newRoster.push({
              id: profile.PescadoreKey,
              name: `${profile.Preferred || profile.First || ''} ${profile.Last || ''}`.trim(),
              role: entry.role,
              email: profile.Email || '',
              phone: profile.Phone1 || profile.Phone2 || '',
              address: `${profile.Address || ''}, ${profile.City || ''}, ${profile.State || ''} ${profile.Zip || ''}`.trim(),
              church: profile.Church || ''
            });
          }
        });
      }

      setTeamRoster(newRoster);
    } catch (error) {
      console.error('Error loading team roster:', error);
      setTeamRoster([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const toggleRowExpansion = (personId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  const handleGenderToggle = (gender) => {
    setCurrentGender(gender);
  };

  const handleRemoveTeammate = async (personId, role) => {
    window.showConfirm({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove this member from ${role}? This action will update the team roster.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        setRemovingId(personId);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';

        try {
          const { error } = await supabase
            .from(rosterTable)
            .delete()
            .eq('weekend_identifier', weekendIdentifier)
            .eq('pescadore_key', personId)
            .eq('role', role)
            .eq('org_id', orgId);

          if (error) throw error;

          window.showMainStatus?.(`Removed from ${role}`, false);

          if (weekendIdentifier) {
            const rawTableData = allPescadores[currentGender];
            const { data, error: fetchError } = await supabase
              .from(rosterTable)
              .select('pescadore_key, role')
              .eq('weekend_identifier', weekendIdentifier)
              .eq('org_id', orgId);

            if (fetchError) throw fetchError;

            const newRoster = [];
            if (data) {
              data.forEach(entry => {
                const profile = rawTableData.find(p => p.PescadoreKey === entry.pescadore_key);
                if (profile) {
                  newRoster.push({
                    id: profile.PescadoreKey,
                    name: `${profile.Preferred || profile.First || ''} ${profile.Last || ''}`.trim(),
                    role: entry.role,
                    email: profile.Email || '',
                    phone: profile.Phone1 || profile.Phone2 || '',
                    address: `${profile.Address || ''}, ${profile.City || ''}, ${profile.State || ''} ${profile.Zip || ''}`.trim(),
                    church: profile.Church || ''
                  });
                }
              });
            }
            setTeamRoster(newRoster);
          } else {
            window.showMainStatus?.('Error: Could not reload roster', true);
          }
        } catch (error) {
          console.error('Error removing teammate:', error);
          window.showMainStatus?.(`Failed to remove teammate: ${error.message}`, true);
        } finally {
          setRemovingId(null);
        }
      }
    });
  };

  const handleChangeRoleClick = (memberId, memberName, currentRole) => {
    setChangingMember({ id: memberId, name: memberName, currentRole });
    setNewRole('');
    setShowChangeRoleModal(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!newRole || !changingMember) return;

    const existingMembers = teamRoster.filter(m => m.role === newRole && m.id !== changingMember.id);
    
    if (existingMembers.length > 0 && LEADERSHIP_ROLES.includes(newRole)) {
      const names = existingMembers.map(m => m.name).join(', ');
      window.showConfirm({
        title: '⚠️ Role Conflict Warning',
        message: `${newRole} already has ${existingMembers.length} person(s) assigned: ${names}.\n\nMoving ${changingMember.name} to ${newRole} will result in multiple people in this role.\n\nThis is allowed, but you may want to remove the other person(s) afterwards if this role should only have 1 person.`,
        confirmText: 'Continue Anyway',
        cancelText: 'Cancel',
        isDangerous: false,
        onConfirm: async () => {
          await executeRoleChange();
        }
      });
    } else {
      await executeRoleChange();
    }
  };

  const executeRoleChange = async () => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';

    try {
      const { error } = await supabase
        .from(rosterTable)
        .update({ role: newRole })
        .eq('pescadore_key', changingMember.id)
        .eq('weekend_identifier', weekendIdentifier)
        .eq('org_id', orgId);

      if (error) throw error;

      window.showMainStatus?.(`${changingMember.name} moved to ${newRole}`, false);
      await loadTeamRoster(weekendIdentifier);
      
      setShowChangeRoleModal(false);
      setChangingMember(null);
      setNewRole('');
    } catch (error) {
      console.error('Error changing role:', error);
      window.showMainStatus?.('Failed to change role: ' + error.message, true);
    }
  };

  const handleUpdateDatabaseClick = () => {
    if (!weekendIdentifier || teamRoster.length === 0) {
      window.showMainStatus?.('No team loaded to update', true);
      return;
    }
    setShowUpdateModal(true);
  };

  const handleConfirmUpdate = async () => {
    setIsUpdating(true);
    const tableName = currentGender === 'men' ? 'men_raw' : 'women_raw';
    const rawTableData = allPescadores[currentGender];
    
    let successCount = 0;
    let errorCount = 0;
    const previewChanges = [];
    
    try {
      for (const member of teamRoster) {
        const profile = rawTableData.find(p => p.PescadoreKey === member.id);
        if (!profile) {
          console.warn(`Profile not found for ${member.name}`);
          errorCount++;
          continue;
        }
        
        const role = member.role;
        const updateData = {};
        
        let statusField = role;
        let lastField = `${role} Service`;
        let qtyField;
        
        if (role.startsWith('Prof_')) {
          qtyField = `${role}_Service_Qty`;
        } else {
          qtyField = `${role.replace(/ /g, '_')}_Service_Qty`;
        }
        
        const currentStatus = (profile[statusField] || 'N').toUpperCase();
        let newStatus = currentStatus;
        if (currentStatus === 'N') {
          newStatus = 'I';
          updateData[statusField] = 'I';
        } else if (currentStatus === 'I') {
          newStatus = 'E';
          updateData[statusField] = 'E';
        }
        
        const currentLast = profile[lastField] || '(none)';
        updateData[lastField] = weekendIdentifier;
        
        const currentQty = parseInt(profile[qtyField] || 0, 10);
        const newQty = currentQty + 1;
        updateData[qtyField] = newQty;
        
        previewChanges.push({
          name: member.name,
          role,
          statusChange: `${currentStatus} → ${newStatus}`,
          lastChange: `${currentLast} → ${weekendIdentifier}`,
          qtyChange: `${currentQty} → ${newQty}`,
          statusField,
          lastField,
          qtyField,
          updateData
        });
        
        if (!testMode) {
          const { error } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('PescadoreKey', member.id)
            .eq('org_id', orgId);
          
          if (error) {
            console.error(`Error updating ${member.name}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      }
      
      if (testMode) {
        console.log('🧪 TEST MODE - No actual database changes made');
        console.table(previewChanges);
        window.showMainStatus?.(
          `TEST MODE: Would update ${successCount} team member${successCount > 1 ? 's' : ''} (check console for details)`,
          false
        );
      } else {
        if (errorCount === 0) {
          window.showMainStatus?.(
            `Successfully updated ${successCount} team member${successCount > 1 ? 's' : ''}!`,
            false
          );
        } else {
          window.showMainStatus?.(
            `Updated ${successCount} members, ${errorCount} error${errorCount > 1 ? 's' : ''}`,
            true
          );
        }
      }
      
      setShowUpdateModal(false);
      
    } catch (error) {
      console.error('Error in batch update:', error);
      window.showMainStatus?.('An error occurred during update', true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintRoster = () => {
    if (!teamRoster || teamRoster.length === 0) {
      window.showMainStatus('No team members to print', true);
      return;
    }
    setShowPdfPreview(!showPdfPreview);
  };

  const handlePrintAllProfiles = () => {
    if (!teamRoster || teamRoster.length === 0) {
      window.showMainStatus('No team members to print', true);
      return;
    }

    const rawTableData = allPescadores[currentGender];
    
    let allProfilesHTML = '';
    teamRoster.forEach(member => {
      const fullProfile = rawTableData.find(p => p.PescadoreKey === member.id);
      if (fullProfile) {
        const singleProfileHTML = generatePrintableProfileHTML(fullProfile);
        allProfilesHTML += `<div style="page-break-after: always; padding: 0.2in;">${singleProfileHTML}</div>`;
      }
    });

    const printableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Team Profile Reports</title>
          <style>${PRINT_PROFILE_CSS}</style>
        </head>
        <body>${allProfilesHTML}</body>
      </html>
    `;

    if (typeof printJS !== 'undefined') {
      printJS({
        printable: printableHTML,
        type: 'raw-html',
        documentTitle: 'Team Profiles'
      });
    } else {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printableHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleOpenBadgePanel = async () => {
    setShowBadgePanel(true);
    
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      if (orgError) throw orgError;
      setBadgeCommunity(orgData.name || '');

      const { data: candidatesData, error: candidatesError} = await supabase
        .from('cra_applications')
        .select('m_first, m_pref, f_first, f_pref, c_lastname, attendance')
        .eq('org_id', orgId);

      if (candidatesError) throw candidatesError;

      const formattedCandidates = (candidatesData || [])
        .filter(c => c.attendance !== 'no')
        .map(c => {
          if (currentGender === 'men') {
            return {
              firstName: c.m_pref || c.m_first || '',
              lastName: c.c_lastname || ''
            };
          } else {
            return {
              firstName: c.f_pref || c.f_first || '',
              lastName: c.c_lastname || ''
            };
          }
        }).filter(c => c.firstName && c.lastName);

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error('Error loading badge data:', error);
      window.showMainStatus?.('Failed to load badge data: ' + error.message, true);
    }
  };

  const handleCloseBadgePanel = () => {
    setShowBadgePanel(false);
    setBadgeScripture('');
    setBadgeTheme('');
    setBadgeExportType('team');
    setBadgeProfPosition('blank');
  };

  const handleGenerateBadgeCSV = () => {
    if (!badgeScripture.trim() || !badgeTheme.trim()) {
      window.showMainStatus?.('Please enter Scripture and Theme', true);
      return;
    }

    const csvRows = [];
    csvRows.push(['FirstName', 'LastName', 'Organization', 'WeekendInfo', 'Scripture', 'Theme', 'Position']);

    const rawTableData = allPescadores[currentGender];
    const weekendInfo = weekendIdentifier;

    if (badgeExportType === 'team' || badgeExportType === 'both') {
      teamRoster.forEach(member => {
        const profile = rawTableData.find(p => p.PescadoreKey === member.id);
        if (profile) {
          const firstName = profile.Preferred || profile.First || '';
          const lastName = profile.Last || '';
          let position = member.role;

          if (position.startsWith('Prof_')) {
            if (badgeProfPosition === 'blank') {
              position = '';
            } else if (badgeProfPosition === 'table-leader') {
              position = 'Table Leader';
            } else {
              position = position.replace('Prof_', '');
            }
          }

          csvRows.push([
            firstName,
            lastName,
            badgeCommunity,
            weekendInfo,
            badgeScripture,
            badgeTheme,
            position
          ]);
        }
      });
    }

    if (badgeExportType === 'candidates' || badgeExportType === 'both') {
      candidates.forEach(candidate => {
        csvRows.push([
          candidate.firstName,
          candidate.lastName,
          badgeCommunity,
          weekendInfo,
          badgeScripture,
          badgeTheme,
          ''
        ]);
      });
    }

    const csvContent = csvRows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${weekendIdentifier}_Badges.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.showMainStatus?.(`Badge CSV exported with ${csvRows.length - 1} entries`, false);
    handleCloseBadgePanel();
  };

  const handleCreateNextWeekend = async () => {
    // Determine if this is the first weekend or a subsequent one
    const isFirstWeekend = !weekendIdentifier;
    
    // Calculate next weekend details
    let nextWeekendNum, nextWeekendId, roverToPromote;
    
    if (isFirstWeekend) {
      // Creating first weekend - start at #1
      nextWeekendNum = 1;
      const prefix = currentGender.charAt(0).toUpperCase() + currentGender.slice(1) + "'s ";
      nextWeekendId = `${prefix}${nextWeekendNum}`;
      roverToPromote = null; // No rover to promote on first weekend
    } else {
      // Creating next weekend - find Rover and increment
      roverToPromote = teamRoster.find(m => m.role === 'Rover');
      
      if (!roverToPromote) {
        window.showMainStatus?.('No Rover assigned to current team. Please assign a Rover first.', true);
        return;
      }
      
      const currentWeekendNum = parseInt(weekendIdentifier.match(/\d+/)?.[0] || '0', 10);
      nextWeekendNum = currentWeekendNum + 1;
      nextWeekendId = weekendIdentifier.replace(/\d+$/, nextWeekendNum.toString());
    }

    setIsCreatingNextWeekend(true);

    try {
      let imageUrl = '';

      // Step 1: Upload image to Supabase Storage (if provided)
      if (nextWeekendImage) {
        const fileExt = nextWeekendImage.name.split('.').pop();
        const fileName = `${orgId}/${nextWeekendId.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('weekend-images')
          .upload(fileName, nextWeekendImage, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('weekend-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Step 2: Insert into weekend_history
      const { error: historyError } = await supabase
        .from('weekend_history')
        .insert({
          org_id: orgId,
          weekend_identifier: nextWeekendId,
          weekend_number: nextWeekendNum,
          gender: currentGender,
          theme: nextWeekendTheme.trim(),
          theme_song: nextWeekendThemeSong.trim(),
          verse: nextWeekendVerse.trim(),
          start_date: nextWeekendStartDate || null,
          end_date: nextWeekendEndDate || null,
          image: imageUrl
        });

      if (historyError) {
        console.error('Weekend history insert error:', historyError);
        throw new Error(`Failed to create weekend history: ${historyError.message}`);
      }

      // Step 3: If there's a Rover, promote to Rector in next weekend roster
      if (roverToPromote) {
        const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
        
        const { error: rosterError } = await supabase
          .from(rosterTable)
          .insert({
            weekend_identifier: nextWeekendId,
            role: 'Rector',
            pescadore_key: roverToPromote.id,
            org_id: orgId
          });

        if (rosterError) {
          console.error('Roster insert error:', rosterError);
          throw new Error(`Failed to assign Rector for next weekend: ${rosterError.message}`);
        }
        
        window.showMainStatus?.(
          `✅ ${nextWeekendId} created! ${roverToPromote.name} is now Rector.`,
          false
        );
      } else {
        // First weekend - no roster yet
        window.showMainStatus?.(
          `✅ ${nextWeekendId} created! You can now build your team.`,
          false
        );
      }

      // Reset form
      setShowSetupNextWeekend(false);
      setNextWeekendTheme('');
      setNextWeekendThemeSong('');
      setNextWeekendVerse('');
      setNextWeekendStartDate('');
      setNextWeekendEndDate('');
      setNextWeekendImage(null);
      
      // Reload the team to show the new weekend
      await loadLatestTeam();

    } catch (error) {
      console.error('Error creating weekend:', error);
      window.showMainStatus?.(`Error: ${error.message}`, true);
    } finally {
      setIsCreatingNextWeekend(false);
    }
  };

  const renderRectorSection = () => {
    const rector = teamRoster.find(m => m.role === 'Rector');
    const isExpanded = rector && expandedRows.has(rector.id);
    
    return (
      <div className="card pad" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="small-card-header" style={{ flex: 1, margin: '-24px -24px 16px -24px' }}>
            Rector
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginTop: '-8px' }}>
          <div className="team-total-card">
            <div className="team-total-title">Team Total</div>
            <div className="team-total-count">{teamRoster.length}</div>
          </div>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>
                {rector ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span 
                      onClick={() => toggleRowExpansion(rector.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                      {rector.name}
                    </span>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleRemoveTeammate(rector.id, 'Rector')}
                      disabled={removingId === rector.id}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No Rector Assigned</span>
                )}
              </td>
            </tr>
            {isExpanded && rector && (
              <tr className="expanded-row">
                <td>
                  <div style={{ 
                    padding: '8px 12px', 
                    backgroundColor: 'var(--panel-header)', 
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    lineHeight: '1.6'
                  }}>
                    {rector.email && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                        <a href={`mailto:${rector.email}`} style={{ color: 'var(--accentB)' }}>{rector.email}</a>
                      </div>
                    )}
                    {rector.phone && (
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                        <a href={`tel:${rector.phone}`} style={{ color: 'var(--accentB)' }}>{rector.phone}</a>
                      </div>
                    )}
                    {!rector.email && !rector.phone && (
                      <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLeadershipSection = () => {
    const headSpirDirector = teamRoster.filter(m => m.role === 'Head Spiritual Director');
    const spirDirectors = teamRoster.filter(m => m.role === 'Spiritual Director');
    const heads = teamRoster.filter(m => m.role === 'Head');
    const asstHeads = teamRoster.filter(m => m.role === 'Asst Head');
    const burs = teamRoster.filter(m => m.role === 'BUR');
    const rovers = teamRoster.filter(m => m.role === 'Rover');

    const totalCount = headSpirDirector.length + spirDirectors.length + heads.length + asstHeads.length + burs.length + rovers.length;

    const renderRow = (role, person, showLabel = true) => {
      if (!person) {
        return (
          <tr key={`empty-${role}`}>
            {showLabel && <td style={{ fontWeight: 500, width: '30%' }}>{role}</td>}
            <td style={{ fontWeight: 600 }}>
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not Assigned</span>
            </td>
          </tr>
        );
      }

      const isExpanded = expandedRows.has(person.id);
      
      return (
        <>
          <tr key={person.id} className={removingId === person.id ? 'removing' : ''}>
            {showLabel && <td style={{ fontWeight: 500, width: '30%' }}>{role}</td>}
            <td style={{ fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  onClick={() => toggleRowExpansion(person.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                  {person.name}
                  {role === 'Head Spiritual Director' && (
                    <span style={{ 
                      marginLeft: '8px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: '#28a745',
                      color: 'white'
                    }}>HEAD</span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-small"
                    onClick={() => handleChangeRoleClick(person.id, person.name, person.role)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Change
                  </button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveTeammate(person.id, person.role)}
                    disabled={removingId === person.id}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </td>
          </tr>
          {isExpanded && (
            <tr key={`${person.id}-details`} className="expanded-row">
              {showLabel && <td></td>}
              <td colSpan={showLabel ? 1 : 2}>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--panel-header)', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  {person.email && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                      <a href={`mailto:${person.email}`} style={{ color: 'var(--accentB)' }}>{person.email}</a>
                    </div>
                  )}
                  {person.phone && (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                      <a href={`tel:${person.phone}`} style={{ color: 'var(--accentB)' }}>{person.phone}</a>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </>
      );
    };

    return (
      <div className="card pad" style={{ marginBottom: '20px' }}>
        <div className="small-card-header">
          Leadership Team {totalCount > 0 && <span style={{ marginLeft: '8px' }}>({totalCount})</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {renderRow('Head', heads[0])}
              {renderRow('Asst Head', asstHeads[0])}
              {renderRow('BUR', burs[0])}
              {renderRow('Rover', rovers[0])}
            </tbody>
          </table>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {renderRow('Head Spiritual Director', headSpirDirector[0])}
              {spirDirectors.map((sd, idx) => renderRow('Spiritual Director', sd))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProfessorSection = () => {
    const professorRoles = ROLE_CONFIG.professor.map(r => r.key);
    const professors = professorRoles.map(role => ({
      role,
      displayName: ROLE_CONFIG.professor.find(r => r.key === role)?.name || role,
      members: teamRoster.filter(m => m.role === role)
    }));

    const totalCount = professors.reduce((sum, p) => sum + p.members.length, 0);

    const renderRow = (prof) => {
      const person = prof.members[0];
      
      if (!person) {
        return (
          <tr key={prof.role}>
            <td style={{ fontWeight: 500, width: '30%' }}>{prof.displayName}</td>
            <td style={{ fontWeight: 600 }}>
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not Assigned</span>
            </td>
          </tr>
        );
      }

      const isExpanded = expandedRows.has(person.id);

      return (
        <>
          <tr key={prof.role} className={removingId === person.id ? 'removing' : ''}>
            <td style={{ fontWeight: 500, width: '30%' }}>{prof.displayName}</td>
            <td style={{ fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  onClick={() => toggleRowExpansion(person.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                  {person.name}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-small"
                    onClick={() => handleChangeRoleClick(person.id, person.name, prof.role)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Change
                  </button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveTeammate(person.id, prof.role)}
                    disabled={removingId === person.id}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </td>
          </tr>
          {isExpanded && (
            <tr key={`${person.id}-details`} className="expanded-row">
              <td></td>
              <td>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--panel-header)', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  {person.email && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                      <a href={`mailto:${person.email}`} style={{ color: 'var(--accentB)' }}>{person.email}</a>
                    </div>
                  )}
                  {person.phone && (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                      <a href={`tel:${person.phone}`} style={{ color: 'var(--accentB)' }}>{person.phone}</a>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </>
      );
    };

    const midpoint = Math.ceil(professors.length / 2);
    const leftColumn = professors.slice(0, midpoint);
    const rightColumn = professors.slice(midpoint);

    return (
      <div className="card pad" style={{ marginBottom: '20px' }}>
        <div className="small-card-header">
          Professor Team {totalCount > 0 && <span style={{ marginLeft: '8px' }}>({totalCount})</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {leftColumn.map(renderRow)}
            </tbody>
          </table>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Role</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {rightColumn.map(renderRow)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUnifiedTeamSection = (group) => {
    const headMembers = teamRoster.filter(m => m.role === group.head);
    const assistantHeadMembers = group.assistantHead ? teamRoster.filter(m => m.role === group.assistantHead) : [];
    const teamMembers = teamRoster.filter(m => m.role === group.team);

    const totalCount = headMembers.length + assistantHeadMembers.length + teamMembers.length;

    const renderRow = (person, roleLabel) => {
      const isExpanded = expandedRows.has(person.id);

      return (
        <>
          <tr key={person.id} className={removingId === person.id ? 'removing' : ''}>
            <td style={{ fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span 
                  onClick={() => toggleRowExpansion(person.id)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                  {person.name}
                  {roleLabel && (
                    <span style={{ 
                      marginLeft: '8px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: roleLabel === 'HEAD' ? '#28a745' : '#ffc107',
                      color: roleLabel === 'HEAD' ? 'white' : '#333'
                    }}>{roleLabel}</span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-small"
                    onClick={() => handleChangeRoleClick(person.id, person.name, person.role)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Change
                  </button>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleRemoveTeammate(person.id, person.role)}
                    disabled={removingId === person.id}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </td>
          </tr>
          {isExpanded && (
            <tr key={`${person.id}-details`} className="expanded-row">
              <td>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: 'var(--panel-header)', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6'
                }}>
                  {person.email && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Email:</span>{' '}
                      <a href={`mailto:${person.email}`} style={{ color: 'var(--accentB)' }}>{person.email}</a>
                    </div>
                  )}
                  {person.phone && (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Phone:</span>{' '}
                      <a href={`tel:${person.phone}`} style={{ color: 'var(--accentB)' }}>{person.phone}</a>
                    </div>
                  )}
                  {!person.email && !person.phone && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No contact information available</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </>
      );
    };

    const allMembers = [
      ...headMembers.map(m => ({ ...m, roleLabel: 'HEAD' })),
      ...assistantHeadMembers.map(m => ({ ...m, roleLabel: 'ASST HEAD' })),
      ...teamMembers.map(m => ({ ...m, roleLabel: null }))
    ];

    const midpoint = Math.ceil(allMembers.length / 2);
    const leftColumn = allMembers.slice(0, midpoint);
    const rightColumn = allMembers.slice(midpoint);

    return (
      <div key={group.title} className="card pad" style={{ marginBottom: '20px' }}>
        <div className="small-card-header">
          {group.title} {totalCount > 0 && <span style={{ marginLeft: '8px' }}>({totalCount})</span>}
        </div>
        {allMembers.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {leftColumn.map(m => renderRow(m, m.roleLabel))}
              </tbody>
            </table>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {rightColumn.map(m => renderRow(m, m.roleLabel))}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="table">
            <tbody>
              <tr>
                <td style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center' }}>
                  No team members assigned
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const genderLabel = currentGender.charAt(0).toUpperCase() + currentGender.slice(1);
  let displayId = weekendIdentifier || '';
  if (weekendIdentifier) {
    const match = weekendIdentifier.match(/(\w+)'s (\d+)/);
    if (match && !weekendIdentifier.toLowerCase().includes('weekend')) {
      displayId = `${match[1]}'s Weekend ${match[2]}`;
    }
  }

  return (
    <section id="team-list-app" className="app-panel" style={{ display: 'block', padding: 0 }}>
      <div className="card pad" style={{ marginBottom: '12px' }}>
        <div className="section-title">
          <span>{genderLabel}'s Team List</span>
          {displayId && (
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '15px' }}>
              {displayId}
            </span>
          )}
        </div>

        <div style={{ 
          padding: '0 0 15px 0', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Gender Toggle */}
          <div className="toggle" style={{ maxWidth: '250px' }}>
            <div 
              className={`opt ${currentGender === 'men' ? 'active' : ''}`}
              onClick={() => handleGenderToggle('men')}
            >
              Men
            </div>
            <div 
              className={`opt ${currentGender === 'women' ? 'active' : ''}`}
              onClick={() => handleGenderToggle('women')}
            >
              Women
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-warning" onClick={handlePrintRoster}>
              <HiDocumentText size={16} style={{ marginRight: '6px' }} />
              {showPdfPreview ? 'Hide PDF Preview' : 'Print Report'}
            </button>
            <button className="btn btn-warning" onClick={handlePrintAllProfiles}>
              <HiUsers size={16} style={{ marginRight: '6px' }} />
              Print All Profiles
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleUpdateDatabaseClick}
              disabled={!weekendIdentifier || teamRoster.length === 0 || isUpdating}
              title='Update database with service records'
            >
              <HiCircleStack size={16} style={{ marginRight: '6px' }} />
              {isUpdating ? 'Processing...' : 'Update Database'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowSetupNextWeekend(!showSetupNextWeekend)}
              title='Setup theme, verse, and image for next weekend'
            >
              <HiCalendarDays size={16} style={{ marginRight: '6px' }} />
              {showSetupNextWeekend ? 'Hide Setup' : (weekendIdentifier ? 'Setup Next Weekend' : 'Create First Weekend')}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => console.log('Export for Team Book')}
              style={{ display: 'none' }}
            >
              <HiBookOpen size={16} style={{ marginRight: '6px' }} />
              Export for Team Book
            </button>
            <button className="btn btn-primary" onClick={handleOpenBadgePanel}>
              <HiIdentification size={16} style={{ marginRight: '6px' }} />
              Export to Team Badges
            </button>
          </div>
        </div>

        {/* PDF Preview Section */}
        {showPdfPreview && teamRoster.length > 0 && (
          <div style={{ 
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '2px solid var(--border)'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: 600, 
                color: 'var(--ink)'
              }}>
                Team Roster PDF Preview
              </div>
              <button 
                className="btn btn-small"
                onClick={() => setShowPdfPreview(false)}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                Close Preview ✕
              </button>
            </div>
            <div style={{ 
              width: '100%', 
              height: '800px', 
              border: '1px solid var(--border)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                <TeamRosterPDFDocument
                  weekendIdentifier={weekendIdentifier}
                  teamMembers={teamRoster}
                  roleOrder={ROLE_ORDER}
                />
              </PDFViewer>
            </div>
          </div>
        )}
        
        {/* Setup Next Weekend Section */}
        {showSetupNextWeekend && (
          <div style={{ 
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '2px solid var(--border)',
            animation: 'slideInDown 0.3s ease-out'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  color: 'var(--ink)',
                  marginBottom: '8px'
                }}>
                  Setup Next Weekend
                </div>
                {(() => {
                  if (!weekendIdentifier) {
                    // First weekend creation
                    const prefix = currentGender.charAt(0).toUpperCase() + currentGender.slice(1) + "'s ";
                    const firstWeekendId = `${prefix}1`;
                    return (
                      <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                        Creating your first weekend: <strong>{firstWeekendId}</strong>
                      </div>
                    );
                  }
                  
                  // Subsequent weekend with Rover promotion
                  const rover = teamRoster.find(m => m.role === 'Rover');
                  const currentWeekendNum = parseInt(weekendIdentifier.match(/\d+/)?.[0] || '0', 10);
                  const nextWeekendNum = currentWeekendNum + 1;
                  const nextWeekendId = weekendIdentifier.replace(/\d+$/, nextWeekendNum.toString());
                  
                  return (
                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                      {rover ? (
                        <>
                          <strong>{rover.name}</strong> (current Rover) will become <strong>Rector</strong> for <strong>{nextWeekendId}</strong>
                        </>
                      ) : (
                        <span style={{ color: '#dc3545' }}>⚠️ No Rover assigned to current team</span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <button 
                className="btn btn-small"
                onClick={() => setShowSetupNextWeekend(false)}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                Close ✕
              </button>
            </div>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {/* Left Column */}
              <div>
                <div className="field">
                  <label className="label">Weekend Theme *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Stand Firm"
                    value={nextWeekendTheme}
                    onChange={(e) => setNextWeekendTheme(e.target.value)}
                  />
                </div>
                
                <div className="field">
                  <label className="label">Scripture Verse *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., John 3:16"
                    value={nextWeekendVerse}
                    onChange={(e) => setNextWeekendVerse(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Theme Song</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Amazing Grace"
                    value={nextWeekendThemeSong}
                    onChange={(e) => setNextWeekendThemeSong(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Start Date</label>
                  <DatePicker
                    value={nextWeekendStartDate}
                    onChange={(dateValue) => {
                      setNextWeekendStartDate(dateValue);
                      // Auto-calculate end date (4 days after start)
                      if (dateValue) {
                        const start = new Date(dateValue);
                        start.setDate(start.getDate() + 4);
                        setNextWeekendEndDate(start.toISOString().split('T')[0]);
                      }
                    }}
                    placeholder="Select start date"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                    End date will auto-calculate to 4 days later
                  </div>
                </div>

                <div className="field">
                  <label className="label">End Date</label>
                  <DatePicker
                    value={nextWeekendEndDate}
                    onChange={(dateValue) => setNextWeekendEndDate(dateValue)}
                    placeholder="Select end date"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="field">
                  <label className="label">Weekend Image</label>
                  <div style={{ 
                    position: 'relative',
                    border: '2px dashed var(--border)',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--panel-header)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accentB)';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 163, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.backgroundColor = 'var(--panel-header)';
                  }}
                  onClick={() => document.getElementById('weekendImageUpload').click()}
                  >
                    <input
                      id="weekendImageUpload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          // Validate file size (5MB max)
                          if (file.size > 5 * 1024 * 1024) {
                            window.showMainStatus?.('Image must be 5MB or less', true);
                            e.target.value = '';
                            return;
                          }
                          setNextWeekendImage(file);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    {!nextWeekendImage ? (
                      <>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px', color: 'var(--ink)' }}>
                          Click to upload image
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          JPG, PNG, or WebP • Max 5MB
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✓</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accentA)' }}>
                          {nextWeekendImage.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                          {(nextWeekendImage.size / 1024).toFixed(1)} KB
                        </div>
                        <button
                          className="btn btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNextWeekendImage(null);
                            document.getElementById('weekendImageUpload').value = '';
                          }}
                          style={{ 
                            marginTop: '8px',
                            padding: '4px 12px',
                            fontSize: '0.75rem'
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)'
            }}>
              <button 
                className="btn"
                onClick={() => {
                  setShowSetupNextWeekend(false);
                  setNextWeekendTheme('');
                  setNextWeekendVerse('');
                  setNextWeekendThemeSong('');
                  setNextWeekendStartDate('');
                  setNextWeekendEndDate('');
                  setNextWeekendImage(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateNextWeekend}
                disabled={!nextWeekendTheme.trim() || !nextWeekendVerse.trim() || isCreatingNextWeekend}
                style={{
                  backgroundColor: '#28a745',
                  borderColor: '#28a745'
                }}
              >
                {isCreatingNextWeekend ? 'Creating...' : (weekendIdentifier ? 'Create Next Weekend' : 'Create First Weekend')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div 
          style={{ 
            width: showBadgePanel ? '70%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pescadoresLoading ? (
              <div className="progress-bar-container">
                <div className="progress-bar-label">Loading Data...</div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill"></div>
                </div>
              </div>
            ) : (
              <>
                {renderRectorSection()}
                {renderLeadershipSection()}
                {renderProfessorSection()}
                {unifiedTeamGroups.map(group => renderUnifiedTeamSection(group))}
              </>
            )}
          </div>
        </div>

        {/* Badge Export Panel */}
        {showBadgePanel && (
          <div 
            className="card pad"
            style={{
              width: '30%',
              animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid var(--accentB)'
            }}>
              <h3 style={{ margin: 0, color: 'var(--accentB)', fontSize: '1.1rem' }}>Export Badge CSV</h3>
              <button className="btn btn-small" onClick={handleCloseBadgePanel} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Close ✕</button>
            </div>

            <div className="field">
              <label className="label">Weekend</label>
              <div style={{ fontWeight: 600 }}>{weekendIdentifier}</div>
            </div>
            <div className="field">
              <label className="label">Community</label>
              <div style={{ fontWeight: 600 }}>{badgeCommunity}</div>
            </div>

            <div className="field">
              <label className="label">Export Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="exportType" 
                    value="team" 
                    checked={badgeExportType === 'team'} 
                    onChange={(e) => setBadgeExportType(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Team Only ({teamRoster.length})</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="exportType" 
                    value="candidates" 
                    checked={badgeExportType === 'candidates'} 
                    onChange={(e) => setBadgeExportType(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Candidates Only ({candidates.length})</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="exportType" 
                    value="both" 
                    checked={badgeExportType === 'both'} 
                    onChange={(e) => setBadgeExportType(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Team + Candidates ({teamRoster.length + candidates.length})</span>
                </label>
              </div>
            </div>

            <div className="field">
              <label className="label">Scripture Verse</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g., John 3:16" 
                value={badgeScripture} 
                onChange={(e) => setBadgeScripture(e.target.value)} 
              />
            </div>
            <div className="field">
              <label className="label">Weekend Theme</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g., Stand Firm" 
                value={badgeTheme} 
                onChange={(e) => setBadgeTheme(e.target.value)} 
              />
            </div>

            <div className="field">
              <label className="label">Professor Positions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="profPosition" 
                    value="show" 
                    checked={badgeProfPosition === 'show'} 
                    onChange={(e) => setBadgeProfPosition(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Show Position (Silent, Ideals, etc.)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="profPosition" 
                    value="blank" 
                    checked={badgeProfPosition === 'blank'} 
                    onChange={(e) => setBadgeProfPosition(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Leave Blank</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="profPosition" 
                    value="table-leader" 
                    checked={badgeProfPosition === 'table-leader'} 
                    onChange={(e) => setBadgeProfPosition(e.target.value)} 
                    style={{ marginRight: '8px' }} 
                  />
                  <span>Show "Table Leader"</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn" onClick={handleCloseBadgePanel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerateBadgeCSV}>Generate CSV</button>
            </div>
          </div>
        )}
      </div>

      {/* Change Role Modal */}
      {showChangeRoleModal && changingMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'var(--panel)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            width: '90%',
            maxWidth: '800px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--panel-header)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
                Change Role
              </h3>
            </div>

            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '4px' }}>Member:</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>{changingMember.name}</div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '6px' }}>Current Role:</div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 700, 
                  color: 'var(--accentB)',
                  padding: '8px 12px',
                  backgroundColor: 'var(--panel-header)',
                  borderRadius: '6px',
                  border: '2px solid var(--accentB)'
                }}>
                  {changingMember.currentRole}
                </div>
              </div>

              <div>
                <label className="label" style={{ display: 'block', marginBottom: '12px' }}>Select New Role:</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {['Rector', 'BUR', 'Rover', 'Head', 'Asst Head', 'Head Spiritual Director', 'Spiritual Director', 'Head Prayer', 'Prayer', 'Head Kitchen', 'Asst Head Kitchen', 'Kitchen', 'Head Table', 'Table', 'Head Chapel', 'Chapel', 'Head Dorm', 'Dorm', 'Head Palanca', 'Palanca', 'Head Gopher', 'Gopher', 'Head Storeroom', 'Storeroom', 'Head Floater Supply', 'Floater Supply', 'Head Worship', 'Worship', 'Head Media', 'Media'].map(role => (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className="btn btn-small"
                      style={{
                        padding: '10px 13px',
                        fontSize: '0.8rem',
                        backgroundColor: newRole === role ? 'var(--accentB)' : 'transparent',
                        color: newRole === role ? 'white' : 'var(--ink)',
                        border: newRole === role ? 'none' : '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {role}
                    </button>
                  ))}
                  
                  {[
                    { value: 'Prof_Silent', label: 'Silent' },
                    { value: 'Prof_Ideals', label: 'Ideals' },
                    { value: 'Prof_Church', label: 'Church' },
                    { value: 'Prof_Piety', label: 'Piety' },
                    { value: 'Prof_Study', label: 'Study' },
                    { value: 'Prof_Action', label: 'Action' },
                    { value: 'Prof_Leaders', label: 'Leaders' },
                    { value: 'Prof_Environments', label: 'Environments' },
                    { value: 'Prof_CCIA', label: 'CCIA' },
                    { value: 'Prof_Reunion', label: 'Reunion' }
                  ].map(role => (
                    <button
                      key={role.value}
                      onClick={() => setNewRole(role.value)}
                      className="btn btn-small"
                      style={{
                        padding: '10px 13px',
                        fontSize: '0.8rem',
                        backgroundColor: newRole === role.value ? 'var(--accentB)' : 'transparent',
                        color: newRole === role.value ? 'white' : 'var(--ink)',
                        border: newRole === role.value ? 'none' : '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: 'var(--panel-header)'
            }}>
              <button 
                className="btn"
                onClick={() => {
                  setShowChangeRoleModal(false);
                  setChangingMember(null);
                  setNewRole('');
                }}
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleConfirmRoleChange}
                disabled={!newRole}
                style={{ minWidth: '100px' }}
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Database Modal */}
      {showUpdateModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
              Update Database for {weekendIdentifier}?
            </h3>
            <p style={{ marginBottom: '20px', color: '#666', lineHeight: '1.6' }}>
              This will {testMode ? 'preview updating' : 'update'} <strong>{teamRoster.length} team member{teamRoster.length > 1 ? 's' : ''}</strong> with their service information:
            </p>
            <ul style={{ marginBottom: '25px', paddingLeft: '20px', color: '#666' }}>
              <li><strong>Last Service:</strong> Set to "{weekendIdentifier}"</li>
              <li><strong>Quantity:</strong> Increment by 1</li>
              <li><strong>Status:</strong> Upgrade N→I or I→E (if applicable)</li>
            </ul>
            <p style={{ marginBottom: '25px', fontSize: '14px', color: testMode ? '#856404' : '#dc3545', fontWeight: 500 }}>
              {testMode 
                ? '💡 Test mode: Results will be shown in browser console. No database changes will be made.' 
                : '⚠️ This action cannot be undone. Only the specific roles assigned on this team will be updated.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowUpdateModal(false)}
                disabled={isUpdating}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                disabled={isUpdating}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                {isUpdating ? 'Processing...' : testMode ? '🧪 Run Test' : '⚡ Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        #team-list-app .table {
          margin-bottom: 0;
          vertical-align: top;
        }
        
        #team-list-app .table td,
        #team-list-app .table th {
          height: 44px;
          min-height: 44px;
          max-height: 44px;
          vertical-align: middle;
        }
        
        #team-list-app .table tbody tr {
          height: 44px;
          min-height: 44px;
          max-height: 44px;
        }
        
        #team-list-app .table tbody tr.expanded-row {
          height: auto;
          min-height: auto;
          max-height: none;
        }
        
        #team-list-app .table tbody tr.expanded-row td {
          height: auto;
          min-height: auto;
          max-height: none;
          padding-top: 0;
          padding-bottom: 12px;
        }
        
        #team-list-app .table td {
          font-size: 0.85rem;
        }
        
        #team-list-app tr.expanded-row {
          animation: expandRow 0.2s ease-out;
        }
        
        @keyframes expandRow {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        #team-list-app tr.removing {
          animation: fadeOut 0.3s ease-in-out forwards;
        }
        
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }
      `}</style>
    </section>
  );
}