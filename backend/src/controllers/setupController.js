const prisma = require('../utils/db');
const bcrypt = require('bcrypt');

// ============================================================================
// GET SETUP STATUS (Unauthenticated — checked before login)
// ============================================================================
exports.getSetupStatus = async (req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'setup_completed' },
    });

    const setupCompleted = config?.value === 'true';

    // Determine which step the admin was on (for resume capability)
    let currentStep = 0;
    if (!setupCompleted) {
      const hasCollege = await prisma.systemConfig.findUnique({ where: { key: 'college_name' } });
      const hasDept = await prisma.department.count();
      const hasFaculty = await prisma.user.count({ where: { role: 'FACULTY' } });
      const hasStudents = await prisma.user.count({ where: { role: 'STUDENT' } });

      if (hasStudents > 0) currentStep = 4;
      else if (hasFaculty > 0) currentStep = 3;
      else if (hasDept > 0) currentStep = 2;
      else if (hasCollege) currentStep = 1;
      else currentStep = 0;
    }

    res.json({ setupCompleted, currentStep });
  } catch (error) {
    console.error('getSetupStatus error:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
};

// ============================================================================
// STEP 1: SAVE COLLEGE INFORMATION
// ============================================================================
exports.saveCollegeInfo = async (req, res) => {
  try {
    const { collegeName, academicYear, collegeLogo } = req.body;

    if (!collegeName || !academicYear) {
      return res.status(400).json({ error: 'College name and academic year are required' });
    }

    // Save college info to SystemConfig
    const configs = [
      { key: 'college_name', value: collegeName },
      { key: 'academic_year', value: academicYear },
    ];
    if (collegeLogo) {
      configs.push({ key: 'college_logo', value: collegeLogo });
    }

    for (const cfg of configs) {
      await prisma.systemConfig.upsert({
        where: { key: cfg.key },
        update: { value: cfg.value },
        create: { key: cfg.key, value: cfg.value },
      });
    }

    // Create AcademicYear record
    const yearParts = academicYear.split('-');
    const startYear = parseInt(yearParts[0]);
    const endYear = yearParts[1] ? parseInt(yearParts[1]) : startYear + 1;

    const existingYear = await prisma.academicYear.findUnique({
      where: { name: academicYear },
    });

    let academicYearRecord;
    if (!existingYear) {
      // Unset any existing current year
      await prisma.academicYear.updateMany({ data: { isCurrent: false } });

      academicYearRecord = await prisma.academicYear.create({
        data: {
          name: academicYear,
          startDate: new Date(`${startYear}-07-01`),
          endDate: new Date(`${endYear}-06-30`),
          isCurrent: true,
          status: 'ACTIVE',
        },
      });
    } else {
      academicYearRecord = existingYear;
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: req.user.role,
        action: 'SETUP_COLLEGE_INFO',
        details: JSON.stringify({ collegeName, academicYear }),
      },
    });

    res.json({
      message: 'College information saved successfully',
      academicYear: academicYearRecord,
    });
  } catch (error) {
    console.error('saveCollegeInfo error:', error);
    res.status(500).json({ error: error.message || 'Failed to save college information' });
  }
};

