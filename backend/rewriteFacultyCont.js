const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/controllers/facultyController.js');
let code = fs.readFileSync(controllerPath, 'utf8');

function replaceFunction(code, funcName, newFuncCode) {
  const startStr = "exports." + funcName + " = async (req, res) => {";
  const startIndex = code.indexOf(startStr);
  if (startIndex === -1) {
    console.log("Function " + funcName + " not found");
    return code;
  }
  let braceCount = 0;
  let endIndex = -1;
  let started = false;
  
  for (let i = startIndex + startStr.length - 1; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      started = true;
    } else if (code[i] === '}') {
      braceCount--;
    }
    
    if (started && braceCount === 0) {
      endIndex = i + 1;
      if (code[endIndex] === ';') endIndex++;
      break;
    }
  }
  
  if (endIndex !== -1) {
    console.log("Replaced " + funcName);
    return code.substring(0, startIndex) + newFuncCode + code.substring(endIndex);
  }
  return code;
}

const newGetStudents = `exports.getStudents = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { search, status } = req.query;

    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId, status: 'ACTIVE' },
      select: { id: true, subjectId: true }
    });

    if (assignments.length === 0) {
      return res.json([]);
    }

    const assignmentIds = assignments.map(a => a.id);

    const whereClause = {
      assignments: { some: { assignmentId: { in: assignmentIds } } },
      role: 'STUDENT'
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { register_no: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        assignments: {
          where: { assignmentId: { in: assignmentIds } },
          include: {
            assignment: {
              include: { subject: { include: { department: true } }, assessmentType: true, academicYear: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedStudents = students.map(s => {
      const activeAssignment = s.assignments[0]?.assignment;
      return {
        id: s.id,
        name: s.name,
        register_no: s.register_no,
        email: s.email,
        phone: s.phone,
        status: s.status,
        firstLogin: s.firstLogin,
        createdAt: s.createdAt,
        assignment: s.assignments[0],
        subjectId: activeAssignment?.subjectId,
        subject: activeAssignment?.subject
      };
    });

    res.json(mappedStudents);
  } catch (error) {
    console.error('getStudents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};`;

const newImportStudents = `exports.importStudents = async (req, res) => {
  try {
    const { students, assignmentId } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided' });
    }

    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId: req.user.id, status: 'ACTIVE' },
      include: { subject: true, assessmentType: true }
    });

    if (assignments.length === 0) {
      return res.status(403).json({ error: 'You have no active assignments' });
    }

    let assignment;
    if (assignments.length === 1) {
      assignment = assignments[0];
    } else {
      if (!assignmentId) return res.status(400).json({ error: 'Assignment selection required' });
      assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) return res.status(403).json({ error: 'Invalid assignment or access denied' });
    }

    const results = { successful: [], duplicates: [], invalid: [], linked: [], total: students.length };
    
    const emails = students.map(s => String(s.email).toLowerCase().trim()).filter(Boolean);
    const regNos = students.map(s => String(s.registerNo).trim()).filter(Boolean);

    const existingUsers = await prisma.user.findMany({
      where: { OR: [{ email: { in: emails } }, { register_no: { in: regNos } }] },
      include: { assignments: true }
    });

    const existingEmails = new Map();
    const existingRegNos = new Map();
    existingUsers.forEach(u => {
      existingEmails.set(u.email.toLowerCase(), u);
      if (u.register_no) existingRegNos.set(u.register_no, u);
    });

    const validToInsert = [];
    const validToLink = [];

    for (const row of students) {
      if (!row.name || !row.email || !row.registerNo) {
        results.invalid.push({ ...row, reason: 'Missing required fields' });
        continue;
      }
      const email = String(row.email).toLowerCase().trim();
      const regNo = String(row.registerNo).trim();
      
      const existingByEmail = existingEmails.get(email);
      const existingByRegNo = existingRegNos.get(regNo);
      
      const existingUser = existingByEmail || existingByRegNo;
      
      if (existingUser) {
        // Check if already linked to this assignment
        const alreadyLinked = existingUser.assignments.some(a => a.assignmentId === assignment.id);
        if (alreadyLinked) {
          results.duplicates.push({ ...row, reason: 'Already exists and linked to this assessment' });
        } else {
          validToLink.push({ userId: existingUser.id, row });
        }
      } else {
        // Prevent duplicate insertion in the same batch
        if (!validToInsert.find(v => v.email === email || v.registerNo === regNo)) {
          validToInsert.push({ ...row, email, registerNo: regNo });
        } else {
          results.duplicates.push({ ...row, reason: 'Duplicate in import file' });
        }
      }
    }

    // Link existing users
    if (validToLink.length > 0) {
      const linkPromises = validToLink.map(item => {
        return prisma.assignmentStudent.create({
          data: {
            studentId: item.userId,
            assignmentId: assignment.id,
            status: 'ACTIVE'
          }
        });
      });
      await prisma.$transaction(linkPromises);
      validToLink.forEach(item => {
        results.linked.push({ name: item.row.name, registerNo: item.row.registerNo });
      });
    }

    // Create new users
    if (validToInsert.length > 0) {
      await Promise.all(validToInsert.map(async (row) => {
        const bcrypt = require('bcrypt');
        const actualPassword = row.registerNo;
        const salt = await bcrypt.genSalt(10);
        row.hashedPassword = await bcrypt.hash(actualPassword, salt);
      }));

      const createPromises = validToInsert.map(row => {
        return prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            register_no: row.registerNo,
            password: row.hashedPassword,
            role: 'STUDENT',
            status: 'ACTIVE',
            firstLogin: true,
            assignments: {
              create: [{ assignmentId: assignment.id, status: 'ACTIVE' }]
            }
          }
        });
      });
      const createdUsers = await prisma.$transaction(createPromises);
      createdUsers.forEach(u => {
        results.successful.push({ id: u.id, name: u.name, email: u.email, registerNo: u.register_no });
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: req.user.role,
        action: 'STUDENT_IMPORTED',
        details: \`Imported \${results.successful.length} new, linked \${results.linked.length} existing students for \${assignment.subject.name}\`
      }
    });

    res.json({ message: 'Import completed', results });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};`;

const newGetMyAssignments = `exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId: req.user.id, status: 'ACTIVE' },
      include: {
        subject: { include: { department: true } },
        assessmentType: true,
        academicYear: true,
        _count: { select: { exams: true, students: true } }
      }
    });

    // Flatten data for frontend table
    const mapped = assignments.map(a => ({
      id: a.id,
      subject: a.subject,
      assessmentType: a.assessmentType,
      academicYear: a.academicYear,
      studentsCount: a._count?.students || 0,
      examsCount: a._count?.exams || 0,
      status: a.status
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};`;

code = replaceFunction(code, 'getStudents', newGetStudents);
code = replaceFunction(code, 'importStudents', newImportStudents);
code = replaceFunction(code, 'getMyAssignments', newGetMyAssignments);

fs.writeFileSync(controllerPath, code, 'utf8');
console.log('Done rewriting functions!');
