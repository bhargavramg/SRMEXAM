const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');
const files = fs.readdirSync(controllersDir).map(f => path.join(controllersDir, f));

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  
  let code = fs.readFileSync(file, 'utf8');
  let originalCode = code;

  // Replace include: { subjectOffering: { ... } }
  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*true,\s*section:\s*\{\s*include:\s*\{\s*semester:\s*\{\s*include:\s*\{\s*course:\s*true\s*\}\s*\}\s*\}\s*\},\s*academicYear:\s*true\s*\}\s*\}/g, 'subject: true, assessmentType: true, academicYear: true');
  
  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*true,\s*section:\s*\{\s*include:\s*\{\s*semester:\s*\{\s*include:\s*\{\s*course:\s*true\s*\}\s*\}\s*\}\s*\}\s*\}\s*\}/g, 'subject: true, assessmentType: true, academicYear: true');

  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*true,\s*section:\s*\{\s*include:\s*\{\s*semester:\s*\{\s*include:\s*\{\s*course:\s*\{\s*include:\s*\{\s*department:\s*true\s*\}\s*\}\s*\}\s*\}\s*\}\s*\},\s*academicYear:\s*true\s*\}\s*\}/g, 'subject: { include: { department: true } }, assessmentType: true, academicYear: true');

  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*true,\s*section:\s*\{\s*include:\s*\{\s*semester:\s*true\s*\}\s*\}\s*\}\s*\}/g, 'subject: true, assessmentType: true, academicYear: true');
  
  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*true,\s*section:\s*true\s*\}\s*\}/g, 'subject: true, assessmentType: true, academicYear: true');

  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*section:\s*true\s*\}\s*\}/g, 'subject: true, assessmentType: true');

  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*section:\s*\{\s*include:\s*\{\s*semester:\s*true\s*\}\s*\}\s*\}\s*\}/g, 'subject: true, assessmentType: true');

  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*\{\s*include:\s*\{\s*department:\s*true\s*\}\s*\}\s*\}\s*\}/g, 'subject: { include: { department: true } }, assessmentType: true');

  code = code.replace(/subjectOffering:\s*\{\s*select:\s*\{\s*subjectId:\s*true\s*\}\s*\}/g, 'subject: { select: { id: true } }');
  
  code = code.replace(/subjectOffering:\s*\{\s*include:\s*\{\s*subject:\s*true\s*\}\s*\}/g, 'subject: true');

  // Replace a.subjectOffering?.subjectId with a.subjectId
  code = code.replace(/\.subjectOffering\?\.subjectId/g, '.subjectId');
  code = code.replace(/\.subjectOfferingId/g, '.subjectId'); // roughly

  // Replace e.facultyAssignment.subjectOffering?.subject?.name
  code = code.replace(/\.subjectOffering\?\.subject\?\.name/g, '.subject?.name');
  code = code.replace(/\.subjectOffering\?\.section\?\.name/g, '/* section removed */');
  code = code.replace(/\.subjectOffering\?\.section\?\.semester\?\.semesterNumber/g, '/* semester removed */');

  if (code !== originalCode) {
    fs.writeFileSync(file, code, 'utf8');
    console.log('Replaced subjectOffering in', path.basename(file));
  }
});
