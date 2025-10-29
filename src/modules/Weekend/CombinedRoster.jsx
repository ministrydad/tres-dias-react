// src/modules/Weekend/CombinedRoster.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer, Image, Font } from '@react-pdf/renderer';

// Register Source Sans 3 font from local TTF files
Font.register({
  family: 'Source Sans 3',
  fonts: [
    {
      src: '/fonts/SourceSans3-Regular.ttf',
      fontWeight: 400,
    },
    {
      src: '/fonts/SourceSans3-Italic.ttf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/SourceSans3-SemiBold.ttf',
      fontWeight: 600,
    },
    {
      src: '/fonts/SourceSans3-Bold.ttf',
      fontWeight: 700,
    },
  ],
});

// PDF Styles - Professional, compact design with Source Sans 3
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,  // Increased from 9 to 10
    fontFamily: 'Source Sans 3',
  },
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: '100%',
    paddingTop: 80,
  },
  coverTitle: {
    fontSize: 40,
    fontWeight: 700,
    marginBottom: 40,
    textAlign: 'center',
  },
  coverImage: {
    maxWidth: '85%',
    maxHeight: 380,
    marginBottom: 40,
    objectFit: 'contain',
    border: '1 solid #ddd',
    borderRadius: 4,
  },
  coverVerse: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 30,
    textAlign: 'center',
    color: '#555',
  },
  coverCommunityWeekend: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  coverDates: {
    fontSize: 11,
    textAlign: 'center',
    color: '#666',
  },
  sectionHeader: {
    fontSize: 17,  // Increased from 16
    fontWeight: 700,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '2 solid #333',
  },
  roleHeader: {
    fontSize: 11,  // Increased from 10
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
    color: '#2c5aa0',
    backgroundColor: '#f5f5f5',
    padding: '3 5',
  },
  roleHeaderCentered: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
    color: '#2c5aa0',
    backgroundColor: '#f5f5f5',
    padding: '3 5',
    textAlign: 'center',
  },
  twoColumnContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
  },
  threeColumnContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  column: {
    flex: 1,
    paddingLeft: 6,  // Increased indent adjustment for better alignment
  },
  columnNoIndent: {
    flex: 1,
    paddingLeft: 0,  // No indent for middle/right columns in 3-column layout
  },
  centerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  memberRow: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '0.5 solid #ddd',
  },
  memberName: {
    fontSize: 10,  // Increased from 9
    fontWeight: 700,
    marginBottom: 2,
  },
  memberDetails: {
    fontSize: 8.5,  // Increased from 7.5
    color: '#444',
    lineHeight: 1.3,
  },
  tableGroupHeader: {
    fontSize: 12,  // Increased from 11
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#e8e8e8',
    padding: '4 8',
    textAlign: 'center',
  },
  candidatesGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  candidateCard: {
    width: '48%',
    marginBottom: 6,
    padding: 6,
    backgroundColor: '#fafafa',
    borderRadius: 3,
    border: '0.5 solid #ddd',
  },
});

