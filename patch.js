const fs = require('fs');
let content = fs.readFileSync('src/services/scheduleService.js', 'utf8');

if (!content.includes('writeBatch')) {
  content = content.replace("from 'firebase/firestore';", "writeBatch } from 'firebase/firestore';");
}

if (!content.includes('addScheduleEventsBatch')) {
  const addScheduleEventCode = `
  async addScheduleEventsBatch(events, teamId = null) {
    if (!events || events.length === 0) return;
    const batch = writeBatch(db);
    const colRef = collection(db, this.getSchedulePath(teamId));
    
    events.forEach(event => {
      const newDocRef = doc(colRef);
      batch.set(newDocRef, event);
    });
    
    await batch.commit();
  },
`;
  content = content.replace("  async addScheduleEvent", addScheduleEventCode + "  async addScheduleEvent");
  fs.writeFileSync('src/services/scheduleService.js', content, 'utf8');
}
