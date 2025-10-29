// src/modules/Weekend/CombinedRoster.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer, Image } from '@react-pdf/renderer';

// PDF Styles - Optimized 2-column layout
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverVerse: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 15,
    textAlign: 'center',
    color: '#555',
  },
  coverCommunity: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverWeekend: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
    paddingBottom: 6,
    borderBottom: '2 solid #333',
  },
  roleHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    color: '#2c5aa0',
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  twoColumnContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
  },
  column: {
    flex: 1,
  },
  memberRow: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1 solid #e0e0e0',
  },
  memberName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  memberDetails: {
    fontSize: 8,
    color: '#555',
    lineHeight: 1.4,
  },
  tableGroupHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#e8e8e8',
    padding: 6,
  },
});

// PDF Document Component
const RosterPDFDocument = ({ 
  coverImage, 
  title, 
  verse, 
  communityName, 
  weekendIdentifier,
  teamMembers,
  candidates,
  roleOrder 
}) => (
  <Document>
    {/* Cover Page */}
    <Page size="LETTER" style={styles.page}>
      <View style={styles.coverPage}>
        {coverImage && (
          <Image
            style={styles.coverImage}
            src={coverImage}
          />
        )}
        <Text style={styles.coverTitle}>{title}</Text>
        {verse && <Text style={styles.coverVerse}>{verse}</Text>}
        <Text style={styles.coverCommunity}>{communityName}</Text>
        <Text style={styles.coverWeekend}>{weekendIdentifier}</Text>
      </View>
    </Page>

    {/* Team Members Pages - 2 Column Layout */}
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>Team Members</Text>
      
      <View style={styles.twoColumnContainer}>
        <View style={styles.column}>
          {roleOrder.slice(0, Math.ceil(roleOrder.length / 2)).map(role => {
            const members = teamMembers.filter(m => m.role === role);
            if (members.length === 0) return null;
            
            return (
              <View key={role} wrap={false}>
                <Text style={styles.roleHeader}>{role}</Text>
                {members.map((member, idx) => (
                  <View key={idx} style={styles.memberRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberDetails}>
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
        
        <View style={styles.column}>
          {roleOrder.slice(Math.ceil(roleOrder.length / 2)).map(role => {
            const members = teamMembers.filter(m => m.role === role);
            if (members.length === 0) return null;
            
            return (
              <View key={role} wrap={false}>
                <Text style={styles.roleHeader}>{role}</Text>
                {members.map((member, idx) => (
                  <View key={idx} style={styles.memberRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberDetails}>
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
      </View>
    </Page>

    {/* Candidates Pages - Grouped by Table with 2-column layout */}
    {Object.entries(candidates).map(([tableName, tableMembers]) => {
      if (tableMembers.length === 0) return null;
      
      const midpoint = Math.ceil(tableMembers.length / 2);
      const leftColumn = tableMembers.slice(0, midpoint);
      const rightColumn = tableMembers.slice(midpoint);
      
      return (
        <Page key={tableName} size="LETTER" style={styles.page}>
          <Text style={styles.tableGroupHeader}>Table: {tableName}</Text>
          <View style={styles.twoColumnContainer}>
            <View style={styles.column}>
              {leftColumn.map((candidate, idx) => (
                <View key={idx} style={styles.memberRow} wrap={false}>
                  <Text style={styles.memberName}>{candidate.name}</Text>
                  <Text style={styles.memberDetails}>
                    {candidate.address && `${candidate.address}\n`}
                    {candidate.email && `${candidate.email}\n`}
                    {candidate.phone && `${candidate.phone}\n`}
                    {candidate.church && `${candidate.church}`}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.column}>
              {rightColumn.map((candidate, idx) => (
                <View key={idx} style={styles.memberRow} wrap={false}>
                  <Text style={styles.memberName}>{candidate.name}</Text>
                  <Text style={styles.memberDetails}>
                    {candidate.address && `${candidate.address}\n`}
                    {candidate.email && `${candidate.email}\n`}
                    {candidate.phone && `${candidate.phone}\n`}
                    {candidate.church && `${candidate.church}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Page>
      );
    })}
  </Document>
);

export default function CombinedRoster() {
  const { orgId } = useAuth();
  const { allPescadores, loading: pescadoresLoading } = usePescadores();
  
  const [currentGender, setCurrentGender] = useState('men');
  const [weekendIdentifier, setWeekendIdentifier] = useState('');
  const [availableWeekends, setAvailableWeekends] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Cover page inputs
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [title, setTitle] = useState('A New Creation');
  const [verse, setVerse] = useState('');
  const [communityName, setCommunityName] = useState('');
  
  // Roster data
  const [teamMembers, setTeamMembers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  
  // Table assignments
  const [tableAssignments, setTableAssignments] = useState({});
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  // Table names for men and women
  const MEN_TABLES = ['John', 'Paul', 'Matthew', 'Mark', 'Luke'];
  const WOMEN_TABLES = ['Esther', 'Elizabeth', 'Ruth', 'Mary', 'Deborah'];

  // Role order (from TeamList.jsx)
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

  // Load community name on mount
  useEffect(() => {
    loadCommunityName();
  }, [orgId]);

  // Load available weekends when gender changes
  useEffect(() => {
    if (orgId) {
      loadAvailableWeekends();
    }
  }, [currentGender, orgId]);

  const loadCommunityName = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('community_name')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setCommunityName(data?.community_name || '');
    } catch (error) {
      console.error('Error loading community name:', error);
      window.showMainStatus?.('Failed to load community name', true);
    }
  };

  const loadAvailableWeekends = async () => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    
    try {
      const { data, error } = await supabase
        .from(rosterTable)
        .select('weekend_identifier')
        .eq('org_id', orgId);

      if (error) throw error;

      // Get unique weekend identifiers
      const uniqueWeekends = [...new Set(data.map(d => d.weekend_identifier))];
      setAvailableWeekends(uniqueWeekends);
      
      // Auto-select the latest weekend
      if (uniqueWeekends.length > 0) {
        const prefix = currentGender.charAt(0).toUpperCase() + currentGender.slice(1) + "'s ";
        let latest = { number: 0, identifier: null };
        
        uniqueWeekends.forEach(id => {
          const idStr = (id || '').trim();
          if (idStr.startsWith(prefix)) {
            const num = parseInt(idStr.match(/\d+/)?.[0] || '0', 10);
            if (num > latest.number) {
              latest = { number: num, identifier: idStr };
            }
          }
        });
        
        if (latest.identifier) {
          setWeekendIdentifier(latest.identifier);
        }
      }
    } catch (error) {
      console.error('Error loading weekends:', error);
      window.showMainStatus?.('Failed to load weekends', true);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadRoster = async () => {
    if (!weekendIdentifier) {
      window.showMainStatus?.('Please select a weekend', true);
      return;
    }

    setLoading(true);
    setPdfReady(false);

    try {
      // Load team members
      await loadTeamMembers();
      
      // Load candidates
      await loadCandidates();
      
      setPdfReady(true);
      window.showMainStatus?.('Roster data loaded successfully', false);
    } catch (error) {
      console.error('Error loading roster:', error);
      window.showMainStatus?.(`Failed to load roster: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    const rawTable = currentGender === 'men' ? 'men_raw' : 'women_raw';
    const rawTableData = allPescadores[currentGender];

    const { data, error } = await supabase
      .from(rosterTable)
      .select('pescadore_key, role')
      .eq('weekend_identifier', weekendIdentifier)
      .eq('org_id', orgId);

    if (error) throw error;

    const members = [];
    if (data) {
      data.forEach(entry => {
        const profile = rawTableData.find(p => p.PescadoreKey === entry.pescadore_key);
        if (profile) {
          members.push({
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

    setTeamMembers(members);
  };

  const loadCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('cra_applications')
        .select('*')
        .eq('org_id', orgId)
        .neq('attendance', 'no');

      if (error) throw error;

      const candidatesList = (data || [])
        .map(c => {
          let firstName, preferredName, lastName, email, phone;
          
          if (currentGender === 'men') {
            // Check if this application has a male candidate
            if (!c.m_first && !c.m_pref) return null;
            
            firstName = c.m_first || '';
            preferredName = c.m_pref || '';
            lastName = c.c_lastname || '';
            email = c.m_email || '';
            phone = c.m_cell || '';
          } else {
            // Check if this application has a female candidate
            if (!c.f_first && !c.f_pref) return null;
            
            firstName = c.f_first || '';
            preferredName = c.f_pref || '';
            lastName = c.c_lastname || '';
            email = c.f_email || '';
            phone = c.f_cell || '';
          }

          // Use preferred name if available, otherwise first name
          const displayName = `${preferredName || firstName} ${lastName}`.trim();
          
          if (!displayName) return null;

          return {
            id: c.id,
            name: displayName,
            email,
            phone,
            address: `${c.c_address || ''}, ${c.c_city || ''}, ${c.c_state || ''} ${c.c_zip || ''}`.trim(),
            church: c.c_church || ''
          };
        })
        .filter(c => c !== null);

      setCandidates(candidatesList);
      
      // Initialize table assignments
      const initialAssignments = {};
      candidatesList.forEach(c => {
        initialAssignments[c.id] = '';
      });
      setTableAssignments(initialAssignments);
    } catch (error) {
      console.error('Error loading candidates:', error);
      throw error;
    }
  };

  const handleTableAssignment = (candidateId, tableName) => {
    setTableAssignments(prev => ({
      ...prev,
      [candidateId]: tableName
    }));
  };

  const getCandidatesGroupedByTable = () => {
    const grouped = {};
    const tableNames = currentGender === 'men' ? MEN_TABLES : WOMEN_TABLES;
    
    // Initialize all tables
    tableNames.forEach(table => {
      grouped[table] = [];
    });
    
    // Group candidates by their assigned table
    candidates.forEach(candidate => {
      const table = tableAssignments[candidate.id];
      if (table && grouped[table]) {
        grouped[table].push(candidate);
      }
    });
    
    return grouped;
  };

  const allCandidatesAssigned = () => {
    return candidates.every(c => tableAssignments[c.id] && tableAssignments[c.id].trim() !== '');
  };

  const tableNames = currentGender === 'men' ? MEN_TABLES : WOMEN_TABLES;

  return (
    <section id="combined-roster-app" className="app-panel" style={{ display: 'block', padding: 0 }}>
      <div className="card pad" style={{ marginBottom: '12px' }}>
        <div className="section-title" style={{ marginBottom: '16px' }}>Combined Weekend Roster</div>
        
        {/* Compact form layout - 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Gender Toggle */}
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Gender</label>
            <div className="toggle" style={{ maxWidth: '250px' }}>
              <div 
                className={`opt ${currentGender === 'men' ? 'active' : ''}`}
                onClick={() => setCurrentGender('men')}
              >
                Men
              </div>
              <div 
                className={`opt ${currentGender === 'women' ? 'active' : ''}`}
                onClick={() => setCurrentGender('women')}
              >
                Women
              </div>
            </div>
          </div>

          {/* Weekend Selection */}
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Weekend</label>
            <select 
              className="input" 
              value={weekendIdentifier}
              onChange={(e) => setWeekendIdentifier(e.target.value)}
            >
              <option value="">-- Select Weekend --</option>
              {availableWeekends.map(weekend => (
                <option key={weekend} value={weekend}>{weekend}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cover Page Settings - Collapsible */}
        <details open style={{ marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px' }}>
          <summary style={{ fontWeight: 600, cursor: 'pointer', marginBottom: '12px', fontSize: '0.95rem' }}>
            Cover Page Settings
          </summary>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Title</label>
              <input 
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., A New Creation"
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Scripture Verse (optional)</label>
              <input 
                type="text"
                className="input"
                value={verse}
                onChange={(e) => setVerse(e.target.value)}
                placeholder="e.g., 2 Corinthians 5:17"
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Community Name</label>
              <input 
                type="text"
                className="input"
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Cover Image (optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="input"
              />
            </div>
          </div>

          {coverImagePreview && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <img 
                src={coverImagePreview} 
                alt="Cover preview" 
                style={{ maxWidth: '150px', maxHeight: '150px', border: '1px solid var(--border)', borderRadius: '4px' }}
              />
            </div>
          )}
        </details>

        {/* Load Roster Button */}
        <div>
          <button 
            className="btn btn-primary"
            onClick={handleLoadRoster}
            disabled={loading || !weekendIdentifier}
          >
            {loading ? 'Loading...' : 'Load Roster Data'}
          </button>
        </div>
      </div>

      {/* Candidate Table Assignment Section - More Compact */}
      {pdfReady && candidates.length > 0 && (
        <div className="card pad" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="section-title" style={{ margin: 0 }}>Assign Candidates to Tables</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {candidates.filter(c => tableAssignments[c.id]).length} / {candidates.length} assigned
            </div>
          </div>
          
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Candidate Name</th>
                <th style={{ width: '40%' }}>Table Assignment</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => (
                <tr key={candidate.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.9rem' }}>{candidate.name}</td>
                  <td>
                    <select
                      className="input"
                      value={tableAssignments[candidate.id] || ''}
                      onChange={(e) => handleTableAssignment(candidate.id, e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '6px 8px' }}
                    >
                      <option value="">-- Select Table --</option>
                      {tableNames.map(table => (
                        <option key={table} value={table}>{table}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview and Download Section */}
      {pdfReady && (
        <div className="card pad">
          <div className="section-title">Preview & Download</div>
          
          {candidates.length > 0 && !allCandidatesAssigned() && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <strong style={{ color: '#856404' }}>⚠️ Warning:</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#856404' }}>
                Some candidates are not assigned to tables. Please assign all candidates before generating the PDF.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button 
              className="btn btn-primary"
              onClick={() => setShowPreview(!showPreview)}
              disabled={candidates.length > 0 && !allCandidatesAssigned()}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            
            {(candidates.length === 0 || allCandidatesAssigned()) && (
              <PDFDownloadLink
                document={
                  <RosterPDFDocument
                    coverImage={coverImage}
                    title={title}
                    verse={verse}
                    communityName={communityName}
                    weekendIdentifier={weekendIdentifier}
                    teamMembers={teamMembers}
                    candidates={getCandidatesGroupedByTable()}
                    roleOrder={ROLE_ORDER}
                  />
                }
                fileName={`${weekendIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}_Roster.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <button className="btn btn-primary" disabled={pdfLoading}>
                    {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            )}
          </div>

          {/* PDF Preview */}
          {showPreview && (candidates.length === 0 || allCandidatesAssigned()) && (
            <div style={{ 
              width: '100%', 
              height: '800px', 
              border: '1px solid var(--border)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <PDFViewer width="100%" height="100%">
                <RosterPDFDocument
                  coverImage={coverImage}
                  title={title}
                  verse={verse}
                  communityName={communityName}
                  weekendIdentifier={weekendIdentifier}
                  teamMembers={teamMembers}
                  candidates={getCandidatesGroupedByTable()}
                  roleOrder={ROLE_ORDER}
                />
              </PDFViewer>
            </div>
          )}
        </div>
      )}
    </section>
  );
}