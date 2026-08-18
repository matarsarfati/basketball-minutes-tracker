const fs = require('fs');
let code = fs.readFileSync('src/GymSurvey.jsx', 'utf8');

const lastForm = code.lastIndexOf('</form>');
code = code.substring(0, lastForm) + `</form>
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
fs.writeFileSync('src/GymSurvey.jsx', code);
console.log("fixed2");
