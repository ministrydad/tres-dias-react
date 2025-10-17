// src/modules/CRA/NewApplication.jsx
// COMPLETE FILE - Updated with column width adjustments and simplified dropdown

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function NewApplication() {
  const { orgId } = useAuth();
  
  const [formData, setFormData] = useState({
    c_lastname: '', c_address: '', c_city: '', c_state: '', c_zip: '', c_church: '',
    c_ms: false, c_clergy: false, c_spouseatt: false, c_ischristian: false,
    m_first: '', m_pref: '', m_age: '', m_cell: '', m_email: '', m_emerg: '', m_emergphone: '',
    f_first: '', f_pref: '', f_age: '', f_cell: '', f_email: '', f_emerg: '', f_emergphone: '',
    s_first: '', s_last: '', s_address: '', s_city: '', s_state: '', s_zip: '',
    s_phone: '', s_email: '', s_church: '', s_weekend: '', s_weekendno: '', s_community: ''
  });

  const [paymentFields, setPaymentFields] = useState({
    wk: { cash: false, check: false, scholarship: false, scholarshipType: 'full', partialAmount: 0 },
    sp: { cash: false, check: false }
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [allSponsors, setAllSponsors] = useState([]);
  const [communityName, setCommunityName] = useState('Loading...');
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(true);

  useEffect(() => {
    if (orgId) {
      console.log('Loading sponsors for org:', orgId);
      loadSponsors();
      loadCommunityName();
    }
  }, [orgId]);

  const loadSponsors = async () => {
    setIsLoadingSponsors(true);
    try {
      console.log('Fetching sponsors...');
      
      const [menResult, womenResult] = await Promise.all([
        supabase.from('men_raw').select('First, Last, Preferred, Email, Phone1, Address, City, State, Zip, Church, "Candidate Weekend"').eq('org_id', orgId),
        supabase.from('women_raw').select('First, Last, Preferred, Email, Phone1, Address, City, State, Zip, Church, "Candidate Weekend"').eq('org_id', orgId)
      ]);

      if (menResult.error) {
        console.error('Men query error:', menResult.error);
        throw menResult.error;
      }
      if (womenResult.error) {
        console.error('Women query error:', womenResult.error);
        throw womenResult.error;
      }

      console.log('Men results:', menResult.data?.length || 0);
      console.log('Women results:', womenResult.data?.length || 0);

      const combined = [...(menResult.data || []), ...(womenResult.data || [])];
      
      // Filter out entries without names
      const filtered = combined.filter(person => person.First && person.Last);
      
      // Sort by last name
      filtered.sort((a, b) => {
        const lastComp = (a.Last || '').localeCompare(b.Last || '');
        if (lastComp !== 0) return lastComp;
        return (a.First || '').localeCompare(b.First || '');
      });

      console.log('Total sponsors loaded:', filtered.length);
      setAllSponsors(filtered);
    } catch (error) {
      console.error('Error loading sponsors:', error);
      alert('Error loading sponsor list: ' + error.message);
    } finally {
      setIsLoadingSponsors(false);
    }
  };

  const loadCommunityName = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('community_name')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Community name error:', error);
        throw error;
      }
      
      const name = data?.community_name || 'Community';
      console.log('Loaded community name:', name);
      setCommunityName(name);
    } catch (error) {
      console.error('Error loading community name:', error);
      setCommunityName('Community');
    }
  };

  const handleSponsorSelect = (e) => {
    const selectedIndex = e.target.value;
    if (!selectedIndex || selectedIndex === '') return;

    const sponsor = allSponsors[parseInt(selectedIndex)];
    if (!sponsor) return;

    console.log('Selected sponsor:', sponsor);

    const weekendNum = sponsor['Candidate Weekend'] ? 
      sponsor['Candidate Weekend'].match(/\d+/)?.[0] || '' : '';

    setFormData(prev => ({
      ...prev,
      s_first: sponsor.First || '',
      s_last: sponsor.Last || '',
      s_address: sponsor.Address || '',
      s_city: sponsor.City || '',
      s_state: sponsor.State || '',
      s_zip: sponsor.Zip ? sponsor.Zip.toString() : '',
      s_phone: sponsor.Phone1 || '',
      s_email: sponsor.Email || '',
      s_church: sponsor.Church || '',
      s_weekendno: weekendNum
    }));
  };

  const fillCommunityName = (e) => {
    e.preventDefault();
    console.log('Filling community name:', communityName);
    setFormData(prev => ({ ...prev, s_weekend: communityName }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleToggleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value === 'yes' }));
  };

  const formatPhoneNumber = (fieldName) => {
    const value = formData[fieldName];
    if (!value) return;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
      const formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
      setFormData(prev => ({ ...prev, [fieldName]: formatted }));
    }
  };

  const handlePaymentClick = (type, method) => {
    setPaymentFields(prev => {
      const updated = { ...prev };
      if (type === 'wk') {
        if (method === 'cash') {
          updated.wk.cash = !prev.wk.cash;
          if (updated.wk.cash) { updated.wk.check = false; updated.wk.scholarship = false; }
        } else if (method === 'check') {
          updated.wk.check = !prev.wk.check;
          if (updated.wk.check) { updated.wk.cash = false; updated.wk.scholarship = false; }
        } else if (method === 'scholarship') {
          updated.wk.scholarship = !prev.wk.scholarship;
          if (updated.wk.scholarship) { updated.wk.cash = false; updated.wk.check = false; }
        }
      } else if (type === 'sp') {
        if (method === 'cash') {
          updated.sp.cash = !prev.sp.cash;
          if (updated.sp.cash) updated.sp.check = false;
        } else if (method === 'check') {
          updated.sp.check = !prev.sp.check;
          if (updated.sp.check) updated.sp.cash = false;
        }
      }
      return updated;
    });
  };

  const handleScholarshipTypeChange = (type) => {
    setPaymentFields(prev => ({ ...prev, wk: { ...prev.wk, scholarshipType: type } }));
  };

  const getWeekendFeeSummary = () => {
    if (paymentFields.wk.cash) return 'Paid (Cash)';
    if (paymentFields.wk.check) return 'Paid (Check)';
    if (paymentFields.wk.scholarship) {
      if (paymentFields.wk.scholarshipType === 'full') return 'Full Scholarship';
      return `Partial Scholarship ($${paymentFields.wk.partialAmount || 0})`;
    }
    return 'Not Paid';
  };

  const getSponsorFeeSummary = () => {
    if (paymentFields.sp.cash) return 'Paid (Cash)';
    if (paymentFields.sp.check) return 'Paid (Check)';
    return 'Not Paid';
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all fields on the application? This cannot be undone.')) {
      setFormData({
        c_lastname: '', c_address: '', c_city: '', c_state: '', c_zip: '', c_church: '',
        c_ms: false, c_clergy: false, c_spouseatt: false, c_ischristian: false,
        m_first: '', m_pref: '', m_age: '', m_cell: '', m_email: '', m_emerg: '', m_emergphone: '',
        f_first: '', f_pref: '', f_age: '', f_cell: '', f_email: '', f_emerg: '', f_emergphone: '',
        s_first: '', s_last: '', s_address: '', s_city: '', s_state: '', s_zip: '',
        s_phone: '', s_email: '', s_church: '', s_weekend: '', s_weekendno: '', s_community: ''
      });
      setPaymentFields({
        wk: { cash: false, check: false, scholarship: false, scholarshipType: 'full', partialAmount: 0 },
        sp: { cash: false, check: false }
      });
      setSaveStatus('');
    }
  };

  const handleSubmit = async () => {
    if (!formData.c_lastname || (!formData.m_first && !formData.f_first)) {
      alert('Last name and at least one first name are required.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      const hasMan = formData.m_first && formData.m_first.trim() !== '';
      const hasWoman = formData.f_first && formData.f_first.trim() !== '';
      
      const data = {
        ...formData,
        org_id: orgId,
        payment_wk_cash: paymentFields.wk.cash,
        payment_wk_check: paymentFields.wk.check,
        payment_wk_scholarship: paymentFields.wk.scholarship,
        payment_wk_scholarshiptype: paymentFields.wk.scholarshipType,
        payment_wk_partialamount: paymentFields.wk.partialAmount,
        payment_sp_cash: paymentFields.sp.cash,
        payment_sp_check: paymentFields.sp.check,
        m_age: formData.m_age === '' ? null : parseInt(formData.m_age) || null,
        f_age: formData.f_age === '' ? null : parseInt(formData.f_age) || null,
        gender: hasMan && !hasWoman ? 'men' : !hasMan && hasWoman ? 'women' : null,
        status: 'Pending',
        submittedAt: new Date().toISOString()
      };

      const { error } = await supabase.from('cra_applications').insert([data]);
      if (error) throw error;

      setSaveStatus('✓ Saved');
      setTimeout(() => {
        setSaveStatus('');
        handleClear();
      }, 1500);

    } catch (error) {
      console.error('Error saving application:', error);
      alert(`Error saving application: ${error.message}`);
      setSaveStatus('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-panel" style={{ display: 'block' }}>
      <div id="cra-entry" className="card pad">
        {/* Candidate General Information */}
        <div className="section-title">Candidate — General Information</div>
        <div className="grid grid-3">
          <div className="field">
            <label className="label">Last Name</label>
            <input className="input" id="c_lastname" value={formData.c_lastname} onChange={handleChange} required />
          </div>
          <div className="field">
            <label className="label">Street Address</label>
            <input className="input" id="c_address" value={formData.c_address} onChange={handleChange} />
          </div>
          <div className="field">
            <label className="label">City</label>
            <input className="input" id="c_city" value={formData.c_city} onChange={handleChange} />
          </div>
          <div className="field">
            <label className="label">State</label>
            <input className="input" id="c_state" value={formData.c_state} onChange={handleChange} maxLength="2" />
          </div>
          <div className="field">
            <label className="label">ZIP</label>
            <input className="input" id="c_zip" value={formData.c_zip} onChange={handleChange} />
          </div>
          <div className="field">
            <label className="label">Church</label>
            <input className="input" id="c_church" value={formData.c_church} onChange={handleChange} />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div className="field" style={{ flex: '1', minWidth: '220px', marginBottom: '0' }}>
            <label className="label">Married?</label>
            <div className="toggle">
              <div className={`opt ${!formData.c_ms ? 'active' : ''}`} onClick={() => handleToggleChange('c_ms', 'no')}>No</div>
              <div className={`opt ${formData.c_ms ? 'active' : ''}`} onClick={() => handleToggleChange('c_ms', 'yes')}>Yes</div>
            </div>
          </div>
          <div className="field" style={{ flex: '1', minWidth: '220px', marginBottom: '0' }}>
            <label className="label">Pastor/Clergy?</label>
            <div className="toggle">
              <div className={`opt ${!formData.c_clergy ? 'active' : ''}`} onClick={() => handleToggleChange('c_clergy', 'no')}>No</div>
              <div className={`opt ${formData.c_clergy ? 'active' : ''}`} onClick={() => handleToggleChange('c_clergy', 'yes')}>Yes</div>
            </div>
          </div>
          <div className="field" style={{ flex: '1', minWidth: '220px', marginBottom: '0' }}>
            <label className="label">Spouse Attended?</label>
            <div className="toggle">
              <div className={`opt ${!formData.c_spouseatt ? 'active' : ''}`} onClick={() => handleToggleChange('c_spouseatt', 'no')}>No</div>
              <div className={`opt ${formData.c_spouseatt ? 'active' : ''}`} onClick={() => handleToggleChange('c_spouseatt', 'yes')}>Yes</div>
            </div>
          </div>
        </div>

        {/* Man/Woman Section */}
        <div className="grid grid-2">
          <div>
            <div className="section-title">Male Candidate</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px 16px' }}>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">First Name</label>
                <input className="input" id="m_first" value={formData.m_first} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label className="label">Preferred Name</label>
                <input className="input" id="m_pref" value={formData.m_pref} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 1' }}>
                <label className="label">Age</label>
                <input type="text" className="input" id="m_age" value={formData.m_age} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Cell</label>
                <input className="input" id="m_cell" value={formData.m_cell} onChange={handleChange} onBlur={() => formatPhoneNumber('m_cell')} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Email</label>
                <input type="email" className="input" id="m_email" value={formData.m_email} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Emergency Contact</label>
                <input className="input" id="m_emerg" value={formData.m_emerg} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Emergency Phone</label>
                <input className="input" id="m_emergphone" value={formData.m_emergphone} onChange={handleChange} onBlur={() => formatPhoneNumber('m_emergphone')} />
              </div>
            </div>
          </div>

          <div>
            <div className="section-title">Female Candidate</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px 16px' }}>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">First Name</label>
                <input className="input" id="f_first" value={formData.f_first} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label className="label">Preferred Name</label>
                <input className="input" id="f_pref" value={formData.f_pref} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 1' }}>
                <label className="label">Age</label>
                <input type="text" className="input" id="f_age" value={formData.f_age} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Cell</label>
                <input className="input" id="f_cell" value={formData.f_cell} onChange={handleChange} onBlur={() => formatPhoneNumber('f_cell')} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Email</label>
                <input type="email" className="input" id="f_email" value={formData.f_email} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Emergency Contact</label>
                <input className="input" id="f_emerg" value={formData.f_emerg} onChange={handleChange} />
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label className="label">Emergency Phone</label>
                <input className="input" id="f_emergphone" value={formData.f_emergphone} onChange={handleChange} onBlur={() => formatPhoneNumber('f_emergphone')} />
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor Information with Dropdown */}
        <div className="section-title">Sponsor Information</div>
        
        {/* Sponsor Dropdown */}
        <div className="field" style={{ marginBottom: '16px' }}>
          <label className="label">Select Sponsor (Optional - Auto-fills info below)</label>
          <select 
            className="input" 
            onChange={handleSponsorSelect}
            defaultValue=""
            disabled={isLoadingSponsors}
            style={{ cursor: isLoadingSponsors ? 'wait' : 'pointer' }}
          >
            <option value="">
              {isLoadingSponsors ? 'Loading sponsors...' : 'Select a sponsor...'}
            </option>
            {allSponsors.map((sponsor, idx) => (
              <option key={idx} value={idx}>
                {sponsor.Last}, {sponsor.First}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-3">
          <div className="field"><label className="label">First Name</label><input className="input" id="s_first" value={formData.s_first} onChange={handleChange} /></div>
          <div className="field"><label className="label">Last Name</label><input className="input" id="s_last" value={formData.s_last} onChange={handleChange} /></div>
          <div className="field"><label className="label">Street Address</label><input className="input" id="s_address" value={formData.s_address} onChange={handleChange} /></div>
          <div className="field"><label className="label">City</label><input className="input" id="s_city" value={formData.s_city} onChange={handleChange} /></div>
          <div className="field"><label className="label">State</label><input className="input" id="s_state" value={formData.s_state} onChange={handleChange} maxLength="2" /></div>
          <div className="field"><label className="label">ZIP</label><input className="input" id="s_zip" value={formData.s_zip} onChange={handleChange} /></div>
          <div className="field"><label className="label">Phone</label><input className="input" id="s_phone" value={formData.s_phone} onChange={handleChange} onBlur={() => formatPhoneNumber('s_phone')} /></div>
          <div className="field"><label className="label">Email</label><input type="email" className="input" id="s_email" value={formData.s_email} onChange={handleChange} /></div>
          <div className="field"><label className="label">Church</label><input className="input" id="s_church" value={formData.s_church} onChange={handleChange} /></div>
        </div>
        
        {/* Weekend Info Row - Updated column widths */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.75fr 1.5fr 1.25fr', alignItems: 'end', gap: '16px', marginTop: '16px' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Weekend Attended</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input 
                className="input" 
                id="s_weekend" 
                value={formData.s_weekend} 
                onChange={handleChange}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary" 
                onClick={fillCommunityName}
                type="button"
                style={{ 
                  whiteSpace: 'nowrap', 
                  flexShrink: 0,
                  padding: '0 16px',
                  minWidth: 'fit-content'
                }}
              >
                {communityName}
              </button>
            </div>
          </div>
          
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Wknd #</label>
            <input className="input" id="s_weekendno" value={formData.s_weekendno} onChange={handleChange} />
          </div>
          
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Community</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input 
                className="input" 
                id="s_community" 
                value={formData.s_community} 
                onChange={handleChange}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary" 
                onClick={(e) => {
                  e.preventDefault();
                  setFormData(prev => ({ ...prev, s_community: communityName }));
                }}
                type="button"
                style={{ 
                  whiteSpace: 'nowrap', 
                  flexShrink: 0,
                  padding: '0 16px',
                  minWidth: 'fit-content'
                }}
              >
                {communityName}
              </button>
            </div>
          </div>
          
          <div className="field" style={{ marginBottom: '0' }}>
            <label className="label">Christian?</label>
            <div className="toggle">
              <div className={`opt ${!formData.c_ischristian ? 'active' : ''}`} onClick={() => handleToggleChange('c_ischristian', 'no')}>No</div>
              <div className={`opt ${formData.c_ischristian ? 'active' : ''}`} onClick={() => handleToggleChange('c_ischristian', 'yes')}>Yes</div>
            </div>
          </div>
        </div>

        {/* Payment Cards */}
        <div className="section-title">Payment</div>
        <div className="grid grid-2" style={{ gap: '16px' }}>
          <div className="card pad fee-card">
            <div className="label" style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '10px' }}>Weekend Fee</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button 
                className={`btn ${paymentFields.wk.cash ? 'btn-primary' : ''}`} 
                onClick={() => handlePaymentClick('wk', 'cash')} 
                style={{ flex: '1' }}
                type="button"
              >
                Cash
              </button>
              <button 
                className={`btn ${paymentFields.wk.check ? 'btn-primary' : ''}`} 
                onClick={() => handlePaymentClick('wk', 'check')} 
                style={{ flex: '1' }}
                type="button"
              >
                Check
              </button>
            </div>
            <button 
              className={`btn ${paymentFields.wk.scholarship ? 'btn-primary' : ''}`} 
              onClick={() => handlePaymentClick('wk', 'scholarship')} 
              style={{ width: '100%' }}
              type="button"
            >
              Scholarship
            </button>
            
            {paymentFields.wk.scholarship && (
              <div id="scholarship-options" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <div className="label" style={{ marginBottom: '8px' }}>Scholarship Type</div>
                <div className="toggle" style={{ marginBottom: '12px' }}>
                  <div 
                    className={`opt ${paymentFields.wk.scholarshipType === 'full' ? 'active' : ''}`} 
                    onClick={() => handleScholarshipTypeChange('full')}
                  >
                    Full
                  </div>
                  <div 
                    className={`opt ${paymentFields.wk.scholarshipType === 'partial' ? 'active' : ''}`} 
                    onClick={() => handleScholarshipTypeChange('partial')}
                  >
                    Partial
                  </div>
                </div>
                {paymentFields.wk.scholarshipType === 'partial' && (
                  <div id="partial-amount-container">
                    <label className="label">Partial Amount ($)</label>
                    <input 
                      className="input" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={paymentFields.wk.partialAmount} 
                      onChange={(e) => setPaymentFields(prev => ({ ...prev, wk: { ...prev.wk, partialAmount: parseFloat(e.target.value) || 0 } }))} 
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="inline-status" style={{ marginTop: '12px' }}>{getWeekendFeeSummary()}</div>
          </div>

          <div className="card pad fee-card">
            <div className="label" style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '10px' }}>Sponsor Fee</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`btn ${paymentFields.sp.cash ? 'btn-primary' : ''}`} 
                onClick={() => handlePaymentClick('sp', 'cash')} 
                style={{ flex: '1' }}
                type="button"
              >
                Cash
              </button>
              <button 
                className={`btn ${paymentFields.sp.check ? 'btn-primary' : ''}`} 
                onClick={() => handlePaymentClick('sp', 'check')} 
                style={{ flex: '1' }}
                type="button"
              >
                Check
              </button>
            </div>
            <div className="inline-status" style={{ marginTop: '12px' }}>{getSponsorFeeSummary()}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <button id="cra_clear" className="btn" onClick={handleClear} disabled={isSaving} type="button">Clear Form</button>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            <span id="craSaveStatus" style={{ fontWeight: '700', opacity: saveStatus ? '1' : '0', transition: 'opacity 0.5s ease-in-out' }}>
              {saveStatus}
            </span>
            <button id="cra_submit" className="btn btn-primary" onClick={handleSubmit} disabled={isSaving} type="button">
              {isSaving ? 'Saving...' : 'Save Candidate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}