const fs = require('fs');
const code = fs.readFileSync('./src/routes/facultyRoutes.js', 'utf8');
const faculty = require('./src/controllers/facultyController');

const regex = /faculty\.(\w+)/g;
let match;
while ((match = regex.exec(code)) !== null) {
  const method = match[1];
  if (typeof faculty[method] !== 'function') {
    console.log(`Missing method in facultyController: ${method}`);
  }
}
