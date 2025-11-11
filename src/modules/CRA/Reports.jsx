// src/modules/CRA/Reports.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer, Font } from '@react-pdf/renderer';

// Register Source Sans 3 font
Font.register({
  family: 'Source Sans 3',
  fonts: [
    {
      src: '/fonts/SourceSans3-Regular.ttf',
      fontWeight: 400,
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

// PDF Styles for Treasurer's Report
const pdfStyles = StyleSheet.create({
  page: {
    padding: 24,  // Reduced from 40
    fontSize: 8,   // Reduced from 9
    fontFamily: 'Source Sans 3',
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,  // Reduced from 20
    borderBottom: '1 solid #333',  // Thinner border
    paddingBottom: 8,  // Reduced from 12
  },
  title: {
    fontSize: 14,  // Reduced from 16
    fontWeight: 700,
    marginBottom: 4,  // Reduced from 6
  },
  subtitle: {
    fontSize: 8,  // Reduced from 9
    color: '#666',
    marginBottom: 2,  // Reduced from 3
  },
  section: {
    marginBottom: 10,  // Reduced from 16
  },
  sectionTitle: {
    fontSize: 10,  // Reduced from 11
    fontWeight: 700,
    marginBottom: 6,  // Reduced from 8
    backgroundColor: '#f5f5f5',
    padding: '3 6',  // Reduced from '5 8'
    borderLeft: '2 solid #2c5aa0',  // Thinner border
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,  // Reduced from 5
    paddingBottom: 2,  // Reduced from 3
    borderBottom: '0.5 solid #eee',
  },
  rowLabel: {
    fontSize: 8,  // Reduced from 9
    color: '#444',
  },
  rowValue: {
    fontSize: 8,  // Reduced from 9
    fontWeight: 600,
  },
  totalRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,  // Reduced from 6
    paddingTop: 4,  // Reduced from 6
    borderTop: '1.5 solid #333',
    marginBottom: 3,  // Reduced from 5
  },
  totalLabel: {
    fontSize: 9,  // Reduced from 10
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 9,  // Reduced from 10
    fontWeight: 700,
  },
  onlinePaymentRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,  // Reduced from 3
    paddingLeft: 6,  // Reduced from 8
  },
  onlinePaymentName: {
    fontSize: 7,  // Reduced from 8
    color: '#555',
  },
  grandTotalRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,  // Reduced from 8
    paddingTop: 6,  // Reduced from 8
    paddingBottom: 6,  // Reduced from 8
    borderTop: '1.5 solid #000',
    borderBottom: '1.5 solid #000',
    backgroundColor: '#f9f9f9',
    padding: '6 8',  // Reduced from '8 10'
  },
  grandTotalLabel: {
    fontSize: 10,  // Reduced from 11
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 10,  // Reduced from 11
    fontWeight: 700,
  },
  columnHeader: {
    fontSize: 11,  // Reduced from 12
    fontWeight: 700,
    textAlign: 'left',
    marginBottom: 6,  // Reduced from 8
    color: '#2c5aa0',
  },
  columnContent: {
    backgroundColor: '#fafafa',
    padding: 8,  // Reduced from 10
    borderRadius: 4,
  },
  subsectionTitle: {
    fontSize: 8,  // Reduced from 9
    fontWeight: 700,
    marginTop: 6,  // Reduced from 10
    marginBottom: 3,  // Reduced from 4
    color: '#666',
  },
  simpleRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,  // Reduced from 4
  },
  simpleLabel: {
    fontSize: 8,  // Reduced from 9
    color: '#444',
  },
  simpleValue: {
    fontSize: 8,  // Reduced from 9
    fontWeight: 600,
  },
  columnTotal: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,  // Reduced from 12
    paddingTop: 6,  // Reduced from 8
    borderTop: '1 solid #ccc',
  },
  columnTotalLabel: {
    fontSize: 9,  // Reduced from 10
    fontWeight: 700,
  },
  columnTotalValue: {
    fontSize: 9,  // Reduced from 10
    fontWeight: 700,
  },
  combinedSection: {
    backgroundColor: '#f5f5f5',
    padding: 8,  // Reduced from 12
    borderRadius: 4,
    marginBottom: 10,  // Reduced from 16
  },
  combinedHeader: {
    fontSize: 11,  // Reduced from 12
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 6,  // Reduced from 10
    color: '#2c5aa0',
  },
  combinedRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,  // Reduced from 5
  },
  combinedLabel: {
    fontSize: 8,  // Reduced from 9
    color: '#444',
  },
  combinedValue: {
    fontSize: 8,  // Reduced from 9
    fontWeight: 600,
  },
});

