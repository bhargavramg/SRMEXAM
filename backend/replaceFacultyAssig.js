const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/controllers/adminController.js');
let content = fs.readFileSync(controllerPath, 'utf8');

const oldFacultyAssignmentBlock = `// ============================================================================
// FACULTY ASSIGNMENT MANAGEMENT
// ============================================================================
exports.getFacultyAssignments = async (req, res) => {
  try {
    const assignments = await prisma.facultyAssignment.findMany({
      include: {
        faculty: { select: { id: true, name: true, email: true, employeeId: true } },
        subjectOffering: { 
          include: { 
            subject: true, 
            section: { include: { semester: { include: { course: { include: { department: true } } } } } },
            academicYear: true
          } 
        },
        _count: { select: { exams: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createFacultyAssignment = async (req, res) => {
  try {
    const { facultyId, subjectId, sectionId, academicYearId, teachingType } = req.body;
    
    // Find or create the SubjectOffering
    let offering = await prisma.subjectOffering.findUnique({
      where: { subjectId_sectionId_academicYearId: { subjectId, sectionId, academicYearId } }
    });
    
    if (!offering) {
      offering = await prisma.subjectOffering.create({
        data: { subjectId, sectionId, academicYearId, status: 'ACTIVE' }
      });
    }

    const assignment = await prisma.facultyAssignment.create({
      data: { facultyId, subjectOfferingId: offering.id, teachingType: teachingType || 'THEORY', status: 'ACTIVE' },
      include: { faculty: { select: { name: true } }, subjectOffering: { include: { subject: true, section: true } } }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};`;

const newFacultyAssignmentBlock = `// ============================================================================
// FACULTY ASSIGNMENT MANAGEMENT
// ============================================================================
exports.getFacultyAssignments = async (req, res) => {
  try {
    const assignments = await prisma.facultyAssignment.findMany({
      include: {
        faculty: { select: { id: true, name: true, email: true, employeeId: true } },
        subject: true,
        assessmentType: true,
        academicYear: true,
        _count: { select: { exams: true, students: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createFacultyAssignment = async (req, res) => {
  try {
    const { facultyId, subjectId, assessmentTypeId, academicYearId } = req.body;

    const assignment = await prisma.facultyAssignment.create({
      data: { facultyId, subjectId, assessmentTypeId, academicYearId: academicYearId || null, status: 'ACTIVE' },
      include: { 
        faculty: { select: { name: true } }, 
        subject: true, 
        assessmentType: true 
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};`;

if (content.includes('exports.createFacultyAssignment')) {
  content = content.replace(oldFacultyAssignmentBlock, newFacultyAssignmentBlock);
  fs.writeFileSync(controllerPath, content, 'utf8');
  console.log('Replaced Faculty Assignment management block');
} else {
  console.log('Block not found');
}