// ============================================================================
// STEP 2: SAVE ACADEMIC / SUBJECT SETUP
// ============================================================================
exports.saveSubjectSetup = async (req, res) => {
  try {
    const {
      departmentName,
      departmentCode,
      courseName,
      courseCode,
      courseDuration,
      subjectName,
      subjectCode,
      subjectCredits,
      subjectType,
      semesterNumber,
      sectionName,
      sectionCapacity,
    } = req.body;

    // Validate required fields
    if (!departmentName || !departmentCode || !courseName || !courseCode || !subjectName || !subjectCode) {
      return res.status(400).json({ error: 'All academic fields are required' });
    }

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (!academicYear) {
      return res.status(400).json({ error: 'Please complete Step 1 (College Information) first' });
    }

    // Use a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or get Department
      let department = await tx.department.findUnique({ where: { code: departmentCode } });
      if (!department) {
        department = await tx.department.create({
          data: {
            name: departmentName,
            code: departmentCode,
            description: `Department of ${departmentName}`,
            status: 'ACTIVE',
          },
        });
      }

      // 2. Create or get Course
      let course = await tx.course.findUnique({ where: { code: courseCode } });
      if (!course) {
        course = await tx.course.create({
          data: {
            name: courseName,
            code: courseCode,
            departmentId: department.id,
            duration: courseDuration || 4,
            status: 'ACTIVE',
          },
        });
      }

      // 3. Create Semester
      const semNum = semesterNumber || 1;
      let semester = await tx.semester.findFirst({
        where: {
          courseId: course.id,
          academicYearId: academicYear.id,
          semesterNumber: semNum,
        },
      });
      if (!semester) {
        semester = await tx.semester.create({
          data: {
            courseId: course.id,
            academicYearId: academicYear.id,
            semesterNumber: semNum,
            status: 'ACTIVE',
          },
        });
      }

      // 4. Create Section
      const secName = sectionName || 'A';
      let section = await tx.section.findFirst({
        where: { semesterId: semester.id, name: secName },
      });
      if (!section) {
        section = await tx.section.create({
          data: {
            semesterId: semester.id,
            name: secName,
            capacity: sectionCapacity || 80,
            status: 'ACTIVE',
          },
        });
      }

      // 5. Create Subject
      let subject = await tx.subject.findUnique({ where: { code: subjectCode } });
      if (!subject) {
        subject = await tx.subject.create({
          data: {
            departmentId: department.id,
            semesterId: semester.id,
            code: subjectCode,
            name: subjectName,
            credits: subjectCredits || 3,
            type: subjectType || 'THEORY',
            status: 'ACTIVE',
          },
        });
      }

      return { department, course, semester, section, subject };
    }, { maxWait: 5000, timeout: 20000 });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: req.user.role,
        action: 'SETUP_ACADEMIC_INFO',
        details: JSON.stringify({
          department: result.department.name,
          course: result.course.name,
          subject: result.subject.name,
        }),
      },
    });

    res.json({
      message: 'Academic information saved successfully',
      data: result,
    });
  } catch (error) {
    console.error('saveSubjectSetup error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate entry detected. This academic record already exists.' });
    }
    res.status(500).json({ error: error.message || 'Failed to save academic information' });
  }
};

// ============================================================================
// STEP 3: SAVE FACULTY SETUP
// ============================================================================
exports.saveFacultySetup = async (req, res) => {
  try {
    const { name, email, employeeId, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: `A user with email "${email}" already exists` });
    }

    // Check for duplicate employee ID
    if (employeeId) {
      const existingEmp = await prisma.user.findUnique({ where: { employeeId } });
      if (existingEmp) {
        return res.status(400).json({ error: `A user with Employee ID "${employeeId}" already exists` });
      }
    }

    // Get department (created in step 2)
    const department = await prisma.department.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!department) {
      return res.status(400).json({ error: 'Please complete Step 2 (Academic Setup) first' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create faculty user
    const faculty = await prisma.user.create({
      data: {
        name,
        email,
        employeeId: employeeId || null,
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: department.id,
        phone: phone || null,
        status: 'ACTIVE',
      },
    });

    // Auto-assign faculty to the subject/section created in Step 2
    const subject = await prisma.subject.findFirst({
      where: { departmentId: department.id },
      orderBy: { createdAt: 'desc' },
    });
    const section = await prisma.section.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const academicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
    });

    if (subject && section && academicYear) {
      // Find or create SubjectOffering
      let offering = await prisma.subjectOffering.findUnique({
        where: { subjectId_sectionId_academicYearId: { subjectId: subject.id, sectionId: section.id, academicYearId: academicYear.id } }
      });
      if (!offering) {
        offering = await prisma.subjectOffering.create({
          data: { subjectId: subject.id, sectionId: section.id, academicYearId: academicYear.id, status: 'ACTIVE' }
        });
      }

      await prisma.facultyAssignment.create({
        data: {
          facultyId: faculty.id,
          subjectOfferingId: offering.id,
          teachingType: 'THEORY',
          status: 'ACTIVE',
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: req.user.role,
        action: 'SETUP_FACULTY_CREATED',
        details: JSON.stringify({ facultyName: name, facultyEmail: email }),
      },
    });

    res.status(201).json({
      message: 'Faculty account created successfully',
      faculty: {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        employeeId: faculty.employeeId,
      },
    });
  } catch (error) {
    console.error('saveFacultySetup error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate entry: this email or employee ID already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create faculty account' });
  }
};

