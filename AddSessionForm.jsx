// ...existing code...
const addSession = async () => {
  const { date, slot, startTime, type } = newSessionForm;

  if (!date || !type) {
    alert("Please provide date and type.");
    return;
  }

  // Special handling for Day Off
  if (type === "DayOff") {
    const newSession = {
      ...emptySession(date, "AM"), // Day Off doesn't need slot
      type: "DayOff"
    };

    try {
      const firebaseId = await scheduleService.addScheduleEvent(newSession);
      setSessions(prev => [...prev, { ...newSession, firebaseId }]);
      setNewSessionForm({ date: "", slot: "AM", startTime: "", type: "Practice" });
      setNewDateParts(splitISOToParts(""));
      setNewTimeParts(splitTimeToParts(""));
      setSelectedSessionId(newSession.id);
      setTrainingExpanded(true);
    } catch (error) {
      console.error('Failed to add session to Firebase:', error);
      alert('Failed to save session. Please try again.');
    }
    return;
  }

  // Regular session validation
  if (!slot || !startTime) {
    alert("Please provide slot and start time.");
    return;
  }

  const normalizedStart = normalizeTimeInput(startTime);
  if (!normalizedStart || !isValidTimeString(normalizedStart)) {
    alert("Please provide a valid start time (HH:mm).");
    return;
  }

  // Continue with regular session creation...
  // ...existing code...
};
// ...existing code...
<div className="addSessionCard__grid">
  <div className="addSessionCard__field">
    <label className="schedule-section-title" htmlFor="add-date-day">
      Date
    </label>
    {/* Date inputs stay the same */}
  </div>
  
  <div className="addSessionCard__field">
    <label className="schedule-section-title" htmlFor="add-type">
      Type
    </label>
    <select
      id="add-type"
      value={newSessionForm.type}
      onChange={event => setNewSessionFormValue("type", event.target.value)}
      className="schedule-select"
    >
      {TYPES.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>

  {/* Only show these fields if not Day Off */}
  {newSessionForm.type !== "DayOff" && (
    <>
      <div className="addSessionCard__field">
        <label className="schedule-section-title" htmlFor="add-slot">
          Slot
        </label>
        <select
          id="add-slot"
          value={newSessionForm.slot}
          onChange={event => setNewSessionFormValue("slot", event.target.value)}
          className="schedule-select"
        >
          {SLOT_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      
      <div className="addSessionCard__field">
        <label className="schedule-section-title" htmlFor="add-time-hour">
          Start Time
        </label>
        <div className="time-inputs">
          {/* Time inputs stay the same */}
        </div>
      </div>
    </>
  )}
</div>
// ...existing code...