// PDF Document Component
const RosterPDFDocument = ({ 
  coverImage, 
  title, 
  verse, 
  communityName, 
  weekendIdentifier,
  weekendStartDate,
  weekendEndDate,
  teamMembers,
  candidates,
  roleOrder 
}) => {
  // Debug logging
  console.log('🎨 PDF Document rendering with:', {
    hasCoverImage: !!coverImage,
    coverImageType: coverImage ? typeof coverImage : 'none',
    coverImageLength: coverImage ? coverImage.length : 0,
    title,
    communityName,
    weekendIdentifier,
    weekendStartDate,
    weekendEndDate
  });
  
  // Format date range for PDF
  const formatDateRange = () => {
    if (!weekendStartDate || !weekendEndDate) return '';
    
    const start = new Date(weekendStartDate + 'T00:00:00');
    const end = new Date(weekendEndDate + 'T00:00:00');
    
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const startFormatted = start.toLocaleDateString('en-US', options);
    const endFormatted = end.toLocaleDateString('en-US', options);
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  return (
  <Document>
    {/* Cover Page */}
    <Page size="LETTER" style={styles.page}>
      <View style={styles.coverPage}>
        <Text style={styles.coverTitle}>{title}</Text>
        {coverImage && (
          <Image
            style={styles.coverImage}
            src={coverImage}
            cache={false}
          />
        )}
        {verse && <Text style={styles.coverVerse}>{verse}</Text>}
        <Text style={styles.coverCommunityWeekend}>
          {communityName} - {weekendIdentifier.replace(/^(Men's|Women's)\s*(\d+)$/i, "$1 Weekend #$2")}
        </Text>
        {weekendStartDate && weekendEndDate && (
          <Text style={styles.coverDates}>
            {formatDateRange()}
          </Text>
        )}
      </View>
    </Page>

    {/* Team Members Page 1 - Leadership Structure */}
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>Team Members</Text>
      
      {/* Rector - Full Width Header, Left-Aligned Info */}
      {(() => {
        const rectorMembers = teamMembers.filter(m => m.role === 'Rector');
        if (rectorMembers.length === 0) return null;
        
        return (
          <View wrap={false} style={{ marginBottom: 16 }}>
            <Text style={styles.roleHeader}>Rector</Text>
            <View style={styles.twoColumnContainer}>
              <View style={styles.column}>
                {rectorMembers.filter((_, idx) => idx % 2 === 0).map((member, idx) => (
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
              <View style={styles.column}>
                {rectorMembers.filter((_, idx) => idx % 2 === 1).map((member, idx) => (
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
            </View>
          </View>
        );
      })()}
      
      {/* Row 2: BUR, Head, Asst Head */}
      <View style={styles.threeColumnContainer} wrap={false}>
        {['BUR', 'Head', 'Asst Head'].map((role, colIdx) => {
          const members = teamMembers.filter(m => m.role === role);
          if (members.length === 0) return <View key={role} style={colIdx === 0 ? styles.column : styles.columnNoIndent} />;
          
          return (
            <View key={role} style={colIdx === 0 ? styles.column : styles.columnNoIndent}>
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
      
      {/* Row 3: Head Spiritual Director, Spiritual Director(s), Rover */}
      <View style={styles.threeColumnContainer} wrap={false}>
        {['Head Spiritual Director', 'Spiritual Director', 'Rover'].map((role, colIdx) => {
          const members = teamMembers.filter(m => m.role === role);
          if (members.length === 0) return <View key={role} style={colIdx === 0 ? styles.column : styles.columnNoIndent} />;
          
          return (
            <View key={role} style={colIdx === 0 ? styles.column : styles.columnNoIndent}>
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
    </Page>

    {/* Team Members Page 2+ - Service Teams and Professors */}
    <Page size="LETTER" style={styles.page}>
      
      {/* All non-professor, non-leadership roles */}
      {roleOrder.filter(role => 
        !['Rector', 'BUR', 'Head', 'Asst Head', 'Head Spiritual Director', 'Spiritual Director', 'Rover'].includes(role) &&
        !role.startsWith('Prof_')
      ).map(role => {
        const members = teamMembers.filter(m => m.role === role);
        if (members.length === 0) return null;
        
        return (
          <View key={role} wrap={false} style={{ marginBottom: 8 }}>
            <Text style={styles.roleHeader}>{role}</Text>
            <View style={styles.twoColumnContainer}>
              <View style={styles.column}>
                {members.filter((_, idx) => idx % 2 === 0).map((member, idx) => (
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
              
              <View style={styles.column}>
                {members.filter((_, idx) => idx % 2 === 1).map((member, idx) => (
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
            <Text style={styles.roleHeader}>Professors</Text>
            <View style={styles.twoColumnContainer}>
              <View style={styles.column}>
                {allProfessors.filter((_, idx) => idx % 2 === 0).map((member, idx) => (
                  <View key={idx} style={styles.memberRow}>
                    <Text style={styles.memberName}>{member.name} ({member.displayRole})</Text>
                    <Text style={styles.memberDetails}>
                      {member.address && `${member.address}\n`}
                      {member.email && `${member.email}\n`}
                      {member.phone && `${member.phone}\n`}
                      {member.church && `${member.church}`}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.column}>
                {allProfessors.filter((_, idx) => idx % 2 === 1).map((member, idx) => (
                  <View key={idx} style={styles.memberRow}>
                    <Text style={styles.memberName}>{member.name} ({member.displayRole})</Text>
                    <Text style={styles.memberDetails}>
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

    {/* Candidates Pages - All tables together, 2 candidates per row */}
    {Object.keys(candidates).length > 0 && (
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Pescadores</Text>
        
        {Object.entries(candidates).map(([tableName, tableMembers]) => {
          if (tableMembers.length === 0) return null;
          
          return (
            <View key={tableName} wrap={false} style={{ marginBottom: 12 }}>
              <Text style={styles.tableGroupHeader}>Table of {tableName}</Text>
              <View style={styles.candidatesGrid}>
                {tableMembers.map((candidate, idx) => (
                  <View key={idx} style={styles.candidateCard}>
                    <Text style={styles.memberName}>{candidate.name}</Text>
                    <Text style={styles.memberDetails}>
                      {candidate.address && `${candidate.address}\n`}
                      {candidate.phone && `${candidate.phone}\n`}
                      {candidate.email && `${candidate.email}\n`}
                      {candidate.church && `${candidate.church}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </Page>
    )}
  </Document>
  );
};

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
  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [weekendStartDate, setWeekendStartDate] = useState('');
  const [weekendEndDate, setWeekendEndDate] = useState('');
  
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
      // Reset candidates and PDF when gender changes
      setCandidates([]);
      setTableAssignments({});
      setPdfReady(false);
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

  const handleStartDateChange = (e) => {
    const startDate = e.target.value;
    setWeekendStartDate(startDate);
    
    if (startDate) {
      // Add 3 days to get the end date (Thursday to Sunday)
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(start);
      end.setDate(start.getDate() + 3);
      
      // Format as YYYY-MM-DD for the input
      const endDateStr = end.toISOString().split('T')[0];
      setWeekendEndDate(endDateStr);
    } else {
      setWeekendEndDate('');
    }
  };

  const formatDateRange = () => {
    if (!weekendStartDate || !weekendEndDate) return '';
    
    const start = new Date(weekendStartDate + 'T00:00:00');
    const end = new Date(weekendEndDate + 'T00:00:00');
    
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const startFormatted = start.toLocaleDateString('en-US', options);
    const endFormatted = end.toLocaleDateString('en-US', options);
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const handleImageUpload = (e) => {
    console.log('🎬 handleImageUpload called, event:', e.target.files);
    const file = e.target.files[0];
    if (file) {
      console.log('📁 File selected:', file.name, file.size, file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        console.log('📸 Image uploaded:', {
          type: file.type,
          size: file.size,
          dataUrlLength: result.length,
          startsWithDataUrl: result.startsWith('data:')
        });
        
        // Compress image for PDF (large images cause rendering issues)
        const img = new window.Image();
        img.onload = () => {
          console.log('🖼️ Image loaded for compression, dimensions:', img.width, 'x', img.height);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Max dimensions for PDF (keeps reasonable file size)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with good quality (reduces file size significantly)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          
          console.log('✅ Image compressed:', {
            originalSize: result.length,
            compressedSize: compressedDataUrl.length,
            reduction: `${Math.round((1 - compressedDataUrl.length / result.length) * 100)}%`,
            dimensions: `${width}x${height}`
          });
          
          setCoverImage(compressedDataUrl);
          setCoverImagePreview(compressedDataUrl);
          console.log('💾 State updated with compressed image');
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    } else {
      console.log('❌ No file selected');
    }
  };

  const handleLoadRoster = async () => {
    if (!weekendIdentifier) {
      window.showMainStatus?.('Please select a weekend', true);
      return;
    }

    console.log('🔄 Loading roster... Current coverImage length:', coverImage ? coverImage.length : 0);

    setLoading(true);
    setPdfReady(false);

    try {
      // Load team members
      await loadTeamMembers();
      
      // Load candidates
      await loadCandidates();
      
      setPdfReady(true);
      console.log('✅ Roster loaded. CoverImage still exists:', !!coverImage);
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
      console.log('🔍 Loading candidates for gender:', currentGender);
      
      const { data, error } = await supabase
        .from('cra_applications')
        .select('*')
        .eq('org_id', orgId);

      if (error) throw error;

      console.log('📊 Total applications from database:', data?.length || 0);

      const candidatesList = (data || [])
        .map(c => {
          let firstName, preferredName, lastName, email, phone;
          
          if (currentGender === 'men') {
            firstName = c.m_first || '';
            preferredName = c.m_pref || '';
            lastName = c.c_lastname || '';
            email = c.m_email || '';
            phone = c.m_cell || '';
            
            // Skip if no male candidate exists OR if attendance is 'no'
            if ((!firstName && !preferredName) || c.attendance === 'no') {
              return null;
            }
          } else {
            firstName = c.f_first || '';
            preferredName = c.f_pref || '';
            lastName = c.c_lastname || '';
            email = c.f_email || '';
            phone = c.f_cell || '';
            
            // Skip if no female candidate exists OR if attendance is 'no'
            if ((!firstName && !preferredName) || c.attendance === 'no') {
              return null;
            }
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

      console.log('✅ Filtered candidates for', currentGender, ':', candidatesList.length);
      console.log('Candidate names:', candidatesList.map(c => c.name));

      setCandidates(candidatesList);
      
      // Initialize table assignments
      const initialAssignments = {};
      candidatesList.forEach(c => {
        initialAssignments[c.id] = '';
      });
      setTableAssignments(initialAssignments);
    } catch (error) {
      console.error('❌ Error loading candidates:', error);
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

        {/* Cover Page Settings */}
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>
            Cover Page Settings
          </h3>
          
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
              <label className="label">Weekend Start Date</label>
              <input 
                type="date"
                className="input"
                value={weekendStartDate}
                onChange={handleStartDateChange}
              />
              {weekendEndDate && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                  Dates: {formatDateRange()}
                </div>
              )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label 
                  htmlFor="coverImageUpload" 
                  className={coverImagePreview ? "btn" : "btn"}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: coverImagePreview ? 'var(--accentB)' : undefined,
                    color: coverImagePreview ? 'white' : undefined,
                    border: coverImagePreview ? 'none' : undefined
                  }}
                >
                  {coverImagePreview ? 'Image Selected' : 'Choose Image'}
                </label>
                <input 
                  id="coverImageUpload"
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Any size accepted (auto-optimized for PDF)
                </span>
              </div>
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
        </div>

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

      {/* Candidate Table Assignment Section - Button Grid Interface */}
      {pdfReady && candidates.length > 0 && (
        <div className="card pad" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="section-title" style={{ margin: 0 }}>Assign Candidates to Tables</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {candidates.filter(c => tableAssignments[c.id]).length} / {candidates.length} assigned
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {candidates.map(candidate => (
              <div key={candidate.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '8px',
                backgroundColor: tableAssignments[candidate.id] ? 'var(--panel-header)' : 'transparent',
                borderRadius: '4px',
                border: tableAssignments[candidate.id] ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ flex: '0 0 200px', fontWeight: 600, fontSize: '0.9rem' }}>
                  {candidate.name}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {tableNames.map(table => (
                    <button
                      key={table}
                      className={`btn btn-small ${tableAssignments[candidate.id] === table ? 'btn-primary' : ''}`}
                      onClick={() => handleTableAssignment(candidate.id, table)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        minWidth: '80px',
                        backgroundColor: tableAssignments[candidate.id] === table ? 'var(--accentB)' : 'transparent',
                        color: tableAssignments[candidate.id] === table ? 'white' : 'var(--ink)',
                        border: tableAssignments[candidate.id] === table ? 'none' : '1px solid var(--border)'
                      }}
                    >
                      {table}
                    </button>
                  ))}
                  {tableAssignments[candidate.id] && (
                    <button
                      className="btn btn-small"
                      onClick={() => handleTableAssignment(candidate.id, '')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        color: 'var(--accentD)',
                        border: '1px solid var(--accentD)'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                    weekendStartDate={weekendStartDate}
                    weekendEndDate={weekendEndDate}
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
                  weekendStartDate={weekendStartDate}
                  weekendEndDate={weekendEndDate}
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