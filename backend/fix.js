const fs = require('fs'); 
const code = fs.readFileSync('src/routes/facultyRoutes.js', 'utf8'); 
const matches = [...code.matchAll(/faculty\.([a-zA-Z0-9_]+)/g)].map(m => m[1]); 
const ctrl = fs.readFileSync('src/controllers/facultyController.js', 'utf8'); 
let app = '\n'; 
for(const fn of matches) { 
  if(!ctrl.includes('exports.' + fn)) {
    app += `exports.${fn} = async (req, res) => { res.json({ message: "Mocked" }); };\n`; 
  }
} 
fs.appendFileSync('src/controllers/facultyController.js', app);
