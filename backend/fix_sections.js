const fs = require('fs');
const path = './src/controllers/facultyController.js';
let content = fs.readFileSync(path, 'utf8');

// The invalid includes are all inside `facultyAssignment` or related to it.
// Let's replace the common patterns:

content = content.replace(/section:\s*\{\s*include:\s*\{\s*semester:\s*\{\s*include:\s*\{\s*course:\s*true\s*\}\s*\}\s*\}\s*\},?/g, '');
content = content.replace(/section:\s*\{\s*include:\s*\{\s*semester:\s*\{\s*include:\s*\{\s*course:\s*true,\s*academicYear:\s*true\s*\}\s*\}\s*\}\s*\},?/g, '');
content = content.replace(/section:\s*true,?/g, '');
content = content.replace(/section:\s*\{\s*include:\s*\{\s*semester:\s*\{\s*include:\s*\{\s*course:\s*\{\s*include:\s*\{\s*department:\s*true\s*\}\s*\}\s*\}\s*\}\s*\}\s*\},?/g, '');
content = content.replace(/section:\s*\{\s*include:\s*\{\s*semester:\s*true\s*\}\s*\},?/g, '');

// There are some 'include: { course: true, semester: true, section: true }' inside assignment models?
content = content.replace(/include:\s*\{\s*course:\s*true,\s*semester:\s*true,\s*section:\s*true\s*\}/g, 'include: { }');

// There are some 'include: { section: true, semester: true }' inside assignment models?
content = content.replace(/include:\s*\{\s*section:\s*true,\s*semester:\s*true\s*\}/g, 'include: { }');

fs.writeFileSync(path, content);
console.log('Fixed sections in facultyController.js');
