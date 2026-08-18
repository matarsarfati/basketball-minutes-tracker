const fs = require('fs');
let code = fs.readFileSync('src/SurveyForm.jsx', 'utf8');

code = code.replace(/  \</div>\n    \</div>\n  \</div>\n\);\n      \) : !isLoading && !dataError \? \(/g, 
`              </form>
            </div>
          </div>
      ) : !isLoading && !dataError ? (`);

fs.writeFileSync('src/SurveyForm.jsx', code);
console.log("fixed");
