const fs = require('fs');
let code = fs.readFileSync('src/GymSurvey.jsx', 'utf8');

const returnIdx = code.indexOf('if (dataError) {');

const wrapCode = `
  return (
    <div className="flex flex-col flex-1 p-6">
      <SurveySessionSelector onSessionSelect={setActiveSession} />
      
      {activeSession ? (
        <div className="survey-form mx-auto w-full" style={{maxWidth: "500px"}}>
          <div className="survey-wrap">
            <div className="survey-card">
              <h1 className="text-xl font-bold mb-4">Gym Survey</h1>
`;

let topPart = code.substring(0, returnIdx);
const formStartIdx = code.indexOf('<form', returnIdx);

const finalCode = topPart + wrapCode + code.substring(formStartIdx, code.lastIndexOf(');') + 2) + `\n          </div>\n        </div>\n      ) : (!isLoading && !dataError) ? (\n        <div className="text-center text-slate-500 mt-10">Please select a session above to begin survey.</div>\n      ) : null}\n    </div>\n  );\n}\n`;

fs.writeFileSync('src/GymSurvey.jsx', finalCode);
console.log("Success");