// Treasurer's Funds Report PDF Component
const TreasurerReportPDF = ({ 
  communityName, 
  weekendNumber, 
  generatedBy, 
  generatedDate,
  totalCandidates,
  menTotals,
  womenTotals,
  totalScholarshipNeeded,
  onlinePaymentCandidates,
  notes
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  // Calculate combined totals
  const totalWeekendCash = menTotals.weekendCash + womenTotals.weekendCash;
  const totalWeekendCheck = menTotals.weekendCheck + womenTotals.weekendCheck;
  const totalWeekendOnline = menTotals.weekendOnline + womenTotals.weekendOnline;
  const totalSponsorCash = menTotals.sponsorCash + womenTotals.sponsorCash;
  const totalSponsorCheck = menTotals.sponsorCheck + womenTotals.sponsorCheck;
  
  const totalWeekendFees = totalWeekendCash + totalWeekendCheck + totalWeekendOnline;
  const totalSponsorFees = totalSponsorCash + totalSponsorCheck;
  const totalCash = totalWeekendCash + totalSponsorCash;
  const totalChecks = totalWeekendCheck + totalSponsorCheck;
  const grandTotalTransfer = totalCash + totalChecks;
  
  // P&L Style calculations
  const totalExpectedRevenue = menTotals.weekendExpected + menTotals.sponsorExpected + 
                                womenTotals.weekendExpected + womenTotals.sponsorExpected;
  const totalCollectedFromCandidates = totalWeekendFees + totalSponsorFees;
  const balanceDue = totalExpectedRevenue - totalCollectedFromCandidates - totalScholarshipNeeded;
  
  const menTotal = menTotals.weekendCash + menTotals.weekendCheck + menTotals.weekendOnline + 
                   menTotals.sponsorCash + menTotals.sponsorCheck;
  const womenTotal = womenTotals.weekendCash + womenTotals.weekendCheck + womenTotals.weekendOnline + 
                     womenTotals.sponsorCash + womenTotals.sponsorCheck;

  return (
    <Document>
      <Page size="LETTER" style={{...pdfStyles.page, paddingBottom: 40}}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Treasurer's Funds Report</Text>
          <Text style={pdfStyles.subtitle}>{communityName} Weekend #{weekendNumber}</Text>
          <Text style={pdfStyles.subtitle}>Generated: {generatedDate} by {generatedBy}</Text>
        </View>

        {/* Two Column Layout - Men and Women */}
        <View style={{ display: 'flex', flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {/* MEN Column */}
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.columnHeader}>MEN - {menTotals.candidateCount}</Text>
            <View style={{ marginBottom: 6 }}>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Expected Revenue:</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(menTotals.weekendExpected + menTotals.sponsorExpected)}</Text>
              </View>
            </View>
            
            <View style={pdfStyles.columnContent}>
              <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 4, color: '#666', textAlign: 'center' }}>
                Collected
              </Text>
              
              <Text style={pdfStyles.subsectionTitle}>Weekend Fees</Text>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Cash</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(menTotals.weekendCash)}</Text>
              </View>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Check</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(menTotals.weekendCheck)}</Text>
              </View>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Online</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(menTotals.weekendOnline)}</Text>
              </View>
              <View style={{...pdfStyles.simpleRow, marginTop: 4, paddingTop: 4, borderTop: '0.5 solid #ccc'}}>
                <Text style={{...pdfStyles.simpleLabel, fontWeight: 600}}>Total Weekend</Text>
                <Text style={{...pdfStyles.simpleValue, fontWeight: 700}}>{formatCurrency(menTotals.weekendCash + menTotals.weekendCheck + menTotals.weekendOnline)}</Text>
              </View>
              
              <Text style={pdfStyles.subsectionTitle}>Sponsor Fees</Text>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Cash</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(menTotals.sponsorCash)}</Text>
              </View>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Check</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(menTotals.sponsorCheck)}</Text>
              </View>
              <View style={{...pdfStyles.simpleRow, marginTop: 4, paddingTop: 4, borderTop: '0.5 solid #ccc'}}>
                <Text style={{...pdfStyles.simpleLabel, fontWeight: 600}}>Total Sponsor</Text>
                <Text style={{...pdfStyles.simpleValue, fontWeight: 700}}>{formatCurrency(menTotals.sponsorCash + menTotals.sponsorCheck)}</Text>
              </View>
              
              <View style={pdfStyles.columnTotal}>
                <Text style={pdfStyles.columnTotalLabel}>Total Men:</Text>
                <Text style={pdfStyles.columnTotalValue}>{formatCurrency(menTotal)}</Text>
              </View>
            </View>
          </View>

          {/* WOMEN Column */}
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.columnHeader}>WOMEN - {womenTotals.candidateCount}</Text>
            <View style={{ marginBottom: 6 }}>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Expected Revenue:</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(womenTotals.weekendExpected + womenTotals.sponsorExpected)}</Text>
              </View>
            </View>
            
            <View style={pdfStyles.columnContent}>
              <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 4, color: '#666', textAlign: 'center' }}>
                Collected
              </Text>
              
              <Text style={pdfStyles.subsectionTitle}>Weekend Fees</Text>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Cash</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(womenTotals.weekendCash)}</Text>
              </View>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Check</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(womenTotals.weekendCheck)}</Text>
              </View>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Online</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(womenTotals.weekendOnline)}</Text>
              </View>
              <View style={{...pdfStyles.simpleRow, marginTop: 4, paddingTop: 4, borderTop: '0.5 solid #ccc'}}>
                <Text style={{...pdfStyles.simpleLabel, fontWeight: 600}}>Total Weekend</Text>
                <Text style={{...pdfStyles.simpleValue, fontWeight: 700}}>{formatCurrency(womenTotals.weekendCash + womenTotals.weekendCheck + womenTotals.weekendOnline)}</Text>
              </View>
              
              <Text style={pdfStyles.subsectionTitle}>Sponsor Fees</Text>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Cash</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(womenTotals.sponsorCash)}</Text>
              </View>
              <View style={pdfStyles.simpleRow}>
                <Text style={pdfStyles.simpleLabel}>Check</Text>
                <Text style={pdfStyles.simpleValue}>{formatCurrency(womenTotals.sponsorCheck)}</Text>
              </View>
              <View style={{...pdfStyles.simpleRow, marginTop: 4, paddingTop: 4, borderTop: '0.5 solid #ccc'}}>
                <Text style={{...pdfStyles.simpleLabel, fontWeight: 600}}>Total Sponsor</Text>
                <Text style={{...pdfStyles.simpleValue, fontWeight: 700}}>{formatCurrency(womenTotals.sponsorCash + womenTotals.sponsorCheck)}</Text>
              </View>
              
              <View style={pdfStyles.columnTotal}>
                <Text style={pdfStyles.columnTotalLabel}>Total Women:</Text>
                <Text style={pdfStyles.columnTotalValue}>{formatCurrency(womenTotal)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Combined Totals */}
        <View style={pdfStyles.combinedSection}>
          <Text style={pdfStyles.combinedHeader}>COMBINED TOTALS</Text>
          
          {/* Collected Breakdown - TOP */}
          <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 4, color: '#666', textAlign: 'center' }}>
            — Collected —
          </Text>
          <View style={pdfStyles.combinedRow}>
            <Text style={pdfStyles.combinedLabel}>Weekend Fees:</Text>
            <Text style={pdfStyles.combinedValue}>{formatCurrency(totalWeekendFees)}</Text>
          </View>
          <View style={pdfStyles.combinedRow}>
            <Text style={pdfStyles.combinedLabel}>Sponsor Fees:</Text>
            <Text style={pdfStyles.combinedValue}>{formatCurrency(totalSponsorFees)}</Text>
          </View>
          <View style={pdfStyles.combinedRow}>
            <Text style={pdfStyles.combinedLabel}>Cash:</Text>
            <Text style={pdfStyles.combinedValue}>{formatCurrency(totalCash)}</Text>
          </View>
          <View style={pdfStyles.combinedRow}>
            <Text style={pdfStyles.combinedLabel}>Checks:</Text>
            <Text style={pdfStyles.combinedValue}>{formatCurrency(totalChecks)}</Text>
          </View>
          <View style={pdfStyles.grandTotalRow}>
            <Text style={pdfStyles.grandTotalLabel}>GRAND TOTAL TRANSFER:</Text>
            <Text style={pdfStyles.grandTotalValue}>{formatCurrency(grandTotalTransfer)}</Text>
          </View>
          
          {/* P&L Style Summary - BOTTOM */}
          <View style={{ marginTop: 8, paddingTop: 8, borderTop: '1 solid #ddd' }}>
            <View style={pdfStyles.combinedRow}>
              <Text style={pdfStyles.combinedLabel}>Total Expected Revenue:</Text>
              <Text style={pdfStyles.combinedValue}>{formatCurrency(totalExpectedRevenue)}</Text>
            </View>
            <View style={pdfStyles.combinedRow}>
              <Text style={{...pdfStyles.combinedLabel, paddingLeft: 10}}>Less: Collected from Candidates</Text>
              <Text style={pdfStyles.combinedValue}>({formatCurrency(totalCollectedFromCandidates)})</Text>
            </View>
            <View style={pdfStyles.combinedRow}>
              <Text style={{...pdfStyles.combinedLabel, paddingLeft: 10}}>Less: Scholarships Applied</Text>
              <Text style={pdfStyles.combinedValue}>({formatCurrency(totalScholarshipNeeded)})</Text>
            </View>
            <View style={{...pdfStyles.combinedRow, marginTop: 4, paddingTop: 4, borderTop: '1 solid #333'}}>
              <Text style={{...pdfStyles.combinedLabel, fontWeight: 700}}>Balance Due:</Text>
              <Text style={{...pdfStyles.combinedValue, fontWeight: 700, color: balanceDue === 0 ? '#28a745' : '#dc3545'}}>
                {formatCurrency(balanceDue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Online Payments */}
        {onlinePaymentCandidates.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Online Payments (Weekend Fee)</Text>
            <Text style={{ fontSize: 8, marginTop: 4, marginBottom: 3, color: '#666' }}>
              Candidates who paid online ({formatCurrency(totalWeekendOnline)} total):
            </Text>
            {onlinePaymentCandidates.map((name, idx) => (
              <Text key={idx} style={{ fontSize: 8, color: '#555', marginLeft: 8, marginBottom: 1 }}>
                • {name}
              </Text>
            ))}
          </View>
        )}

        {/* Scholarship Funding Needed */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Scholarship Funding Required</Text>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 8, color: '#444' }}>Total Scholarship Amount Needed from Organization:</Text>
            <Text style={{ fontSize: 8, fontWeight: 600 }}>{formatCurrency(totalScholarshipNeeded)}</Text>
          </View>
        </View>

        {/* Notes Section */}
        {notes && notes.trim() !== '' && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 8, color: '#444', marginTop: 4, lineHeight: 1.4 }}>
              {notes}
            </Text>
          </View>
        )}
        
        {/* Footer with Page Numbers - Fixed on every page */}
        <Text 
          style={{ 
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: 'center', 
            fontSize: 8, 
            color: '#666' 
          }} 
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} 
          fixed
        />
      </Page>
    </Document>
  );
};

