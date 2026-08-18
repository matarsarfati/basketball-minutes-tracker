const fs = require('fs');

let code = fs.readFileSync('src/WellnessForm.jsx', 'utf8');

// I will just replace the rendering portion entirely.

const returnStart = code.lastIndexOf('  return (', code.lastIndexOf('<div className="survey-form">', code.lastIndexOf('<h1 className="survey-title"')));

if (returnStart === -1) {
    console.log("NOT FOUND returnStart");
    process.exit(1);
}

// Remove everything from the last return
code = code.substring(0, returnStart);

code += `  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />

      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{maxWidth: "500px"}}>
          <div className="survey-wrap">
            <div className="survey-card">
              <h1 className="survey-title">💪 Daily Wellness Check</h1>

              {!isLoading && (
                <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="text-center mb-3">
                    <span className="text-2xl font-bold text-teal-600">
                      {Object.keys(completed || {}).length}
                    </span>
                    <span className="text-gray-600"> of </span>
                    <span className="text-2xl font-bold text-teal-600">
                      {players.length}
                    </span>
                    <span className="text-gray-600"> players completed</span>
                  </div>

                  {(() => {
                    const completedNames = new Set(Object.keys(completed || {}));
                    const pendingPlayers = players.filter(
                      p => !completedNames.has(p.name)
                    );

                    if (pendingPlayers.length === 0 && players.length > 0) {
                      return (
                        <div className="text-center text-green-600 font-medium mt-2">
                          All present players have submitted wellness! 🎉
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Player</label>
                  <select
                    value={selectedPlayer}
                    onChange={handlePlayerChange}
                    className="player-select"
                  >
                    <option value="">Select Player</option>
                    {players.map(player => (
                      <option key={player.name} value={player.name}>
                        {player.name} {player.number ? \`#\${player.number}\` : ''} {completed[player.name] ? "✓" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {renderControl("sleep", values.sleep, (name, value) =>
                  setValues(prev => ({ ...prev, [name]: value })))}
                {renderControl("fatigue", values.fatigue, (name, value) =>
                  setValues(prev => ({ ...prev, [name]: value })))}
                {renderControl("soreness", values.soreness, (name, value) =>
                  setValues(prev => ({ ...prev, [name]: value })))}

                <div className="survey-control">
                  <label className="control-label">Notes for Physiotherapist (optional)</label>
                  <textarea
                    value={values.physioNotes}
                    onChange={e => setValues(prev => ({ ...prev, physioNotes: e.target.value }))}
                    className="survey-textarea"
                    placeholder="Any injuries, pain, or concerns the physio should know about..."
                    rows={4}
                    dir="auto"
                    lang="he"
                  />
                </div>

                {error && <div className="survey-error">{error}</div>}

                <button
                  type="submit"
                  className="survey-primary"
                  style={{ backgroundColor: '#14b8a6' }}
                  disabled={
                    !selectedPlayer ||
                    values.sleep === null ||
                    values.fatigue === null ||
                    values.soreness === null ||
                    isSaving
                  }
                >
                  {isSaving ? "Saving..." : "Submit Wellness Check"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (!isLoading && !dataError) ? (
        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>
      ) : null}
    </div>
  );
}
`;

fs.writeFileSync('src/WellnessForm.jsx', code);
console.log("Patched wellness layout");
