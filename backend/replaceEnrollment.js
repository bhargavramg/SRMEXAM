const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/controllers/adminController.js');
let content = fs.readFileSync(controllerPath, 'utf8');

// Replace STUDENT ENROLLMENT MANAGEMENT block
const oldEnrollmentBlock = `// ============================================================================
// STUDENT ENROLLMENT MANAGEMENT
// ============================================================================
exports.getStudentEnrollments = async (req, res) => {
  try {
    const enrollments = await prisma.studentEnrollment.findMany({
      include: {
        student: { select: { id: true, name: true, email: true, register_no: true } },
        subjectOffering: { 
          include: { 
            subject: true,
            section: { include: { semester: { include: { course: true } } } },
            academicYear: true 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createStudentEnrollment = async (req, res) => {
  try {
    const { studentId, subjectId, sectionId, academicYearId } = req.body;
    
    // Find or create the SubjectOffering
    let offering = await prisma.subjectOffering.findUnique({
      where: { subjectId_sectionId_academicYearId: { subjectId, sectionId, academicYearId } }
    });
    
    if (!offering) {
      offering = await prisma.subjectOffering.create({
        data: { subjectId, sectionId, academicYearId, status: 'ACTIVE' }
      });
    }

    const enrollment = await prisma.studentEnrollment.create({
      data: { studentId, subjectOfferingId: offering.id, status: 'ACTIVE' },
      include: { student: { select: { name: true } }, subjectOffering: { include: { subject: true, section: true } } }
    });
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateStudentEnrollment = async (req, res) => {
  try {
    const enrollment = await prisma.studentEnrollment.update({ where: { id: req.params.id }, data: req.body });
    res.json(enrollment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};`;

const newAssessmentBlock = `// ============================================================================
// ASSESSMENT TYPES MANAGEMENT
// ============================================================================
exports.getAssessmentTypes = async (req, res) => {
  try {
    const assessments = await prisma.assessmentType.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createAssessmentType = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const assessment = await prisma.assessmentType.create({
      data: { name, description, status: status || 'ACTIVE' }
    });
    res.status(201).json(assessment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateAssessmentType = async (req, res) => {
  try {
    const assessment = await prisma.assessmentType.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(assessment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteAssessmentType = async (req, res) => {
  try {
    await prisma.assessmentType.delete({ where: { id: req.params.id } });
    res.json({ message: 'Assessment type deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Cannot delete assessment type linked to faculty assignments' });
  }
};`;

if (content.includes('STUDENT ENROLLMENT MANAGEMENT')) {
  content = content.replace(oldEnrollmentBlock, newAssessmentBlock);
  fs.writeFileSync(controllerPath, content, 'utf8');
  console.log('Replaced Student Enrollment with Assessment Types');
} else {
  console.log('STUDENT ENROLLMENT MANAGEMENT not found');
}
