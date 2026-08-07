const http = require('http');

function fetchApi(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`Status ${res.statusCode} at ${path}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response from ${path}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runE2E() {
  console.log("=== STARTING END-TO-END WORKFLOW TEST ===");
  try {
    // 3. Faculty Login
    console.log("3. Faculty Login");
    const facultyLogin = await fetchApi('/api/auth/login', 'POST', { identifier: 'suseelag@srmist.edu.in', password: 'suseelamam1234' });
    const facultyToken = facultyLogin.accessToken;

    // 4. Get Assignments
    const assignments = await fetchApi('/api/faculty/assignments', 'GET', null, facultyToken);
    const assignment = assignments[0];
    console.log(`   Selected Assignment: ${assignment.subject.name}`);

    // 5. Get Students for Assignment
    const students = await fetchApi(`/api/faculty/assignments/${assignment.id}/students`, 'GET', null, facultyToken);
    console.log(`   Found ${students.length} students in assignment.`);

    // 6. Create Exam
    console.log("6. Create Exam");
    const now = new Date();
    const startTime = new Date(now.getTime() + 10000); // 10 seconds from now
    
    // Get a question
    const questions = await fetchApi('/api/faculty/questions', 'GET', null, facultyToken);
    const selectedQuestion = (questions.data || questions || [])[0];
    
    const examPayload = {
      title: `E2E Test Exam ${now.getTime()}`,
      facultyAssignmentId: assignment.id,
      durationMins: 30,
      passingMarks: 10,
      totalMarks: 20,
      instructions: "End-to-End Test Exam",
      startTime: startTime.toISOString(),
      endTime: new Date(now.getTime() + 30 * 60000).toISOString(),
      questionIds: selectedQuestion ? [selectedQuestion.id] : [],
      assignedStudentIds: students.slice(0, 5).map(s => s.id),
      config: { randomQuestions: false, randomOptions: false, requireFullscreen: false, maxWarnings: 3 }
    };
    
    const exam = await fetchApi('/api/faculty/exams', 'POST', examPayload, facultyToken);
    console.log(`   Created Exam: ${exam.id}`);

    // 7. Publish Exam
    console.log("7. Publish Exam");
    const publishedExam = await fetchApi(`/api/faculty/exams/${exam.id}/publish`, 'POST', {}, facultyToken);
    console.log(`   Status after publish: ${publishedExam.status}`);

    // Wait 10 seconds for exam to become active (or trigger lifecycle)
    console.log("   Waiting 10s for start time to arrive...");
    await new Promise(r => setTimeout(r, 11000));

    // 8. Student Login
    console.log("8. Student Login");
    // Pick the first assigned student
    const studentUser = students[0];
    // Need a known password or just bypass login by signing a token
    const jwt = require('jsonwebtoken');
    const studentToken = jwt.sign({ id: studentUser.id, role: 'STUDENT' }, process.env.JWT_SECRET || 'super_secret_jwt_key_for_development');

    // 9. Student Dashboard
    console.log("9. Student Dashboard");
    const dashboard = await fetchApi('/api/student/dashboard', 'GET', null, studentToken);
    const activeExams = dashboard.activeExams || [];
    console.log(`   Active Exams found: ${activeExams.length}`);
    const found = activeExams.find(e => e.id === exam.id);
    if (!found) {
       console.error("   [CRITICAL BUG] Exam NOT visible in dashboard!");
    } else {
       console.log("   [OK] Exam is visible in dashboard!");
    }

    // 9.5 Get Exam Details (Lobby)
    console.log("9.5 Get Exam Details");
    const examDetails = await fetchApi(`/api/student/exam/${exam.id}`, 'GET', null, studentToken);
    console.log(`   Exam Details fetched: ${examDetails.title}`);

    // 10. Start Exam
    console.log("10. Start Exam");
    try {
      const session = await fetchApi(`/api/student/exam/${exam.id}/start`, 'POST', null, studentToken);
      console.log(`   Session created: ${session.id}`);
    } catch (e) {
      console.error(`   Failed to start exam: ${e.message}`);
    }

    console.log("=== END-TO-END TEST COMPLETED ===");

  } catch (error) {
    console.error("TEST FAILED:", error);
  }
}

runE2E();