// ============================================================================
// STEP 4a: ADD SINGLE STUDENT
// ============================================================================
exports.addStudent = async (req, res) => {
  try {
    const { name, email, registerNo, password } = req.body;

    if (!name || !email || !registerNo) {
      return res.status(400).json({ error: 'Name, email, and register number are required' });
    }

    // Check duplicates
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: `A user with email "${email}" already exists` });
    }

    const existingRegNo = await prisma.user.findFirst({ where: { register_no: registerNo } });
    if (existingRegNo) {
      return res.status(400).json({ error: `A student with Register No "${registerNo}" already exists` });
    }

    // Get enrollment context from setup
    const department = await prisma.department.findFirst({ orderBy: { createdAt: 'desc' } });
    const course = await prisma.course.findFirst({ orderBy: { createdAt: 'desc' } });
    const semester = await prisma.semester.findFirst({ orderBy: { createdAt: 'desc' } });
    const section = await prisma.section.findFirst({ orderBy: { createdAt: 'desc' } });
    const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

    // Password defaults to register number if not provided
    const actualPassword = password || registerNo;
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(actualPassword, salt);

    const student = await prisma.user.create({
      data: {
        name,
        email,
        register_no: registerNo,
        password: hashedPassword,
        role: 'STUDENT',
        departmentId: department?.id || null,
        status: 'ACTIVE',
        assignments: {
          create: course && semester && section && academicYear ? [{
            courseId: course.id,
            semesterId: semester.id,
            sectionId: section.id,
            academicYearId: academicYear.id,
            status: 'ACTIVE',
          }] : [],
        },
      },
    });

    res.status(201).json({
      message: 'Student added successfully',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        registerNo: student.register_no,
      },
    });
  } catch (error) {
    console.error('addStudent error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate entry: this email or register number already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to add student' });
  }
};

// ============================================================================
// STEP 4b: IMPORT STUDENTS (Batch from CSV/Excel)
// ============================================================================
exports.importStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided' });
    }

    // Get enrollment context
    const department = await prisma.department.findFirst({ orderBy: { createdAt: 'desc' } });
    const course = await prisma.course.findFirst({ orderBy: { createdAt: 'desc' } });
    const semester = await prisma.semester.findFirst({ orderBy: { createdAt: 'desc' } });
    const section = await prisma.section.findFirst({ orderBy: { createdAt: 'desc' } });
    const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

    const results = {
      successful: [],
      duplicates: [],
      invalid: [],
      total: students.length,
    };

    // 1. Local Validation & Gather Emails/RegNos
    const emailsToCheck = [];
    const regNosToCheck = [];
    const locallyValid = [];

    for (const row of students) {
      const { name, email, registerNo } = row;
      if (!name || !email || !registerNo) {
        results.invalid.push({ ...row, reason: 'Missing required fields (name, email, or register number)' });
        continue;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.invalid.push({ ...row, reason: 'Invalid email format' });
        continue;
      }
      emailsToCheck.push(email);
      regNosToCheck.push(registerNo);
      locallyValid.push(row);
    }

    // 2. Check for Duplicates in Bulk
    let existingEmails = new Set();
    let existingRegNos = new Set();
    
    if (emailsToCheck.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: { OR: [{ email: { in: emailsToCheck } }, { register_no: { in: regNosToCheck } }] },
        select: { email: true, register_no: true }
      });
      existingUsers.forEach(u => {
        if (u.email) existingEmails.add(u.email);
        if (u.register_no) existingRegNos.add(u.register_no);
      });
    }

    const validToInsert = [];
    for (const row of locallyValid) {
      if (existingEmails.has(row.email)) {
        results.duplicates.push({ ...row, reason: `Email "${row.email}" already exists` });
      } else if (existingRegNos.has(row.registerNo)) {
        results.duplicates.push({ ...row, reason: `Register No "${row.registerNo}" already exists` });
      } else {
        // To handle duplicates within the uploaded file itself
        existingEmails.add(row.email);
        existingRegNos.add(row.registerNo);
        validToInsert.push(row);
      }
    }

    // 3. Pre-hash Passwords Concurrently (Outside Transaction)
    await Promise.all(validToInsert.map(async (row) => {
      const actualPassword = row.password || row.registerNo;
      const salt = await bcrypt.genSalt(12);
      row.hashedPassword = await bcrypt.hash(actualPassword, salt);
    }));

    // 4. Execute all Inserts in a Single Prisma Transaction
    if (validToInsert.length > 0) {
      const createPromises = validToInsert.map(row => {
        return prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            register_no: row.registerNo,
            password: row.hashedPassword,
            role: 'STUDENT',
            departmentId: department?.id || null,
            status: 'ACTIVE',
            assignments: {
              create: course && semester && section && academicYear ? [{
                courseId: course.id,
                semesterId: semester.id,
                sectionId: section.id,
                academicYearId: academicYear.id,
                status: 'ACTIVE',
              }] : [],
            },
          },
        });
      });

      const createdUsers = await prisma.$transaction(createPromises, { maxWait: 10000, timeout: 30000 });
      
      createdUsers.forEach(u => {
        results.successful.push({
          id: u.id,
          name: u.name,
          email: u.email,
          registerNo: u.register_no,
        });
      });
    }


    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: req.user.role,
        action: 'SETUP_STUDENTS_IMPORTED',
        details: JSON.stringify({
          total: results.total,
          successful: results.successful.length,
          duplicates: results.duplicates.length,
          invalid: results.invalid.length,
        }),
      },
    });

    console.log('--- STUDENT IMPORT DEBUG ---');
    console.log(`Total rows received: ${results.total}`);
    console.log(`Imported rows: ${results.successful.length}`);
    console.log(`Duplicate rows: ${results.duplicates.length}`);
    console.log(`Failed/Invalid rows: ${results.invalid.length}`);
    if (results.invalid.length > 0) {
       console.log('Reasons for failure:', results.invalid.map(i => i.reason));
    }
    console.log('----------------------------');

    res.json({
      message: `Import complete: ${results.successful.length} students imported successfully`,
      results,
    });
  } catch (error) {
    console.error('importStudents error:', error);
    res.status(500).json({ error: error.message || 'Failed to import students' });
  }
};

