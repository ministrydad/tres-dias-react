// src/modules/TablePlanner/TablePlanner.jsx
// Table seating planner with drag-and-drop functionality
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { MdPerson, MdSave, MdAutoFixHigh, MdRefresh, MdPrint } from 'react-icons/md';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, PDFViewer, Image } from '@react-pdf/renderer';
import html2canvas from 'html2canvas';

// Table name constants
const TABLE_NAMES = {
  men: ['John', 'Luke', 'Mark', 'Matthew', 'Paul', 'Peter'],
  women: ['Elizabeth', 'Esther', 'Joanna', 'Rachel', 'Rebeka', 'Ruth', 'Susanna']
};

// Shape configurations
const SHAPES = [
  { id: 'round-6', label: 'Round (6)', seats: 6, shape: 'round' },
  { id: 'round-7', label: 'Round (7)', seats: 7, shape: 'round' },
  { id: 'round-8', label: 'Round (8)', seats: 8, shape: 'round' },
  { id: 'square-4', label: 'Square (4)', seats: 4, shape: 'square' },
  { id: 'rect-6', label: 'Rect (6)', seats: 6, shape: 'rectangle' },
  { id: 'rect-8', label: 'Rect (8)', seats: 8, shape: 'rectangle' }
];

// PDF Styles - Image-based layout
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2 solid #333',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  canvasImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  },
});

// PDF Document Component - Shows captured canvas image
const TablePlannerPDF = ({ communityName, weekendIdentifier, canvasImage }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>
            {communityName} - {weekendIdentifier}
          </Text>
          <Text style={pdfStyles.subtitle}>Table Assignments</Text>
          <Text style={pdfStyles.subtitle}>
            Generated: {dateStr} at {timeStr}
          </Text>
        </View>

        {/* Canvas Image */}
        {canvasImage && (
          <Image
            src={canvasImage}
            style={pdfStyles.canvasImage}
          />
        )}
      </Page>
    </Document>
  );
};

