const fs = require('fs');
let code = fs.readFileSync('src/SurveyForm.jsx', 'utf8');

// Replace { sessionId } with nothing from url since SurveySessionSelector uses it
code = code.replace(/const \{ sessionId \} = useParams\(\);/, '');

// Replace all usages of sessionId to use (activeSession?.id || activeSession?.firebaseId)
code = code.replace(/surveys\[sessionId\]/g, 'surveys[currentId]');
code = code.replace(/practiceDataService\.updateSurveyResponse\(sessionId,/g, 'practiceDataService.updateSurveyResponse(currentId,');
code = code.replace(/store\[sessionId\]/g, 'store[currentId]');
code = code.replace(/navigate\(\`\/practice\/\$\{sessionId\}\`\)/g, 'navigate(`/team/${activeTeam?.id}/practice/${currentId}`)');

const returnIdx = code.indexOf('return (', code.indexOf('if (dataError) {') + 50);

const wrapCode = `  const currentId = activeSession?.id || activeSession?.firebaseId;

  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />
      
      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{maxWidth: "500px"}}>
          <div className="survey-wrap">
            <div className="survey-card">
              <h1 className="text-xl font-bold mb-4">Practice Survey</h1>

              {!isLoading && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center mb-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {Object.keys(store[currentId] || {}).length}
                    </span>
                    <span className="text-gray-600"> of </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {presentPlayers.length}
                    </span>
                    <span className="text-gray-600"> players completed</span>
                  </div>

                  {(() => {
                    const completedNames = new Set(Object.keys(store[currentId] || {}));
                    const pendingPlayers = presentPlayers.filter(
                      p => !completedNames.has(p.name)
                    );

                    if (pendingPlayers.length === 0 && presentPlayers.length > 0) {
                      return (
                        <div className="text-center text-green-600 font-medium mt-2">
                          All present players have submitted! 🎉
                        </div>
                      );
                    }

                    if (pendingPlayers.length > 0) {
                      return (
                        <div className="mt-2 text-sm text-gray-600 text-center">
                          <span className="font-medium text-gray-700">Pending: </span>
                          {pendingPlayers.map(p => p.name).join(", ")}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

`;

// Find the line "        {/* Enhanced Status Section */}" and replace everything above it
let topPart = code.substring(0, returnIdx);

// Find where the actual form begins
const formStartIdx = code.indexOf('<form', returnIdx);

// Find the end for closing brackets
const formEndIdx = code.lastIndexOf('</div>');

const finalCode = topPart + wrapCode + code.substring(formStartIdx, code.lastIndexOf(');') + 2) + `\n      ) : !isLoading && !dataError ? (\n        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>\n      ) : null}\n    </div>\n  );\n}\n`;

fs.writeFileSync('src/SurveyForm.jsx', finalCode);
console.log("Mashed SurveyForm");