// ============================================================================
// SETUP SUMMARY (for Review step)
// ============================================================================
exports.getSetupSummary = async (req, res) => {
  try {
    const collegeName = await prisma.systemConfig.findUnique({ where: { key: 'college_name' } });
    const academicYear = await prisma.systemConfig.findUnique({ where: { key: 'academic_year' } });

    const department = await prisma.department.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { courses: true, subjects: true } } },
    });

    const course = await prisma.course.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const subject = await prisma.subject.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: { id: true, name: true, email: true, employeeId: true },
    });

    const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });

    const section = await prisma.section.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const semester = await prisma.semester.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      collegeName: collegeName?.value || '',
      academicYear: academicYear?.value || '',
      department: department ? { name: department.name, code: department.code } : null,
      course: course ? { name: course.name, code: course.code } : null,
      subject: subject ? { name: subject.name, code: subject.code } : null,
      semester: semester ? { number: semester.semesterNumber } : null,
      section: section ? { name: section.name, capacity: section.capacity } : null,
      faculty,
      studentCount,
    });
  } catch (error) {
    console.error('getSetupSummary error:', error);
    res.status(500).json({ error: 'Failed to get setup summary' });
  }
};

// ============================================================================
// COMPLETE SETUP
// ============================================================================
exports.completeSetup = async (req, res) => {
  try {
    // Validate that minimum setup requirements are met
    const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });
    const facultyCount = await prisma.user.count({ where: { role: 'FACULTY' } });
    const subjectCount = await prisma.subject.count();

    if (subjectCount === 0) {
      return res.status(400).json({ error: 'Please complete Step 2 (Academic Setup) before finishing' });
    }
    if (facultyCount === 0) {
      return res.status(400).json({ error: 'Please complete Step 3 (Faculty Setup) before finishing' });
    }
    if (studentCount === 0) {
      return res.status(400).json({ error: 'Please add at least one student in Step 4 before finishing' });
    }

    // Mark setup as completed
    await prisma.systemConfig.upsert({
      where: { key: 'setup_completed' },
      update: { value: 'true' },
      create: { key: 'setup_completed', value: 'true' },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        role: req.user.role,
        action: 'SETUP_COMPLETED',
        details: JSON.stringify({
          completedAt: new Date().toISOString(),
          completedBy: req.user.id,
          studentCount,
          facultyCount,
          subjectCount,
        }),
      },
    });

    res.json({
      message: 'Setup completed successfully! The system is ready to use.',
      setupCompleted: true,
    });
  } catch (error) {
    console.error('completeSetup error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete setup' });
  }
};
