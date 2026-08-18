const fs = require('fs');
let code = fs.readFileSync('src/GymSurvey.jsx', 'utf8');

code = code.replace(/    \<\/div>\n  \);\n          \<\/div>\n        \<\/div>/, 
`          </div>
        </div>
      </div>`);

fs.writeFileSync('src/GymSurvey.jsx', code);
console.log("fixed");
