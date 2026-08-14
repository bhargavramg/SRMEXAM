const prisma = require('../utils/db');
const bcrypt = require('bcryptjs');

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
        semester: { include: { course: { include: { department: true } }, academicYear: true } }
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
exports.getStudentStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, active, inactive, importedToday] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'INACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: today } } })
    ]);

    res.json({ total, active, inactive, importedToday });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getStudentList = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', departmentId, courseId, semesterId, sectionId, status, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where = { role: 'STUDENT' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { register_no: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    if (courseId || semesterId || sectionId) {
      where.assignments = {
        some: {
          ...(courseId && { courseId }),
          ...(semesterId && { semesterId }),
          ...(sectionId && { sectionId })
        }
      };
    }

    let orderBy = {};
    if (sortBy === 'lastLogin') {
      orderBy = {
        browserSessions: {
          _count: sortOrder
        }
      };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [totalElements, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, register_no: true, departmentId: true, department: true, status: true, createdAt: true,
          assignments: {
            where: { status: 'ACTIVE' },
            include: {
              assignment: {
                include: { subject: true, academicYear: true, assessmentType: true, faculty: { select: { name: true } } }
              }
            }
          },
          browserSessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true }
          }
        },
        orderBy,
        skip,
        take: limitNumber
      })
    ]);

    const mappedStudents = students.map(s => {
      const lastLogin = s.browserSessions.length > 0 ? s.browserSessions[0].createdAt : null;
      return { ...s, lastLogin };
    });

    res.json({
      content: mappedStudents,
      totalElements,
      totalPages: Math.ceil(totalElements / limitNumber),
      page: pageNumber,
      size: limitNumber
    });
  } catch (error) {
    console.error('getStudentList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.params.id, role: 'STUDENT' },
      include: {
        department: true,
        assignments: {
          include: {
            assignment: {
              include: {
                subject: true,
                academicYear: true,
                assessmentType: true,
                faculty: { select: { name: true, email: true } }
              }
            }
          }
        },
        results: {
          include: {
            exam: true
          }
        },
        browserSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Extract subjects from assignments
    const assignedSubjects = student.assignments
      .filter(a => a.status === 'ACTIVE')
      .map(a => a.assignment);

    res.json({ ...student, assignedSubjects });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    // Check if student has results
    const resultsCount = await prisma.result.count({ where: { studentId: req.params.id } });
    if (resultsCount > 0) {
      return res.status(400).json({ error: 'Student has historical examination records and cannot be permanently deleted. You may deactivate the account instead.' });
    }

    // Delete related assignments first
    await prisma.assignmentStudent.deleteMany({ where: { studentId: req.params.id } });
    await prisma.browserSession.deleteMany({ where: { userId: req.params.id } });
    await prisma.activityLog.deleteMany({ where: { userId: req.params.id } });
    
    await prisma.user.delete({ where: { id: req.params.id } });
    
    res.json({ message: 'Student successfully deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while deleting student.' });
  }
};

exports.importStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) return res.status(400).json({ error: 'Invalid students data' });

    const createdStudents = [];
    for (const data of students) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password || 'password123', salt);
      
      const newStudent = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          register_no: data.register_no,
          password: hashedPassword,
          role: 'STUDENT',
          departmentId: data.departmentId,
          phone: data.phone,
          assignments: {
            create: data.courseId && data.semesterId && data.sectionId && data.academicYearId ? [{
              courseId: data.courseId, semesterId: data.semesterId, sectionId: data.sectionId, academicYearId: data.academicYearId, status: 'ACTIVE'
            }] : []
          }
        }
      });
      createdStudents.push(newStudent);
    }
    res.json({ message: `${createdStudents.length} students imported successfully.`, students: createdStudents });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
        assignments: {
          create: courseId && semesterId && sectionId && academicYearId ? [{
            courseId, semesterId, sectionId, academicYearId, status: 'ACTIVE'
          }] : []
        }
      },
      include: { assignments: true }
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
        subject: { include: { department: true } }, assessmentType: true, academicYear: true,
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
    const { facultyId, subjectId, assessmentTypeId, academicYearId } = req.body;

    const assignment = await prisma.facultyAssignment.create({
      data: {
        facultyId,
        subjectId,
        assessmentTypeId,
        academicYearId: academicYearId || null,
        status: 'ACTIVE'
      },
      include: { faculty: { select: { name: true } }, subject: true, assessmentType: true, academicYear: true }
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
    console.error('Delete Faculty Assignment Error:', error);
    res.status(400).json({ error: 'Cannot delete assignment with existing exams' });
  }
};

