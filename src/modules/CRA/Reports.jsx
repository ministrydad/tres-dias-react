// src/modules/CRA/Reports.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

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
    padding: 40,
    fontSize: 9,
    fontFamily: 'Source Sans 3',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: '1.5 solid #333',
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    padding: '5 8',
    borderLeft: '3 solid #2c5aa0',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottom: '0.5 solid #eee',
  },
  rowLabel: {
    fontSize: 9,
    color: '#444',
  },
  rowValue: {
    fontSize: 9,
    fontWeight: 600,
  },
  totalRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1.5 solid #333',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  onlinePaymentRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingLeft: 8,
  },
  onlinePaymentName: {
    fontSize: 8,
    color: '#555',
  },
  grandTotalRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: 8,
    borderTop: '2 solid #000',
    borderBottom: '2 solid #000',
    backgroundColor: '#f9f9f9',
    padding: '8 10',
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 700,
  },
});

// Treasurer's Funds Report PDF Component
const TreasurerReportPDF = ({ 
  communityName, 
  weekendNumber, 
  generatedBy, 
  generatedDate,
  totalCandidates,
  weekendFeeCash,
  weekendFeeCheck,
  weekendFeeOnline,
  sponsorFeeCash,
  sponsorFeeCheck,
  totalScholarshipNeeded,
  onlinePaymentCandidates
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const totalCash = weekendFeeCash + sponsorFeeCash;
  const totalChecks = weekendFeeCheck + sponsorFeeCheck;
  const totalDeposit = totalCash + totalChecks;

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Treasurer's Funds Report</Text>
          <Text style={pdfStyles.subtitle}>{communityName} Weekend #{weekendNumber}</Text>
          <Text style={pdfStyles.subtitle}>Generated: {generatedDate} by {generatedBy}</Text>
        </View>

        {/* Candidate Count */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Weekend Summary</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Total Candidates Attending</Text>
            <Text style={pdfStyles.rowValue}>{totalCandidates}</Text>
          </View>
        </View>

        {/* Money Being Transferred */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Funds Being Transferred to Treasurer</Text>
          
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Weekend Fee - Cash</Text>
            <Text style={pdfStyles.rowValue}>{formatCurrency(weekendFeeCash)}</Text>
          </View>
          
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Weekend Fee - Check</Text>
            <Text style={pdfStyles.rowValue}>{formatCurrency(weekendFeeCheck)}</Text>
          </View>
          
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Sponsor Fee - Cash</Text>
            <Text style={pdfStyles.rowValue}>{formatCurrency(sponsorFeeCash)}</Text>
          </View>
          
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Sponsor Fee - Check</Text>
            <Text style={pdfStyles.rowValue}>{formatCurrency(sponsorFeeCheck)}</Text>
          </View>

          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalLabel}>Total Cash</Text>
            <Text style={pdfStyles.totalValue}>{formatCurrency(totalCash)}</Text>
          </View>

          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalLabel}>Total Checks</Text>
            <Text style={pdfStyles.totalValue}>{formatCurrency(totalChecks)}</Text>
          </View>

          <View style={pdfStyles.grandTotalRow}>
            <Text style={pdfStyles.grandTotalLabel}>GRAND TOTAL TRANSFER</Text>
            <Text style={pdfStyles.grandTotalValue}>{formatCurrency(totalDeposit)}</Text>
          </View>
        </View>

        {/* Online Payments */}
        {onlinePaymentCandidates.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Online Payments (Weekend Fee)</Text>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>Total Online Payments</Text>
              <Text style={pdfStyles.rowValue}>{formatCurrency(weekendFeeOnline)}</Text>
            </View>
            <Text style={{ fontSize: 9, marginTop: 8, marginBottom: 6, fontWeight: 600, color: '#666' }}>
              Candidates who paid online:
            </Text>
            {onlinePaymentCandidates.map((name, idx) => (
              <View key={idx} style={pdfStyles.onlinePaymentRow}>
                <Text style={pdfStyles.onlinePaymentName}>• {name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Scholarship Funding Needed */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Scholarship Funding Required</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Total Scholarship Amount Needed from Organization</Text>
            <Text style={pdfStyles.rowValue}>{formatCurrency(totalScholarshipNeeded)}</Text>
          </View>
        </View>
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
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('weekend_fee, sponsor_fee, community_name, active_weekend')
        .eq('org_id', orgId)
        .single();

      if (error) throw error;

      if (data) {
        setWeekendFee(parseFloat(data.weekend_fee) || 150);
        setSponsorFee(parseFloat(data.sponsor_fee) || 50);
        setCommunityName(data.community_name || '');
        setActiveWeekendNumber(data.active_weekend || '');
      }

      // Load user name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData) {
          setUserName(userData.name || user.email || 'Unknown User');
        } else {
          setUserName(user.email || 'Unknown User');
        }
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
      // Use defaults if settings not found
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
    const hasGender = (currentFilter === 'men' && app.m_first) || (currentFilter === 'women' && app.f_first);
    const isAttending = app.attendance === 'yes';
    return hasGender && isAttending;
  });

  // Get TOTAL candidates across BOTH genders for treasurer report
  const getTotalCandidatesAllGenders = () => {
    return applications.filter(app => {
      const hasMan = app.m_first && app.m_first.trim() !== '';
      const hasWoman = app.f_first && app.f_first.trim() !== '';
      const isAttending = app.attendance === 'yes';
      return (hasMan || hasWoman) && isAttending;
    }).length;
  };

  // Calculate financial totals
  const computeFinancialTotals = () => {
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
      const isScholarship = app.payment_wk_scholarship;
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
        // Partial scholarship: they paid the partial amount
        const candidatePaid = parseFloat(app.payment_wk_partialamount) || 0;
        weekendCollected = candidatePaid;
        
        // Track scholarship amount needed
        const scholarshipNeeded = weekendFee - candidatePaid;
        totals.partialScholarshipCount++;
        totals.partialScholarshipAmount += scholarshipNeeded;
      } else if (isFullScholarship) {
        // Full scholarship: $0 collected from candidate
        weekendCollected = 0;
        totals.fullScholarshipCount++;
        totals.fullScholarshipAmount += weekendFee;
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
  const totalExpected = totals.weekendExpected + totals.sponsorExpected;
  const totalCollected = totals.weekendCollected + totals.sponsorCollected;
  const balanceDue = totalExpected - totalCollected;

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
          
          {/* Treasurer's Report PDF Button */}
          <div>
            <div className="label">Treasurer's Report</div>
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
                  weekendFeeCash={totals.weekendCashCollected}
                  weekendFeeCheck={totals.weekendCheckCollected}
                  weekendFeeOnline={totals.weekendOnlineCollected}
                  sponsorFeeCash={totals.sponsorCashCollected}
                  sponsorFeeCheck={totals.sponsorCheckCollected}
                  totalScholarshipNeeded={totals.fullScholarshipAmount + totals.partialScholarshipAmount}
                  onlinePaymentCandidates={getOnlinePaymentCandidates()}
                />
              }
              fileName={`Treasurer_Report_Weekend_${activeWeekendNumber}_${currentFilter}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <button className="btn btn-primary" disabled={pdfLoading || loading}>
                  {pdfLoading ? 'Generating...' : 'Generate Funds Report'}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
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