export default function RosterManagementModal({ 
  positions, 
  rosterData, 
  findMember, 
  findMemberName, 
  onClose, 
  onOpenAssignment,
  onRefresh 
}) {

  function getMemberName(pos, data) {
    let memberName = 'Unassigned';
    
    if (pos.type === 'couple') {
      const member1 = findMember(data.member1_id);
      const member2 = findMember(data.member2_id);
      if (member1 && member2) {
        const firstName1 = member1.Preferred || member1.First;
        const lastName1 = member1.Last;
        const firstName2 = member2.Preferred || member2.First;
        const lastName2 = member2.Last;
        if (lastName1 && lastName1.toLowerCase() === lastName2.toLowerCase()) {
          memberName = `${firstName1} & ${firstName2} ${lastName1}`;
        } else {
          memberName = `${firstName1} ${lastName1} & ${firstName2} ${lastName2}`;
        }
      } else if (member1) {
        memberName = `${member1.Preferred || member1.First} ${member1.Last}`;
      } else if (member2) {
        memberName = `${member2.Preferred || member2.First} ${member2.Last}`;
      }
    } else {
      const name1 = findMemberName(data.member1_id);
      if (name1) memberName = name1;
    }
    
    return memberName;
  }

  return (
    <div id="rosterManagementModal" className="modal" style={{ display: 'block' }}>
      <div className="box">
        <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Manage Board Roster</span>
          <button className="btn btn-small" onClick={onRefresh}>
            Refresh List
          </button>
        </div>
        <div className="body modal-body-grid" id="rosterModalBody">
          {positions.map(pos => {
            const data = rosterData[pos.key] || {};
            const memberName = getMemberName(pos, data);
            
            return (
              <div key={pos.key} className="roster-item">
                <div className="roster-item-info">
                  <span className="roster-item-position">{pos.name}</span>
                  <span className="roster-item-member">{memberName}</span>
                </div>
                <button 
                  className="btn btn-small" 
                  onClick={() => onOpenAssignment(pos.key)}
                >
                  {data.member1_id ? 'Edit' : 'Assign'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="foot">
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}