// ============================================================================
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
};

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
exports.getDashboardData = async (req, res) => {
  try {
    const [
      departments, faculty, students, subjects, 
      totalExams, activeExams, completedExams, pendingEvals, publishedResults
    ] = await Promise.all([
      prisma.department.count(),
      prisma.user.count({ where: { role: 'FACULTY' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.subject.count(),
      prisma.exam.count(),
      prisma.exam.count({ where: { status: 'ACTIVE' } }),
      prisma.exam.count({ where: { status: 'COMPLETED' } }),
      prisma.exam.count({ where: { status: 'EVALUATION' } }),
      prisma.exam.count({ where: { status: 'CLOSED' } })
    ]);

    res.json({
      stats: {
        departments,
        faculty,
        students,
        subjects,
        exams: totalExams,
        activeExams,
        completedExams,
        pendingEvaluations: pendingEvals,
        resultsPublished: publishedResults
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// UNIVERSITY-WIDE EXAMS & RESULTS
// ============================================================================
exports.getExams = async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        facultyAssignment: {
          include: {
            subject: true,
            academicYear: true,
            assessmentType: true,
            faculty: { select: { name: true, employeeId: true } }
          }
        },
        _count: { select: { sessions: true, results: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exams);
  } catch (error) {
    console.error('getExams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getResults = async (req, res) => {
  try {
    const results = await prisma.result.findMany({
      include: {
        student: { select: { name: true, register_no: true } },
        exam: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 500 // Limit for performance
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// AUDIT LOGS
// ============================================================================
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
        exam: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getFacultyById = async (req, res) => {
  try {
    const faculty = await prisma.user.findUnique({
      where: { id: req.params.id, role: 'FACULTY' },
      include: {
        facultyAssignments: {
          include: { 
            subject: true,
            assessmentType: true,
            academicYear: true,
            _count: { select: { exams: true, students: true } }
          }
        },
        department: true
      }
    });
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.createFaculty = async (req, res) => {
  try {
    const { name, email, employeeId, phone, departmentId, password } = req.body;
    
    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { employeeId }] }
    });
    if (existing) return res.status(400).json({ error: 'Email or Employee ID already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || employeeId, salt);

    const faculty = await prisma.user.create({
      data: {
        name, email, employeeId, phone, departmentId,
        password: hashedPassword,
        role: 'FACULTY',
        firstLogin: true
      }
    });
    res.status(201).json(faculty);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const { name, email, phone, departmentId, status } = req.body;
    const faculty = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, phone, departmentId, status }
    });
    res.json(faculty);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.resetFacultyPassword = async (req, res) => {
  try {
    const faculty = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(faculty.employeeId, salt);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword, firstLogin: true }
    });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    // Check for assignments
    const assignments = await prisma.facultyAssignment.count({ where: { facultyId: req.params.id } });
    if (assignments > 0) return res.status(400).json({ error: 'Cannot delete faculty with existing assignments' });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Faculty deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// ADMIN RESULT UNLOCK
// ============================================================================
exports.unlockResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    // Update all results for this exam
    await prisma.result.updateMany({
      where: { examId, status: 'PUBLISHED' },
      data: {
        status: 'EVALUATED',
        published: false,
        publishedAt: null
      }
    });

    // Reset exam status to EVALUATION
    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'EVALUATION' }
    });

    // Notify faculty (optional, but good practice)
    await prisma.notification.create({
      data: {
        userId: req.user.id, // Admin
        type: 'SYSTEM',
        title: 'Results Unlocked',
        message: `Admin unlocked results for exam ${exam.title}.`
      }
    });
    
    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: 'ADMIN',
        examId,
        action: 'RESULTS_UNLOCKED',
        details: 'Admin forced unlock of results for re-evaluation',
        ipAddress: req.ip,
        browser: req.headers['user-agent']
      }
    });

    res.json({ success: true, message: 'Results unlocked successfully. Faculty can now edit marks.' });
  } catch (error) {
    console.error('unlockResults error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
