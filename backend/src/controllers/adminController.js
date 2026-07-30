const prisma = require('../utils/db');
const bcrypt = require('bcrypt');

// ============================================================================
// DEPARTMENT CRUD
// ============================================================================
exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { courses: true, users: true, subjects: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const dept = await prisma.department.create({ data: { name, code, description } });
    res.status(201).json(dept);
  } catch (error) {
    console.error('createDepartment error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
    res.json(dept);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Cannot delete department with existing references' });
  }
};

// ============================================================================
// COURSE CRUD
// ============================================================================
exports.getCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: { department: true, _count: { select: { semesters: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { name, code, departmentId, duration, description } = req.body;
    const course = await prisma.course.create({ data: { name, code, departmentId, duration, description } });
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await prisma.course.update({ where: { id: req.params.id }, data: req.body });
    res.json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Cannot delete course with existing references' });
  }
};

// ============================================================================
// ACADEMIC YEAR CRUD
// ============================================================================
exports.getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
    res.json(years);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createAcademicYear = async (req, res) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;
    // If setting as current, unset others
    if (isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    const year = await prisma.academicYear.create({ data: { name, startDate: new Date(startDate), endDate: new Date(endDate), isCurrent: isCurrent || false } });
    res.status(201).json(year);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateAcademicYear = async (req, res) => {
  try {
    if (req.body.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    if (req.body.startDate) req.body.startDate = new Date(req.body.startDate);
    if (req.body.endDate) req.body.endDate = new Date(req.body.endDate);
    const year = await prisma.academicYear.update({ where: { id: req.params.id }, data: req.body });
    res.json(year);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// SEMESTER CRUD
// ============================================================================
exports.getSemesters = async (req, res) => {
  try {
    const semesters = await prisma.semester.findMany({
      include: { course: { include: { department: true } }, academicYear: true, _count: { select: { sections: true, subjects: true } } },
      orderBy: [{ course: { name: 'asc' } }, { semesterNumber: 'asc' }]
    });
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createSemester = async (req, res) => {
  try {
    const { courseId, academicYearId, semesterNumber } = req.body;
    const semester = await prisma.semester.create({ data: { courseId, academicYearId, semesterNumber } });
    res.status(201).json(semester);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSemester = async (req, res) => {
  try {
    const semester = await prisma.semester.update({ where: { id: req.params.id }, data: req.body });
    res.json(semester);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// SECTION CRUD
// ============================================================================
exports.getSections = async (req, res) => {
  try {
    const sections = await prisma.section.findMany({
      include: {
        semester: { include: { course: { include: { department: true } }, academicYear: true } },
        _count: { select: { studentEnrollments: true } }
      }
    });
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { semesterId, name, capacity } = req.body;
    const section = await prisma.section.create({ data: { semesterId, name, capacity } });
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const section = await prisma.section.update({ where: { id: req.params.id }, data: req.body });
    res.json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// SUBJECT CRUD
// ============================================================================
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        department: true,
        semester: { include: { course: true, academicYear: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { departmentId, semesterId, code, name, credits, type, description } = req.body;
    const subject = await prisma.subject.create({ data: { departmentId, semesterId, code, name, credits, type, description } });
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await prisma.subject.update({ where: { id: req.params.id }, data: req.body });
    res.json(subject);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// FACULTY MANAGEMENT
// ============================================================================
exports.getFacultyList = async (req, res) => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: { id: true, name: true, email: true, employeeId: true, departmentId: true, department: true, status: true, createdAt: true,
        _count: { select: { facultyAssignments: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createFaculty = async (req, res) => {
  try {
    const { name, email, employeeId, departmentId, password, phone } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);
    const faculty = await prisma.user.create({
      data: { name, email, employeeId, password: hashedPassword, role: 'FACULTY', departmentId, phone }
    });
    res.status(201).json({ id: faculty.id, name: faculty.name, email: faculty.email, employeeId: faculty.employeeId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    const faculty = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    res.json({ id: faculty.id, name: faculty.name, email: faculty.email });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================
exports.getStudentList = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true, name: true, email: true, register_no: true, departmentId: true, department: true, status: true, createdAt: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            course: true, semester: { include: { academicYear: true } }, section: true, academicYear: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, email, register_no, departmentId, password, phone, courseId, semesterId, sectionId, academicYearId } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const student = await prisma.user.create({
      data: {
        name, email, register_no, password: hashedPassword, role: 'STUDENT', departmentId, phone,
        enrollments: {
          create: courseId && semesterId && sectionId && academicYearId ? [{
            courseId, semesterId, sectionId, academicYearId, status: 'ACTIVE'
          }] : []
        }
      },
      include: { enrollments: true }
    });
    res.status(201).json({ id: student.id, name: student.name, email: student.email, register_no: student.register_no });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    const student = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    res.json({ id: student.id, name: student.name, email: student.email });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// FACULTY ASSIGNMENT MANAGEMENT
// ============================================================================
exports.getFacultyAssignments = async (req, res) => {
  try {
    const assignments = await prisma.facultyAssignment.findMany({
      include: {
        faculty: { select: { id: true, name: true, email: true, employeeId: true } },
        subject: true,
        section: { include: { semester: { include: { course: { include: { department: true } }, academicYear: true } } } },
        academicYear: true,
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
    const assignment = await prisma.facultyAssignment.create({
      data: { facultyId, subjectId, sectionId, academicYearId, teachingType: teachingType || 'THEORY', status: 'ACTIVE' },
      include: { faculty: { select: { name: true } }, subject: true, section: true }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateFacultyAssignment = async (req, res) => {
  try {
    const assignment = await prisma.facultyAssignment.update({ where: { id: req.params.id }, data: req.body });
    res.json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteFacultyAssignment = async (req, res) => {
  try {
    await prisma.facultyAssignment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Faculty assignment deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Cannot delete assignment with existing exams' });
  }
};

// ============================================================================
// STUDENT ENROLLMENT MANAGEMENT
// ============================================================================
exports.getStudentEnrollments = async (req, res) => {
  try {
    const enrollments = await prisma.studentEnrollment.findMany({
      include: {
        student: { select: { id: true, name: true, email: true, register_no: true } },
        course: true,
        semester: true,
        section: true,
        academicYear: true
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
    const { studentId, courseId, semesterId, sectionId, academicYearId } = req.body;
    const enrollment = await prisma.studentEnrollment.create({
      data: { studentId, courseId, semesterId, sectionId, academicYearId, status: 'ACTIVE' },
      include: { student: { select: { name: true } }, course: true, section: true }
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
};

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
exports.getDashboardData = async (req, res) => {
  try {
    const [departments, courses, faculty, students, exams, activeYear] = await Promise.all([
      prisma.department.count(),
      prisma.course.count(),
      prisma.user.count({ where: { role: 'FACULTY' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.exam.count(),
      prisma.academicYear.findFirst({ where: { isCurrent: true } })
    ]);

    res.json({
      stats: { departments, courses, faculty, students, exams },
      activeAcademicYear: activeYear
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