export default function TablePlanner() {
  const { orgId, user } = useAuth();
  const { allPescadores, loading: pescadoresLoading } = usePescadores();
  
  // Core state
  const [currentGender, setCurrentGender] = useState('men');
  const [weekendIdentifier, setWeekendIdentifier] = useState('');
  const [tables, setTables] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Drag state
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragType, setDragType] = useState(null); // 'shape', 'table', 'person'
  
  // Table creation modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedTableName, setSelectedTableName] = useState('');
  const [selectedShape, setSelectedShape] = useState(null);
  
  // Podium state
  const [podiumPerson, setPodiumPerson] = useState(null); // { personId, name, type }
  
  // PDF generation state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [canvasImage, setCanvasImage] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Grid settings
  const GRID_SIZE = 120;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Global function for removing person from seat (called by Seat component)
  useEffect(() => {
    window.removePersonFromSeat = (tableId, seatIndex, personId) => {
      // Remove from table
      setTables(prev => prev.map(table => {
        if (table.id === tableId) {
          const newAssignments = [...table.assignments];
          newAssignments[seatIndex] = { personId: null, name: null, type: null };
          return { ...table, assignments: newAssignments };
        }
        return table;
      }));

      // Update person state
      setPeople(prev => prev.map(p => 
        p.id === personId
          ? { ...p, assigned: false, tableId: null, seatIndex: null }
          : p
      ));

      window.showMainStatus?.('Person removed from seat');
    };

    return () => {
      delete window.removePersonFromSeat;
    };
  }, []);

  // Load latest weekend on mount and gender change
  useEffect(() => {
    if (!pescadoresLoading && orgId) {
      loadLatestWeekend();
    }
  }, [currentGender, pescadoresLoading, orgId]);

  // Load people when weekend or gender changes
  useEffect(() => {
    if (weekendIdentifier && !pescadoresLoading) {
      loadPeople();
    }
  }, [weekendIdentifier, currentGender, pescadoresLoading]);

  // Load saved layout when weekend changes
  useEffect(() => {
    if (weekendIdentifier && orgId) {
      loadSavedLayout();
    }
  }, [weekendIdentifier, orgId]);

  async function loadLatestWeekend() {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    
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
      } else {
        setWeekendIdentifier('');
        window.showMainStatus?.(`No ${currentGender}'s weekend found`, true);
      }
    } catch (error) {
      console.error('Error loading latest weekend:', error);
      window.showMainStatus?.('Failed to load weekend', true);
    }
  }

  async function loadPeople() {
    const rosterTable = currentGender === 'men' ? 'men_team_rosters' : 'women_team_rosters';
    const rawTableData = currentGender === 'men' 
      ? allPescadores['men']
      : [...allPescadores['women'], ...allPescadores['men']]; // Include male spiritual directors for women's weekends

    try {
      setLoading(true);

      // Load professors from team roster
      const { data: teamData, error: teamError } = await supabase
        .from(rosterTable)
        .select('pescadore_key, role')
        .eq('weekend_identifier', weekendIdentifier)
        .eq('org_id', orgId);
      
      if (teamError) throw teamError;

      const professors = [];
      (teamData || []).forEach(entry => {
        if (entry.role.startsWith('Prof_')) {
          const profile = rawTableData.find(p => p.PescadoreKey === entry.pescadore_key);
          if (profile) {
            professors.push({
              id: `prof-${profile.PescadoreKey}`,
              personId: profile.PescadoreKey,
              name: `${profile.Preferred || profile.First || ''} ${profile.Last || ''}`.trim(),
              type: 'professor',
              role: entry.role,
              assigned: false,
              tableId: null,
              seatIndex: null
            });
          }
        }
      });

      // Load candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('cra_applications')
        .select('id, m_first, m_pref, f_first, f_pref, c_lastname, attendance')
        .eq('org_id', orgId)
        .neq('attendance', 'no');
      
      if (candidatesError) throw candidatesError;

      const candidates = (candidatesData || [])
        .filter(c => {
          if (currentGender === 'men') {
            return c.m_first || c.m_pref;
          } else {
            return c.f_first || c.f_pref;
          }
        })
        .map(c => {
          const firstName = currentGender === 'men' 
            ? (c.m_pref || c.m_first || '')
            : (c.f_pref || c.f_first || '');
          const lastName = c.c_lastname || '';
          
          return {
            id: `cand-${c.id}`,
            personId: c.id,
            name: `${firstName} ${lastName}`.trim(),
            type: 'candidate',
            role: null,
            assigned: false,
            tableId: null,
            seatIndex: null
          };
        });

      setPeople([...professors, ...candidates]);
    } catch (error) {
      console.error('Error loading people:', error);
      window.showMainStatus?.('Failed to load people', true);
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedLayout() {
    try {
      const { data, error } = await supabase
        .from('table_layouts')
        .select('layout_data')
        .eq('org_id', orgId)
        .eq('weekend_identifier', weekendIdentifier)
        .eq('gender', currentGender)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      if (data?.layout_data) {
        const layoutData = data.layout_data;
        setTables(layoutData.tables || []);
        setPodiumPerson(layoutData.podium || null);
        
        // Update people assignments from saved layout
        setPeople(prev => prev.map(person => {
          // Check podium assignment
          if (layoutData.podium?.personId === person.personId) {
            return {
              ...person,
              assigned: true,
              tableId: 'podium',
              seatIndex: 0
            };
          }

          // Check table assignments
          const assignment = layoutData.tables
            .flatMap(table => 
              table.assignments.map((a, idx) => ({ ...a, tableId: table.id, seatIndex: idx }))
            )
            .find(a => a.personId === person.personId);
          
          if (assignment) {
            return {
              ...person,
              assigned: true,
              tableId: assignment.tableId,
              seatIndex: assignment.seatIndex
            };
          }
          return person;
        }));

        window.showMainStatus?.('Layout loaded');
      }
    } catch (error) {
      console.error('Error loading saved layout:', error);
    }
  }

  async function handleSaveLayout() {
    if (!weekendIdentifier) {
      window.showMainStatus?.('No weekend selected', true);
      return;
    }

    try {
      setSaving(true);

      const layoutData = {
        tables: tables,
        podium: podiumPerson,
        totalSeats: tables.reduce((sum, t) => sum + t.seats, 0),
        assignedSeats: tables.reduce((sum, t) => sum + t.assignments.filter(a => a.personId).length, 0),
        unassignedPeople: people.filter(p => !p.assigned).map(p => p.personId)
      };

      const { error } = await supabase
        .from('table_layouts')
        .upsert({
          org_id: orgId,
          weekend_identifier: weekendIdentifier,
          gender: currentGender,
          layout_data: layoutData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'org_id,weekend_identifier,gender'
        });

      if (error) throw error;

      window.showMainStatus?.('Layout saved successfully!');
    } catch (error) {
      console.error('Error saving layout:', error);
      window.showMainStatus?.(`Failed to save layout: ${error.message}`, true);
    } finally {
      setSaving(false);
    }
  }

  function handleAutoArrange() {
    if (tables.length === 0) {
      window.showMainStatus?.('Add tables first', true);
      return;
    }

    const numTables = tables.length;
    const layouts = {
      1: [[0]],
      2: [[0, 1]],
      3: [[0, 1, 2]],
      4: [[0, 1, 2, 3]],
      5: [[0, 1], [2], [3, 4]],
      6: [[0, 1, 2], [3, 4, 5]],
      7: [[0, 1, 2], [3, 4], [5, 6]],
      8: [[0, 1, 2, 3], [4, 5, 6, 7]]
    };

    const layout = layouts[numTables] || createGrid(numTables);
    
    const arrangedTables = tables.map((table, index) => {
      let rowIndex = 0;
      let colIndex = 0;
      
      // Find position in layout
      for (let r = 0; r < layout.length; r++) {
        const row = layout[r];
        if (row.includes(index)) {
          rowIndex = r;
          colIndex = row.indexOf(index);
          break;
        }
      }

      const x = 100 + (colIndex * GRID_SIZE * 3.5);
      const y = 100 + (rowIndex * GRID_SIZE * 3.5);

      return {
        ...table,
        x: Math.round(x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(y / GRID_SIZE) * GRID_SIZE
      };
    });

    setTables(arrangedTables);
    window.showMainStatus?.('Tables arranged!');
  }

  function createGrid(numTables) {
    const cols = Math.ceil(Math.sqrt(numTables));
    const rows = Math.ceil(numTables / cols);
    const grid = [];
    
    let index = 0;
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols && index < numTables; c++) {
        row.push(index++);
      }
      grid.push(row);
    }
    
    return grid;
  }

  function handleReset() {
    window.showConfirm({
      title: 'Reset Layout',
      message: 'Are you sure you want to clear all tables and assignments? This cannot be undone.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: () => {
        setTables([]);
        setPeople(prev => prev.map(p => ({ ...p, assigned: false, tableId: null, seatIndex: null })));
        setPodiumPerson(null);
        window.showMainStatus?.('Layout reset');
      }
    });
  }

  async function handlePrint() {
    try {
      setGeneratingPdf(true);
      window.showMainStatus?.('Capturing table layout...');
      
      const canvas = document.getElementById('print-canvas');
      if (!canvas) {
        window.showMainStatus?.('Canvas not found', true);
        setGeneratingPdf(false);
        return;
      }

      // Capture the canvas as high-quality image
      const capturedCanvas = await html2canvas(canvas, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = capturedCanvas.toDataURL('image/png');
      setCanvasImage(imgData);
      setShowPdfPreview(true);
      setGeneratingPdf(false);
      window.showMainStatus?.('PDF preview ready');
    } catch (error) {
      console.error('Error capturing canvas:', error);
      window.showMainStatus?.('Failed to capture layout', true);
      setGeneratingPdf(false);
    }
  }

  function handleOpenTableModal() {
    const tableNames = TABLE_NAMES[currentGender];
    const usedNames = tables.map(t => t.name);
    const availableNames = tableNames.filter(name => !usedNames.includes(name));
    
    if (availableNames.length === 0) {
      window.showMainStatus?.('All table names used', true);
      return;
    }

    setSelectedTableName('');
    setSelectedShape(null);
    setShowTableModal(true);
  }

  function handleCreateTable() {
    if (!selectedTableName || !selectedShape) {
      window.showMainStatus?.('Please select a table name and shape', true);
      return;
    }

    const shapeConfig = SHAPES.find(s => s.id === selectedShape);
    if (!shapeConfig) return;

    // Calculate position in a grid layout to avoid stacking
    const gridCols = 3; // 3 tables per row
    const gridSpacing = 400; // Space between tables (increased from 300)
    const rowIndex = Math.floor(tables.length / gridCols);
    const colIndex = tables.length % gridCols;
    
    const x = 100 + (colIndex * gridSpacing);
    const y = 100 + (rowIndex * gridSpacing);

    const newTable = {
      id: `table-${Date.now()}`,
      name: selectedTableName,
      shape: shapeConfig.shape,
      seats: shapeConfig.seats,
      x: x,
      y: y,
      assignments: Array(shapeConfig.seats).fill(null).map(() => ({
        personId: null,
        name: null,
        type: null
      }))
    };

    setTables(prev => [...prev, newTable]);
    setShowTableModal(false);
    window.showMainStatus?.(`Table of ${selectedTableName} added`);
  }

  function handleDragStart(event) {
    const { active } = event;
    setActiveDragId(active.id);
    
    if (active.id.startsWith('shape-')) {
      setDragType('shape');
    } else if (active.id.startsWith('table-')) {
      setDragType('table');
    } else {
      setDragType('person');
    }
  }

  function handleDragEnd(event) {
    const { active, over, delta } = event;
    
    if (!over) {
      setActiveDragId(null);
      setDragType(null);
      return;
    }

    // Handle table movement - update position when table drag ends
    if (active.id.startsWith('table-')) {
      const tableId = active.id;
      
      setTables(prev => prev.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            x: t.x + delta.x,
            y: t.y + delta.y
          };
        }
        return t;
      }));
    }

    // Handle person drops on seats
    if ((active.id.startsWith('prof-') || active.id.startsWith('cand-')) && over.id.startsWith('seat-')) {
      const parts = over.id.split('-'); // ['seat', 'table', '1762366249726', '0']
      const tableId = `${parts[1]}-${parts[2]}`; // 'table-1762366249726'
      const seatIndex = parseInt(parts[3]); // 0
      
      console.log('🎯 Parsed drop:', { overId: over.id, tableId, seatIndex });
      
      assignPersonToSeat(active.id, tableId, seatIndex);
    }

    // Handle person drops on podium
    if ((active.id.startsWith('prof-') || active.id.startsWith('cand-')) && over.id === 'podium') {
      assignPersonToPodium(active.id);
    }

    setActiveDragId(null);
    setDragType(null);
  }

  function assignPersonToSeat(personId, tableId, seatIndex) {
    const person = people.find(p => p.id === personId);
    if (!person) {
      console.error('❌ Person not found:', personId);
      return;
    }

    console.log('🎯 Assigning person:', person.name, 'to table:', tableId, 'seat:', seatIndex);

    // First, remove person from old seat if assigned
    if (person.assigned) {
      setTables(prev => {
        const updated = prev.map(table => {
          if (table.id === person.tableId) {
            const newAssignments = [...table.assignments];
            newAssignments[person.seatIndex] = { personId: null, name: null, type: null };
            return { ...table, assignments: newAssignments };
          }
          return table;
        });
        console.log('🔄 Removed from old seat, tables:', updated);
        return updated;
      });
    }

    // Then assign to new seat
    setTables(prev => {
      const updated = prev.map(table => {
        if (table.id === tableId) {
          const newAssignments = [...table.assignments];
          
          // Remove any existing person from this seat
          const existingPerson = newAssignments[seatIndex];
          if (existingPerson?.personId) {
            const existingPersonId = `${existingPerson.type === 'professor' ? 'prof' : 'cand'}-${existingPerson.personId}`;
            setPeople(prevPeople => prevPeople.map(p => 
              p.id === existingPersonId
                ? { ...p, assigned: false, tableId: null, seatIndex: null }
                : p
            ));
          }
          
          // Assign new person
          newAssignments[seatIndex] = {
            personId: person.personId,
            name: person.name,
            type: person.type
          };
          
          console.log('✅ Assigned to new seat. Seat data:', newAssignments[seatIndex]);
          console.log('✅ Full assignments:', newAssignments);
          
          return { ...table, assignments: newAssignments };
        }
        return table;
      });
      
      console.log('✅ Updated tables state:', updated);
      return updated;
    });

    // Update person state
    setPeople(prev => {
      const updated = prev.map(p => 
        p.id === personId
          ? { ...p, assigned: true, tableId, seatIndex }
          : p
      );
      console.log('✅ Updated people state:', updated.find(p => p.id === personId));
      return updated;
    });

    const tableName = tables.find(t => t.id === tableId)?.name;
    window.showMainStatus?.(`${person.name} assigned to Table of ${tableName}`);
  }

  function assignPersonToPodium(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    console.log('🎤 Assigning person to podium:', person.name);

    // Remove from old position if assigned
    if (person.assigned) {
      setTables(prev => {
        const updated = prev.map(table => {
          if (table.id === person.tableId) {
            const newAssignments = [...table.assignments];
            newAssignments[person.seatIndex] = { personId: null, name: null, type: null };
            return { ...table, assignments: newAssignments };
          }
          return table;
        });
        return updated;
      });
    }

    // Remove old podium person if exists
    if (podiumPerson) {
      const oldPersonId = `${podiumPerson.type === 'professor' ? 'prof' : 'cand'}-${podiumPerson.personId}`;
      setPeople(prev => prev.map(p => 
        p.id === oldPersonId
          ? { ...p, assigned: false, tableId: null, seatIndex: null }
          : p
      ));
    }

    // Assign to podium
    setPodiumPerson({
      personId: person.personId,
      name: person.name,
      type: person.type
    });

    // Update person state
    setPeople(prev => prev.map(p => 
      p.id === personId
        ? { ...p, assigned: true, tableId: 'podium', seatIndex: 0 }
        : p
    ));

    window.showMainStatus?.(`${person.name} assigned to Podium`);
  }

  function handleRemoveTable(tableId) {
    window.showConfirm({
      title: 'Remove Table',
      message: 'Remove this table and unassign all people?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: () => {
        const table = tables.find(t => t.id === tableId);
        if (table) {
          // Unassign all people from this table
          table.assignments.forEach(assignment => {
            if (assignment.personId) {
              const personType = assignment.type === 'professor' ? 'prof' : 'cand';
              setPeople(prev => prev.map(p => 
                p.id === `${personType}-${assignment.personId}`
                  ? { ...p, assigned: false, tableId: null, seatIndex: null }
                  : p
              ));
            }
          });
        }
        
        setTables(prev => prev.filter(t => t.id !== tableId));
        window.showMainStatus?.('Table removed');
      }
    });
  }

  const stats = {
    totalPeople: people.length,
    assignedPeople: people.filter(p => p.assigned).length,
    totalTables: tables.length,
    totalSeats: tables.reduce((sum, t) => sum + t.seats, 0),
    filledSeats: tables.reduce((sum, t) => sum + t.assignments.filter(a => a.personId).length, 0)
  };

  const communityName = user?.organization?.name || 'Tres Dias';

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <section className="app-panel" style={{ display: 'block', padding: 0 }}>
        {/* Header Card */}
        <div className="card pad" style={{ marginBottom: '12px' }}>
          <div className="section-title">
            Table Assignments
            {weekendIdentifier && (
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '15px' }}>
                {communityName} - {weekendIdentifier}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', paddingTop: '12px' }}>
            {/* Gender Toggle */}
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-primary"
                onClick={handleAutoArrange}
                disabled={tables.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdAutoFixHigh size={18} />
                Auto-Arrange
              </button>
              <button 
                className="btn btn-warning"
                onClick={handleReset}
                disabled={tables.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdRefresh size={18} />
                Reset
              </button>
              <button 
                className="btn btn-primary"
                onClick={handlePrint}
                disabled={tables.length === 0 || generatingPdf}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MdPrint size={18} />
                {generatingPdf ? 'Generating...' : 'Print'}
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveLayout}
                disabled={saving || !weekendIdentifier}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#28a745', borderColor: '#28a745' }}
              >
                <MdSave size={18} />
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </div>
          </div>

          {/* Add Table Button */}
          <div style={{ 
            paddingTop: '16px', 
            borderTop: '1px solid var(--border)', 
            marginTop: '16px' 
          }}>
            <button
              className="btn btn-primary"
              onClick={handleOpenTableModal}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              + Add Table
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* People List Sidebar */}
          <PeopleList people={people} loading={loading} />

          {/* Canvas */}
          <div style={{ flex: 1 }}>
            <Canvas 
              tables={tables}
              setTables={setTables}
              onRemoveTable={handleRemoveTable}
              gridSize={GRID_SIZE}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              podiumPerson={podiumPerson}
              onRemovePodiumPerson={() => {
                if (podiumPerson) {
                  const personType = podiumPerson.type === 'professor' ? 'prof' : 'cand';
                  const personId = `${personType}-${podiumPerson.personId}`;
                  setPeople(prev => prev.map(p => 
                    p.id === personId
                      ? { ...p, assigned: false, tableId: null, seatIndex: null }
                      : p
                  ));
                  setPodiumPerson(null);
                  window.showMainStatus?.('Person removed from Podium');
                }
              }}
            />

            {/* Stats Bar */}
            <div className="card pad" style={{ marginTop: '12px', padding: '12px 24px' }}>
              <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem' }}>
                <div>
                  <strong>{stats.totalPeople}</strong> people
                </div>
                <div>
                  <strong>{stats.assignedPeople}</strong> assigned
                </div>
                <div>
                  <strong>{stats.totalTables}</strong> tables
                </div>
                <div>
                  <strong>{stats.filledSeats}/{stats.totalSeats}</strong> seats filled
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table Creation Modal */}
      {showTableModal && (
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
            maxWidth: '600px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--panel-header)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
                Add New Table
              </h3>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {/* Step 1: Select Table Name */}
              <div style={{ marginBottom: '24px' }}>
                <label className="label" style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                  Step 1: Select Table Name
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {TABLE_NAMES[currentGender]
                    .filter(name => !tables.map(t => t.name).includes(name))
                    .map(name => (
                      <button
                        key={name}
                        onClick={() => setSelectedTableName(name)}
                        className="btn btn-small"
                        style={{
                          padding: '10px',
                          backgroundColor: selectedTableName === name ? 'var(--accentB)' : 'transparent',
                          color: selectedTableName === name ? 'white' : 'var(--ink)',
                          border: selectedTableName === name ? 'none' : '1px solid var(--border)',
                          fontWeight: selectedTableName === name ? 700 : 400
                        }}
                      >
                        {name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Step 2: Select Shape */}
              <div>
                <label className="label" style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                  Step 2: Select Shape & Seats
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {SHAPES.map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => setSelectedShape(shape.id)}
                      className="btn btn-small"
                      style={{
                        padding: '10px',
                        backgroundColor: selectedShape === shape.id ? 'var(--accentB)' : 'transparent',
                        color: selectedShape === shape.id ? 'white' : 'var(--ink)',
                        border: selectedShape === shape.id ? 'none' : '1px solid var(--border)',
                        fontWeight: selectedShape === shape.id ? 700 : 400
                      }}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
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
                onClick={() => setShowTableModal(false)}
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateTable}
                disabled={!selectedTableName || !selectedShape}
                style={{ minWidth: '100px' }}
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragId && dragType === 'shape' && (
          <div style={{ 
            padding: '8px 16px', 
            background: 'var(--accentB)', 
            color: 'white', 
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            {SHAPES.find(s => s.id === activeDragId.replace('shape-', ''))?.label}
          </div>
        )}
        {activeDragId && dragType === 'person' && (
          <PersonChip person={people.find(p => p.id === activeDragId)} isDragging />
        )}
      </DragOverlay>

      {/* PDF Preview Modal */}
      {showPdfPreview && canvasImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--panel)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '1200px',
            height: '90%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--panel-header)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Table Assignments PDF Preview
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <PDFDownloadLink
                  document={
                    <TablePlannerPDF
                      communityName={communityName}
                      weekendIdentifier={weekendIdentifier}
                      canvasImage={canvasImage}
                    />
                  }
                  fileName={`${weekendIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}_Table_Assignments.pdf`}
                >
                  {({ loading }) => (
                    <button className="btn btn-primary" disabled={loading}>
                      {loading ? 'Generating...' : 'Download PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
                <button 
                  className="btn"
                  onClick={() => {
                    setShowPdfPreview(false);
                    setCanvasImage(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PDFViewer width="100%" height="100%">
                <TablePlannerPDF
                  communityName={communityName}
                  weekendIdentifier={weekendIdentifier}
                  canvasImage={canvasImage}
                />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}

// ===== SUB-COMPONENTS =====

function PeopleList({ people, loading }) {
  const professors = people.filter(p => p.type === 'professor');
  const candidates = people.filter(p => p.type === 'candidate');
  const unassignedProfessors = professors.filter(p => !p.assigned);
  const unassignedCandidates = candidates.filter(p => !p.assigned);

  return (
    <div className="card pad" style={{ width: '280px', maxHeight: '700px', overflowY: 'auto' }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--ink)' }}>
        People ({people.length})
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
          Loading...
        </div>
      ) : (
        <>
          {/* Professors */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              color: 'var(--muted)', 
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              Professors ({unassignedProfessors.length}/{professors.length})
            </div>
            {unassignedProfessors.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                All assigned
              </div>
            ) : (
              unassignedProfessors.map(person => (
                <PersonChip key={person.id} person={person} />
              ))
            )}
          </div>

          {/* Candidates */}
          <div>
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              color: 'var(--muted)', 
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              Candidates ({unassignedCandidates.length}/{candidates.length})
            </div>
            {unassignedCandidates.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>
                All assigned
              </div>
            ) : (
              unassignedCandidates.map(person => (
                <PersonChip key={person.id} person={person} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PersonChip({ person, isDragging = false }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: person.id,
    data: person
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        padding: '8px 12px',
        marginBottom: '6px',
        background: 'var(--panel-header)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s'
      }}
    >
      <MdPerson size={16} />
      {person.name}
    </div>
  );
}

function Canvas({ tables, setTables, onRemoveTable, gridSize, width, height, podiumPerson, onRemovePodiumPerson }) {
  const { setNodeRef } = useDroppable({
    id: 'canvas'
  });

  return (
    <div 
      ref={setNodeRef}
      id="print-canvas"
      className="card"
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'var(--panel)',
        border: '2px dashed var(--border)',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Podium at top center */}
      <Podium person={podiumPerson} onRemove={onRemovePodiumPerson} />

      {tables.length === 0 ? (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '1.1rem'
        }}>
          Drag table shapes here to begin
        </div>
      ) : (
        tables.map(table => (
          <DraggableTable 
            key={`${table.id}-${table.assignments.filter(a => a.personId).length}`}
            table={table} 
            setTables={setTables}
            onRemove={onRemoveTable}
            gridSize={gridSize}
          />
        ))
      )}
    </div>
  );
}

function DraggableTable({ table, setTables, onRemove, gridSize }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    data: table
  });

  const style = {
    position: 'absolute',
    left: transform ? table.x + transform.x : table.x,
    top: transform ? table.y + transform.y : table.y,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div 
          {...attributes}
          {...listeners}
          style={{ 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            color: 'var(--muted)',
            cursor: 'grab',
            padding: '4px'
          }}
        >
          (Drag to move)
        </div>
      </div>
      <TableShape table={table} onRemove={onRemove} />
    </div>
  );
}

function TableShape({ table, onRemove }) {
  const size = table.shape === 'square' ? 125 : table.shape === 'rectangle' ? 156 : 140;
  const height = table.shape === 'rectangle' ? 94 : size;

  return (
    <div style={{ position: 'relative' }}>
      {/* Table Shape */}
      <div style={{
        width: `${size}px`,
        height: `${height}px`,
        border: '2px solid #495057',
        borderRadius: table.shape === 'round' ? '50%' : table.shape === 'square' ? '4px' : '8px',
        background: '#f8f9fa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.95rem',
        fontWeight: 700,
        color: '#495057',
        textAlign: 'center',
        padding: '8px',
        gap: '8px'
      }}>
        <div>
          Table of<br/>{table.name}
        </div>
        <button
          className="btn btn-small btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(table.id);
          }}
          style={{ fontSize: '0.65rem', padding: '3px 8px', marginTop: '4px' }}
        >
          Remove
        </button>
      </div>

      {/* Seats */}
      {table.assignments.map((assignment, index) => {
        const angle = (index / table.seats) * 2 * Math.PI - Math.PI / 2;
        const radius = table.shape === 'round' ? size / 2 + 55 : 
                      table.shape === 'square' ? size / 2 + 50 :
                      Math.max(size, height) / 2 + 50;
        
        const x = size / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;

        return (
          <Seat 
            key={index} 
            tableId={table.id} 
            seatIndex={index} 
            assignment={assignment}
            x={x}
            y={y}
          />
        );
      })}
    </div>
  );
}

// ===== PODIUM COMPONENT =====

function Podium({ person, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'podium'
  });

  const isProfessor = person?.type === 'professor';

  // Split name for double-stacking
  const nameParts = person?.name?.split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <div
      ref={setNodeRef}
      onClick={person ? onRemove : undefined}
      style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '180px',
        height: '80px',
        border: isOver ? '2px solid var(--accentB)' : '2px solid #495057',
        borderRadius: '8px',
        background: isOver ? 'var(--accentB-light)' : person ? '#f8f9fa' : 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        cursor: person ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
      title={person ? `Click to remove ${person.name}` : 'Drag person here for Podium'}
    >
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#495057' }}>
        PODIUM
      </div>
      {person && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '0.8rem', 
            fontWeight: isProfessor ? 700 : 400,
            color: '#212529'
          }}>
            {firstName}
          </div>
          {lastName && (
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: isProfessor ? 700 : 400,
              color: '#212529'
            }}>
              {lastName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== SEAT COMPONENT =====

function Seat({ tableId, seatIndex, assignment, x, y }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `seat-${tableId}-${seatIndex}`
  });

  const hasAssignment = assignment?.personId;
  const isProfessor = assignment?.type === 'professor';

  const handleRemovePerson = (e) => {
    e.stopPropagation();
    if (!hasAssignment) return;
    
    window.showConfirm({
      title: 'Remove Person',
      message: `Remove ${assignment.name} from this seat?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: () => {
        // Find the table and update it
        const personType = assignment.type === 'professor' ? 'prof' : 'cand';
        const personId = `${personType}-${assignment.personId}`;
        
        // This will be called from parent - need to add this function
        window.removePersonFromSeat?.(tableId, seatIndex, personId);
      }
    });
  };

  // Split name into first and last for double-stacking
  const nameParts = assignment?.name?.split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Auto-size based on longest part
  const longestPart = Math.max(firstName.length, lastName.length);
  const minWidth = 70;
  const width = hasAssignment ? Math.max(minWidth, longestPart * 7 + 20) : minWidth;
  const height = hasAssignment && lastName ? 42 : 32; // Taller if two lines

  return (
    <div
      ref={setNodeRef}
      onClick={handleRemovePerson}
      style={{
        position: 'absolute',
        left: x - (width / 2),
        top: y - (height / 2),
        width: `${width}px`,
        height: `${height}px`,
        border: isOver ? '2px solid var(--accentB)' : hasAssignment ? 'none' : '1px solid #dee2e6',
        borderRadius: '6px',
        background: isOver ? 'var(--accentB-light)' : hasAssignment ? 'transparent' : 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: isProfessor ? 700 : 400,
        color: '#212529',
        overflow: 'hidden',
        padding: '4px',
        transition: 'all 0.2s',
        cursor: hasAssignment ? 'pointer' : 'default',
        lineHeight: '1.2'
      }}
      title={hasAssignment ? `Click to remove ${assignment.name}` : 'Empty seat'}
    >
      {hasAssignment ? (
        <>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
            {firstName}
          </div>
          {lastName && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
              {lastName}
            </div>
          )}
        </>
      ) : '—'}
    </div>
  );
}

// Required imports for drag functionality
import { useDraggable, useDroppable } from '@dnd-kit/core';