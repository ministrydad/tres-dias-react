// src/modules/TablePlanner/TablePlanner.jsx
// Table seating planner with drag-and-drop functionality
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePescadores } from '../../context/PescadoresContext';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { MdPerson, MdSave, MdAutoFixHigh, MdRefresh } from 'react-icons/md';

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
  
  // Grid settings
  const GRID_SIZE = 120;
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
        
        // Update people assignments from saved layout
        setPeople(prev => prev.map(person => {
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

      const x = 100 + (colIndex * GRID_SIZE * 2.5);
      const y = 100 + (rowIndex * GRID_SIZE * 2.5);

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
        window.showMainStatus?.('Layout reset');
      }
    });
  }

  function handleAddTable(shapeConfig) {
    const tableNames = TABLE_NAMES[currentGender];
    const usedNames = tables.map(t => t.name);
    const availableName = tableNames.find(name => !usedNames.includes(name));
    
    if (!availableName) {
      window.showMainStatus?.('All table names used', true);
      return;
    }

    const newTable = {
      id: `table-${Date.now()}`,
      name: availableName,
      shape: shapeConfig.shape,
      seats: shapeConfig.seats,
      x: 200,
      y: 200,
      assignments: Array(shapeConfig.seats).fill(null).map(() => ({
        personId: null,
        name: null,
        type: null
      }))
    };

    setTables(prev => [...prev, newTable]);
    window.showMainStatus?.(`Table of ${availableName} added`);
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
    const { active, over } = event;
    
    if (!over) {
      setActiveDragId(null);
      setDragType(null);
      return;
    }

    // Handle shape drops (add new table)
    if (active.id.startsWith('shape-') && over.id === 'canvas') {
      const shapeId = active.id.replace('shape-', '');
      const shapeConfig = SHAPES.find(s => s.id === shapeId);
      if (shapeConfig) {
        handleAddTable(shapeConfig);
      }
    }

    // Handle table movement
    if (active.id.startsWith('table-') && over.id === 'canvas') {
      // Table position updated by DraggableTable component
    }

    // Handle person drops on seats
    if ((active.id.startsWith('prof-') || active.id.startsWith('cand-')) && over.id.startsWith('seat-')) {
      const [, tableId, seatIndex] = over.id.split('-');
      assignPersonToSeat(active.id, tableId, parseInt(seatIndex));
    }

    setActiveDragId(null);
    setDragType(null);
  }

  function assignPersonToSeat(personId, tableId, seatIndex) {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    // Remove person from old seat if assigned
    if (person.assigned) {
      setTables(prev => prev.map(table => {
        if (table.id === person.tableId) {
          const newAssignments = [...table.assignments];
          newAssignments[person.seatIndex] = { personId: null, name: null, type: null };
          return { ...table, assignments: newAssignments };
        }
        return table;
      }));
    }

    // Assign to new seat
    setTables(prev => prev.map(table => {
      if (table.id === tableId) {
        const newAssignments = [...table.assignments];
        
        // Remove any existing person from this seat
        const existingPerson = newAssignments[seatIndex];
        if (existingPerson?.personId) {
          setPeople(prevPeople => prevPeople.map(p => 
            p.id === `${existingPerson.type === 'professor' ? 'prof' : 'cand'}-${existingPerson.personId}`
              ? { ...p, assigned: false, tableId: null, seatIndex: null }
              : p
          ));
        }
        
        newAssignments[seatIndex] = {
          personId: person.personId,
          name: person.name,
          type: person.type
        };
        
        return { ...table, assignments: newAssignments };
      }
      return table;
    }));

    // Update person state
    setPeople(prev => prev.map(p => 
      p.id === personId
        ? { ...p, assigned: true, tableId, seatIndex }
        : p
    ));
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
                onClick={handleSaveLayout}
                disabled={saving || !weekendIdentifier}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#28a745', borderColor: '#28a745' }}
              >
                <MdSave size={18} />
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </div>
          </div>

          {/* Shape Palette */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--border)', 
            marginTop: '16px' 
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', alignSelf: 'center' }}>
              Drag shapes:
            </div>
            {SHAPES.map(shape => (
              <DraggableShape key={shape.id} shape={shape} />
            ))}
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
    </DndContext>
  );
}

// ===== SUB-COMPONENTS =====

function DraggableShape({ shape }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shape-${shape.id}`
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="btn btn-small"
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        padding: '6px 12px',
        fontSize: '0.85rem'
      }}
    >
      {shape.label}
    </button>
  );
}

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

  const isProfessor = person.type === 'professor';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        padding: '8px 12px',
        marginBottom: '6px',
        background: 'var(--panel-header)',
        border: isProfessor ? '2px solid var(--accentB)' : '1px solid var(--border)',
        borderRadius: '6px',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontWeight: isProfessor ? 700 : 400,
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s'
      }}
    >
      <MdPerson size={16} color={isProfessor ? 'var(--accentB)' : undefined} />
      {person.name}
    </div>
  );
}

function Canvas({ tables, setTables, onRemoveTable, gridSize, width, height }) {
  const { setNodeRef } = useDroppable({
    id: 'canvas'
  });

  return (
    <div 
      ref={setNodeRef}
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
            key={table.id} 
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

  useEffect(() => {
    if (transform && !isDragging) {
      // Snap to grid on drag end
      const newX = Math.round((table.x + transform.x) / gridSize) * gridSize;
      const newY = Math.round((table.y + transform.y) / gridSize) * gridSize;
      
      setTables(prev => prev.map(t => 
        t.id === table.id 
          ? { ...t, x: newX, y: newY }
          : t
      ));
    }
  }, [isDragging]);

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
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div 
          {...attributes}
          {...listeners}
          style={{ 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            color: 'var(--ink)',
            marginBottom: '4px',
            cursor: 'grab'
          }}
        >
          Table of {table.name}
        </div>
        <button
          className="btn btn-small btn-danger"
          onClick={() => onRemove(table.id)}
          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
        >
          Remove
        </button>
      </div>
      <TableShape table={table} />
    </div>
  );
}

function TableShape({ table }) {
  const size = table.shape === 'square' ? 100 : table.shape === 'rectangle' ? 125 : 112;
  const height = table.shape === 'rectangle' ? 75 : size;

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
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#6c757d'
      }}>
        {table.seats}
      </div>

      {/* Seats */}
      {table.assignments.map((assignment, index) => {
        const angle = (index / table.seats) * 2 * Math.PI - Math.PI / 2;
        const radius = table.shape === 'round' ? size / 2 + 40 : 
                      table.shape === 'square' ? size / 2 + 35 :
                      Math.max(size, height) / 2 + 35;
        
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

function Seat({ tableId, seatIndex, assignment, x, y }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `seat-${tableId}-${seatIndex}`
  });

  const hasAssignment = assignment?.personId;
  const isProfessor = assignment?.type === 'professor';

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: x - 30,
        top: y - 16,
        width: '60px',
        height: '32px',
        border: isOver ? '2px solid var(--accentB)' : hasAssignment ? '2px solid #28a745' : '2px solid #dee2e6',
        borderRadius: '4px',
        background: isOver ? 'var(--accentB-light)' : hasAssignment ? '#d4edda' : 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: isProfessor ? 700 : 400,
        color: hasAssignment ? '#155724' : '#6c757d',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 4px',
        transition: 'all 0.2s'
      }}
      title={assignment?.name || 'Empty seat'}
    >
      {assignment?.name || '—'}
    </div>
  );
}

// Required imports for drag functionality
import { useDraggable, useDroppable } from '@dnd-kit/core';