export default function Reports() {
  const { orgId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('men');
  const [currentTab, setCurrentTab] = useState('attendees');
  const [loading, setLoading] = useState(true);
  const [weekendFee, setWeekendFee] = useState(150); // Default fallback
  const [sponsorFee, setSponsorFee] = useState(50);   // Default fallback
  const [communityName, setCommunityName] = useState('');
  const [activeWeekendNumber, setActiveWeekendNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [showTreasurerPreview, setShowTreasurerPreview] = useState(false);
  const [showNotesField, setShowNotesField] = useState(false);
  const [reportNotes, setReportNotes] = useState('');

  useEffect(() => {
    if (orgId) {
      loadAppSettings();
      loadApplications();
    }
  }, [orgId]);

  // Cleanup effect - ensure no lingering styles or classes
  useEffect(() => {
    return () => {
      // Remove any potential print mode classes
      document.body.classList.remove('print-mode');
      document.querySelector('.app-container')?.classList.remove('print-mode');
    };
  }, []);

  const loadAppSettings = async () => {
    console.log('🔍 Loading App Settings... orgId:', orgId);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('weekend_fee, sponsor_fee, community_name')
        .eq('id', 1)
        .single();

      console.log('📦 App Settings Query Result:', { data, error });

      if (error) {
        console.error('❌ App Settings Error:', error);
        throw error;
      }

      if (data) {
        const loadedWeekendFee = parseFloat(data.weekend_fee) || 150;
        const loadedSponsorFee = parseFloat(data.sponsor_fee) || 50;
        console.log('📊 App Settings Loaded:', {
          raw_weekend_fee: data.weekend_fee,
          parsed_weekend_fee: loadedWeekendFee,
          raw_sponsor_fee: data.sponsor_fee,
          parsed_sponsor_fee: loadedSponsorFee
        });
        setWeekendFee(loadedWeekendFee);
        setSponsorFee(loadedSponsorFee);
        setCommunityName(data.community_name || '');
      } else {
        console.warn('⚠️ No data returned from app_settings');
      }

      // Load active weekend number from men_team_rosters
      const { data: rosterData, error: rosterError } = await supabase
        .from('men_team_rosters')
        .select('weekend_identifier')
        .eq('org_id', orgId)
        .order('weekend_identifier', { ascending: false })
        .limit(1);

      if (!rosterError && rosterData && rosterData.length > 0) {
        const weekendIdentifier = rosterData[0].weekend_identifier;
        // Extract just the number from "Men's 45" or "Men 45" etc.
        const numberMatch = weekendIdentifier.match(/\d+/);
        const weekendNumber = numberMatch ? numberMatch[0] : '';
        console.log('🎯 Active Weekend Number:', weekendNumber, 'from', weekendIdentifier);
        setActiveWeekendNumber(weekendNumber);
      } else {
        console.warn('⚠️ Could not load active weekend number');
      }

      // Load user name from profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('email', user.email)
          .single();
        
        if (!profileError && profileData && profileData.display_name) {
          setUserName(profileData.display_name);
          console.log('👤 User name loaded:', profileData.display_name);
        } else {
          console.warn('⚠️ Could not load display_name, using email');
          setUserName(user.email || 'Unknown User');
        }
      }
    } catch (error) {
      console.error('❌ Error loading app settings:', error);
      // Use defaults if settings not found
      console.warn('⚠️ Using fallback defaults: weekendFee=150, sponsorFee=50');
      setWeekendFee(150);
      setSponsorFee(50);
    }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cra_applications')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };

  // Filter applications by gender AND attendance status
  const filteredApps = applications.filter(app => {
    const hasMan = app.m_first && app.m_first.trim() !== '';
    const hasWoman = app.f_first && app.f_first.trim() !== '';
    const hasGender = (currentFilter === 'men' && hasMan) || (currentFilter === 'women' && hasWoman);
    const isAttending = app.attendance && app.attendance.toLowerCase() === 'yes';
    return hasGender && isAttending;
  });

  // Get TOTAL candidates across BOTH genders for treasurer report
  const getTotalCandidatesAllGenders = () => {
    return applications.filter(app => {
      const hasMan = app.m_first && app.m_first.trim() !== '';
      const hasWoman = app.f_first && app.f_first.trim() !== '';
      const isAttending = app.attendance && app.attendance.toLowerCase() === 'yes';
      return (hasMan || hasWoman) && isAttending;
    }).length;
  };

  // Compute financial totals BY GENDER for treasurer report
  const computeTotalsByGender = () => {
    const menTotals = {
      candidateCount: 0,
      weekendCash: 0,
      weekendCheck: 0,
      weekendOnline: 0,
      sponsorCash: 0,
      sponsorCheck: 0,
      weekendExpected: 0,
      sponsorExpected: 0,
    };
    
    const womenTotals = {
      candidateCount: 0,
      weekendCash: 0,
      weekendCheck: 0,
      weekendOnline: 0,
      sponsorCash: 0,
      sponsorCheck: 0,
      weekendExpected: 0,
      sponsorExpected: 0,
    };

    applications.forEach(app => {
      // Only include candidates with attendance === 'yes' (case insensitive)
      if (!app.attendance || app.attendance.toLowerCase() !== 'yes') return;
      
      const hasMan = app.m_first && app.m_first.trim() !== '';
      const hasWoman = app.f_first && app.f_first.trim() !== '';
      
      // Determine weekend fee amount collected
      let weekendFeeCollected = 0;
      
      // ONLY trust scholarship fields when payment_wk_scholarship is explicitly TRUE
      if (app.payment_wk_scholarship === true) {
        if (app.payment_wk_scholarshiptype === 'partial') {
          // Partial scholarship: use payment_wk_candidate_paid for what candidate actually paid
          weekendFeeCollected = parseFloat(app.payment_wk_candidate_paid) || 0;
        } else if (app.payment_wk_scholarshiptype === 'full') {
          // Full scholarship: candidate paid $0
          weekendFeeCollected = 0;
        }
      } else {
        // No scholarship OR scholarship is false: candidate paid full weekend fee from app_settings
        weekendFeeCollected = weekendFee;
      }
      
      // Men
      if (hasMan) {
        menTotals.candidateCount++;
        menTotals.weekendExpected += weekendFee;
        menTotals.sponsorExpected += sponsorFee;
        
        // Weekend fee by payment method
        if (app.payment_wk_cash) menTotals.weekendCash += weekendFeeCollected;
        if (app.payment_wk_check) menTotals.weekendCheck += weekendFeeCollected;
        if (app.payment_wk_online) menTotals.weekendOnline += weekendFeeCollected;
        
        // Sponsor fee (always full amount if paid)
        if (app.payment_sp_cash) menTotals.sponsorCash += sponsorFee;
        if (app.payment_sp_check) menTotals.sponsorCheck += sponsorFee;
      }
      
      // Women
      if (hasWoman) {
        womenTotals.candidateCount++;
        womenTotals.weekendExpected += weekendFee;
        womenTotals.sponsorExpected += sponsorFee;
        
        // Weekend fee by payment method
        if (app.payment_wk_cash) womenTotals.weekendCash += weekendFeeCollected;
        if (app.payment_wk_check) womenTotals.weekendCheck += weekendFeeCollected;
        if (app.payment_wk_online) womenTotals.weekendOnline += weekendFeeCollected;
        
        // Sponsor fee (always full amount if paid)
        if (app.payment_sp_cash) womenTotals.sponsorCash += sponsorFee;
        if (app.payment_sp_check) womenTotals.sponsorCheck += sponsorFee;
      }
    });

    return { menTotals, womenTotals };
  };

  // Calculate financial totals
  const computeFinancialTotals = () => {
    console.log('💰 Computing Financial Totals:', {
      weekendFee,
      sponsorFee,
      filteredAppsCount: filteredApps.length,
      currentFilter
    });
    
    const totals = {
      weekendExpected: 0,
      sponsorExpected: 0,
      weekendCollected: 0,
      sponsorCollected: 0,
      weekendCashCollected: 0,
      weekendCheckCollected: 0,
      weekendOnlineCollected: 0,
      sponsorCashCollected: 0,
      sponsorCheckCollected: 0,
      overdueItems: 0,
      fullScholarshipCount: 0,
      fullScholarshipAmount: 0,
      partialScholarshipCount: 0,
      partialScholarshipAmount: 0
    };

    filteredApps.forEach(app => {
      const isScholarship = app.payment_wk_scholarship === true; // Strict check
      const isFullScholarship = isScholarship && app.payment_wk_scholarshiptype === 'full';
      const isPartialScholarship = isScholarship && app.payment_wk_scholarshiptype === 'partial';
      
      // EXPECTED CALCULATIONS
      // Weekend Expected: All candidates pay the weekend fee (scholarships are not subtracted from expected)
      totals.weekendExpected += weekendFee;
      
      // Sponsor Expected: All candidates are expected to pay sponsor fee
      totals.sponsorExpected += sponsorFee;

      // COLLECTED CALCULATIONS
      // Weekend Fee Collected: Only count actual money received
      let weekendCollected = 0;
      if (isPartialScholarship) {
        // Partial scholarship: use payment_wk_candidate_paid for what was collected
        const candidatePaid = parseFloat(app.payment_wk_candidate_paid) || 0;
        weekendCollected = candidatePaid;
        
        // payment_wk_partialamount stores the SCHOLARSHIP AMOUNT needed
        const scholarshipNeeded = parseFloat(app.payment_wk_partialamount) || 0;
        totals.partialScholarshipCount++;
        totals.partialScholarshipAmount += scholarshipNeeded;
        console.log('💰 Partial scholarship found:', app.id, 'Candidate paid:', candidatePaid, 'Scholarship needed:', scholarshipNeeded);
      } else if (isFullScholarship) {
        // Full scholarship: $0 collected from candidate
        weekendCollected = 0;
        totals.fullScholarshipCount++;
        totals.fullScholarshipAmount += weekendFee;
        console.log('💰 Full scholarship found:', app.id, weekendFee);
      } else if (app.payment_wk_cash || app.payment_wk_check || app.payment_wk_online) {
        // Full payment received (cash, check, or online)
        weekendCollected = weekendFee;
      }
      
      // Sponsor Fee Collected: Only if cash or check was received
      const sponsorCollected = (app.payment_sp_cash || app.payment_sp_check) ? sponsorFee : 0;
      
      totals.weekendCollected += weekendCollected;
      totals.sponsorCollected += sponsorCollected;
      
      // Payment methods breakdown - GRANULAR (weekend vs sponsor, cash vs check vs online)
      if (app.payment_wk_cash) totals.weekendCashCollected += weekendFee;
      if (app.payment_wk_check) totals.weekendCheckCollected += weekendFee;
      if (app.payment_wk_online) totals.weekendOnlineCollected += weekendFee;
      if (app.payment_sp_cash) totals.sponsorCashCollected += sponsorFee;
      if (app.payment_sp_check) totals.sponsorCheckCollected += sponsorFee;

      // Overdue calculation
      const totalExpected = weekendFee + sponsorFee;
      const totalCollected = weekendCollected + sponsorCollected;
      if ((totalExpected - totalCollected) > 0.01) {
        totals.overdueItems++;
      }
    });

    return totals;
  };

  const totals = computeFinancialTotals();
  console.log('📊 Total Scholarships:', {
    fullCount: totals.fullScholarshipCount,
    fullAmount: totals.fullScholarshipAmount,
    partialCount: totals.partialScholarshipCount,
    partialAmount: totals.partialScholarshipAmount,
    total: totals.fullScholarshipAmount + totals.partialScholarshipAmount
  });
  const totalExpected = totals.weekendExpected + totals.sponsorExpected;
  const totalCollected = totals.weekendCollected + totals.sponsorCollected;
  const balanceDue = totalExpected - totalCollected;
  
  // Compute gender-split totals once for treasurer report
  const genderTotals = computeTotalsByGender();
  
  // Compute COMBINED scholarship totals (all genders) for treasurer report
  const computeCombinedScholarshipTotals = () => {
    let fullScholarshipAmount = 0;
    let partialScholarshipAmount = 0;
    
    applications.forEach(app => {
      // Only include attending candidates
      if (!app.attendance || app.attendance.toLowerCase() !== 'yes') return;
      
      const hasMan = app.m_first && app.m_first.trim() !== '';
      const hasWoman = app.f_first && app.f_first.trim() !== '';
      
      // Skip if no candidate
      if (!hasMan && !hasWoman) return;
      
      const isScholarship = app.payment_wk_scholarship === true;
      const isFullScholarship = isScholarship && app.payment_wk_scholarshiptype === 'full';
      const isPartialScholarship = isScholarship && app.payment_wk_scholarshiptype === 'partial';
      
      if (isPartialScholarship) {
        // payment_wk_partialamount stores the SCHOLARSHIP AMOUNT (what org needs to pay)
        const scholarshipNeeded = parseFloat(app.payment_wk_partialamount) || 0;
        partialScholarshipAmount += scholarshipNeeded;
      } else if (isFullScholarship) {
        fullScholarshipAmount += weekendFee;
      }
    });
    
    return { fullScholarshipAmount, partialScholarshipAmount };
  };
  
  const combinedScholarships = computeCombinedScholarshipTotals();
  
  // Get ALL online payment candidates (both genders) for treasurer report
  const getAllOnlinePaymentCandidates = () => {
    return applications
      .filter(app => {
        if (!app.attendance || app.attendance.toLowerCase() !== 'yes') return false;
        if (!app.payment_wk_online) return false;
        const hasMan = app.m_first && app.m_first.trim() !== '';
        const hasWoman = app.f_first && app.f_first.trim() !== '';
        return hasMan || hasWoman;
      })
      .map(app => {
        const hasMan = app.m_first && app.m_first.trim() !== '';
        if (hasMan) {
          return `${app.m_pref || app.m_first} ${app.c_lastname}`.trim();
        } else {
          return `${app.f_pref || app.f_first} ${app.c_lastname}`.trim();
        }
      });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getCandidateName = (app) => {
    const p = currentFilter === 'men' ? 'm_' : 'f_';
    return `${app[p+'first']} ${app[p+'pref'] ? `(${app[p+'pref']}) ` : ''}${app.c_lastname}`;
  };

  const printCheckinReport = () => {
    window.print();
  };

  // Get list of candidates who paid online
  const getOnlinePaymentCandidates = () => {
    return filteredApps
      .filter(app => app.payment_wk_online)
      .map(app => getCandidateName(app));
  };

  return (
    <div id="cra-reports" className="cra-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div className="card pad">
        <div className="section-title">Reports Dashboard</div>
        <div className="controls" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label">Select Report Group</div>
            <div className="toggle" id="craReportFilter">
              <div 
                className={`opt ${currentFilter === 'men' ? 'active' : ''}`}
                onClick={() => handleFilterChange('men')}
              >
                Men
              </div>
              <div 
                className={`opt ${currentFilter === 'women' ? 'active' : ''}`}
                onClick={() => handleFilterChange('women')}
              >
                Women
              </div>
            </div>
          </div>
          
          {/* Treasurer's Report PDF Buttons */}
          <div>
            <div className="label">Treasurer's Report</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowTreasurerPreview(!showTreasurerPreview);
                  if (!showTreasurerPreview) setShowNotesField(false); // Close notes when opening preview
                }}
                disabled={loading}
              >
                {showTreasurerPreview ? 'Close' : 'Preview Funds Report'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowNotesField(!showNotesField);
                  if (!showNotesField) setShowTreasurerPreview(false); // Close preview when opening notes
                }}
                disabled={loading}
              >
                {showNotesField ? 'Close' : 'Add Notes'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Notes Field */}
        {showNotesField && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="label" style={{ marginBottom: 0 }}>Report Notes (optional, max 500 characters)</label>
              <span style={{ fontSize: '0.85rem', color: reportNotes.length > 500 ? 'var(--error)' : 'var(--muted)' }}>
                {reportNotes.length} / 500
              </span>
            </div>
            <textarea
              className="input"
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value.slice(0, 500))}
              placeholder="Add any notes for this report (e.g., outstanding items, special circumstances, reminders)..."
              rows={4}
              style={{ 
                width: '100%', 
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}
        
        {/* Treasurer Report Preview */}
        {showTreasurerPreview && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Treasurer's Funds Report Preview</h3>
              <PDFDownloadLink
                document={
                  <TreasurerReportPDF
                    communityName={communityName}
                    weekendNumber={activeWeekendNumber}
                    generatedBy={userName}
                    generatedDate={new Date().toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                    totalCandidates={getTotalCandidatesAllGenders()}
                    menTotals={genderTotals.menTotals}
                    womenTotals={genderTotals.womenTotals}
                    totalScholarshipNeeded={combinedScholarships.fullScholarshipAmount + combinedScholarships.partialScholarshipAmount}
                    onlinePaymentCandidates={getAllOnlinePaymentCandidates()}
                    notes={reportNotes}
                  />
                }
                fileName={`Treasurer_Report_Weekend_${activeWeekendNumber}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <button className="btn btn-primary" disabled={pdfLoading}>
                    {pdfLoading ? 'Generating...' : 'Download PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>
            <div style={{ 
              width: '100%', 
              height: '800px', 
              border: '1px solid var(--border)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <PDFViewer width="100%" height="100%">
                <TreasurerReportPDF
                  communityName={communityName}
                  weekendNumber={activeWeekendNumber}
                  generatedBy={userName}
                  generatedDate={new Date().toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                  totalCandidates={getTotalCandidatesAllGenders()}
                  menTotals={genderTotals.menTotals}
                  womenTotals={genderTotals.womenTotals}
                  totalScholarshipNeeded={combinedScholarships.fullScholarshipAmount + combinedScholarships.partialScholarshipAmount}
                  onlinePaymentCandidates={getAllOnlinePaymentCandidates()}
                  notes={reportNotes}
                />
              </PDFViewer>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary - Always Visible */}
      <div id="cra-financial-report" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="grid grid-4">
          <div className="card pad">
            <div className="label">Total Expected</div>
            <div id="cra_totalExpected" style={{ fontSize: '28px', fontWeight: 900 }}>
              {formatCurrency(totalExpected)}
            </div>
          </div>
          <div className="card pad">
            <div className="label">Total Collected</div>
            <div id="cra_totalCollected" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accentA)' }}>
              {formatCurrency(totalCollected)}
            </div>
          </div>
          <div className="card pad">
            <div className="label">Balance Due</div>
            <div 
              id="cra_balanceDue" 
              style={{ 
                fontSize: '28px', 
                fontWeight: 900, 
                color: balanceDue > 0.01 ? 'var(--accentD)' : 'var(--accentA)' 
              }}
            >
              {formatCurrency(balanceDue)}
            </div>
          </div>
          <div className="card pad">
            <div className="label">Overdue Items</div>
            <div id="cra_overdueItems" style={{ fontSize: '28px', fontWeight: 900 }}>
              {totals.overdueItems}
            </div>
          </div>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="card pad">
          <div className="section-title">Financial Breakdown</div>
          <div className="grid grid-3">
            <div className="card pad">
              <div className="small-card-header">Weekend Fees</div>
              <div className="financial-line">
                <span>Expected:</span>
                <span id="cra_weekendExpected">{formatCurrency(totals.weekendExpected)}</span>
              </div>
              <div className="financial-line">
                <span>Collected:</span>
                <span id="cra_weekendCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.weekendCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Balance:</span>
                <span 
                  id="cra_weekendBalance"
                  style={{ 
                    color: (totals.weekendExpected - totals.weekendCollected) > 0.01 ? 'var(--accentD)' : 'var(--accentA)' 
                  }}
                >
                  {formatCurrency(totals.weekendExpected - totals.weekendCollected)}
                </span>
              </div>
              <div className="financial-line" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span>Cash:</span>
                <span id="cra_weekendCashCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.weekendCashCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Check:</span>
                <span id="cra_weekendCheckCollected" style={{ color: 'var(--accentB)' }}>
                  {formatCurrency(totals.weekendCheckCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Online:</span>
                <span id="cra_weekendOnlineCollected" style={{ color: '#9333ea' }}>
                  {formatCurrency(totals.weekendOnlineCollected)}
                </span>
              </div>
            </div>

            <div className="card pad">
              <div className="small-card-header">Scholarships Needed</div>
              <div className="financial-line">
                <span>Full Scholarships:</span>
                <span id="cra_fullScholarshipAmount" style={{ color: 'var(--accentC)' }}>
                  {formatCurrency(totals.fullScholarshipAmount)}
                </span>
              </div>
              <div className="financial-line" style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '8px' }}>
                <span>{totals.fullScholarshipCount} candidate{totals.fullScholarshipCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="financial-line">
                <span>Partial Scholarships:</span>
                <span id="cra_partialScholarshipAmount" style={{ color: 'var(--accentC)' }}>
                  {formatCurrency(totals.partialScholarshipAmount)}
                </span>
              </div>
              <div className="financial-line" style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '8px' }}>
                <span>{totals.partialScholarshipCount} candidate{totals.partialScholarshipCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="financial-line" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontWeight: 700 }}>
                <span>Total Needed:</span>
                <span id="cra_totalScholarshipAmount" style={{ color: 'var(--accentC)', fontSize: '1.1rem' }}>
                  {formatCurrency(totals.fullScholarshipAmount + totals.partialScholarshipAmount)}
                </span>
              </div>
            </div>

            <div className="card pad">
              <div className="small-card-header">Sponsor Fees</div>
              <div className="financial-line">
                <span>Expected:</span>
                <span id="cra_sponsorExpected">{formatCurrency(totals.sponsorExpected)}</span>
              </div>
              <div className="financial-line">
                <span>Collected:</span>
                <span id="cra_sponsorCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.sponsorCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Balance:</span>
                <span 
                  id="cra_sponsorBalance"
                  style={{ 
                    color: (totals.sponsorExpected - totals.sponsorCollected) > 0.01 ? 'var(--accentD)' : 'var(--accentA)' 
                  }}
                >
                  {formatCurrency(totals.sponsorExpected - totals.sponsorCollected)}
                </span>
              </div>
              <div className="financial-line" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span>Cash:</span>
                <span id="cra_sponsorCashCollected" style={{ color: 'var(--accentA)' }}>
                  {formatCurrency(totals.sponsorCashCollected)}
                </span>
              </div>
              <div className="financial-line">
                <span>Check:</span>
                <span id="cra_sponsorCheckCollected" style={{ color: 'var(--accentB)' }}>
                  {formatCurrency(totals.sponsorCheckCollected)}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Tabbed Reports */}
      <div className="card pad">
        <div className="report-tabs">
          <div 
            className={`tab ${currentTab === 'attendees' ? 'active' : ''}`}
            onClick={() => handleTabChange('attendees')}
          >
            Attendee List
          </div>
          <div 
            className={`tab ${currentTab === 'payments' ? 'active' : ''}`}
            onClick={() => handleTabChange('payments')}
          >
            Payment List
          </div>
          <div 
            className={`tab ${currentTab === 'checkin' ? 'active' : ''}`}
            onClick={() => handleTabChange('checkin')}
          >
            Check-In Sheet
          </div>
        </div>

        <div id="cra-report-output">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>Loading report data...</p>
          ) : filteredApps.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No {currentFilter} candidates found.
            </p>
          ) : (
            <>
              {/* Attendee List */}
              {currentTab === 'attendees' && (
                <>
                  <div className="section-title">{currentFilter.toUpperCase()} Attendee List</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Emergency Contact</th>
                        <th>Smoker</th>
                        <th>Diet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => {
                        const p = currentFilter === 'men' ? 'm_' : 'f_';
                        return (
                          <tr key={app.id}>
                            <td>{getCandidateName(app)}</td>
                            <td>{app[p+'cell']}</td>
                            <td>{app[p+'email']}</td>
                            <td>{app[p+'emerg']} {app[p+'emergphone']}</td>
                            <td>{app.smoker ? 'Yes' : 'No'}</td>
                            <td>{app.diet ? (app.diet_details || 'Yes') : 'None'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* Payment List */}
              {currentTab === 'payments' && (
                <>
                  <div className="section-title">{currentFilter.toUpperCase()} Payment Report</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Weekend Fee</th>
                        <th>Sponsor Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => {
                        let wkFee;
                        if (app.payment_wk_scholarship) {
                          wkFee = app.payment_wk_scholarshiptype === 'full' 
                            ? 'Full Scholarship' 
                            : `Partial ($${app.payment_wk_partialamount})`;
                        } else {
                          wkFee = (app.payment_wk_cash || app.payment_wk_check || app.payment_wk_online) ? 'Paid' : 'Due';
                        }
                        const spFee = (app.payment_sp_cash || app.payment_sp_check) ? 'Paid' : 'Due';

                        return (
                          <tr key={app.id}>
                            <td>{getCandidateName(app)}</td>
                            <td>{wkFee}</td>
                            <td>{spFee}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* Check-In Sheet */}
              {currentTab === 'checkin' && (
                <>
                  <div className="checkin-report-container" id="checkin-report-printable">
                    <div className="checkin-report-header">
                      <h1>Team Tools Pro</h1>
                      <h2>{currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}'s Weekend Check-In Sheet</h2>
                    </div>
                    <table className="table checkin-report-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Contact Information</th>
                          <th>Church</th>
                          <th>Emergency Contact</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Info Verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map(app => {
                          const p = currentFilter === 'men' ? 'm_' : 'f_';
                          const smokerBadge = app.smoker ? '<span class="checkin-badge smoker">Smoker</span>' : '';
                          const dietBadge = app.diet ? `<span class="checkin-badge diet">Diet: ${app.diet_details || 'Yes'}</span>` : '';
                          
                          return (
                            <tr key={app.id}>
                              <td>
                                <strong>{app[p+'first'] || ''} {app.c_lastname || ''}</strong><br />
                                <span style={{ fontSize: '0.8em', color: 'var(--muted)' }}>
                                  {app[p+'pref'] ? `(Prefers: ${app[p+'pref']})` : ''}
                                </span>
                                <div className="checkin-info" dangerouslySetInnerHTML={{ __html: smokerBadge + dietBadge }} />
                              </td>
                              <td>
                                {app.c_address || ''}<br />
                                {app.c_city || ''}, {app.c_state || ''} {app.c_zip || ''}<br />
                                {app[p+'cell'] || 'N/A'}<br />
                                {app[p+'email'] || 'N/A'}
                              </td>
                              <td>{app.c_church || 'N/A'}</td>
                              <td>
                                {app[p+'emerg'] || 'N/A'}<br />
                                <strong>P:</strong> {app[p+'emergphone'] || 'N/A'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="checkbox"></div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={printCheckinReport}
                    style={{ marginTop: '16px', width: '100%' }}
                  >
                    Print Report
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}