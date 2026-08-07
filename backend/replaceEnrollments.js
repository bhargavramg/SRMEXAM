const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');
const files = fs.readdirSync(controllersDir).map(f => path.join(controllersDir, f));

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  
  let code = fs.readFileSync(file, 'utf8');
  let originalCode = code;

  // Replace prisma.studentEnrollment with prisma.assignmentStudent
  code = code.replace(/prisma\.studentEnrollment/g, 'prisma.assignmentStudent');

  // Replace include: { enrollments: ... } with include: { assignments: ... }
  code = code.replace(/enrollments/g, 'assignments');

  if (code !== originalCode) {
    fs.writeFileSync(file, code, 'utf8');
    console.log('Replaced enrollments in', path.basename(file));
  }
});
