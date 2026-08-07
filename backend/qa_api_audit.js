const BASE_URL = 'http://localhost:5000/api';
let superAdminToken = '';
let facultyToken = '';
let studentToken = '';

async function loginUser(email, password) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data.accessToken;
  } catch (err) {
    console.error(`Login failed for ${email}:`, err.message);
    process.exit(1);
  }
}

async function testEndpoint(name, path, token, expectedStatus = 200) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status !== expectedStatus) {
      console.log(`[FAIL] ${name} (${path}) - Expected ${expectedStatus}, got ${res.status}`);
      if (res.status === 500) {
        const text = await res.text();
        console.log(`       Error:`, text);
      }
      return false;
    }
    console.log(`[PASS] ${name} (${path})`);
    return true;
  } catch (err) {
    console.log(`[ERROR] ${name} (${path}) - ${err.message}`);
    return false;
  }
}

async function runAudit() {
  console.log('--- STARTING API AUDIT ---');

const jwt = require('jsonwebtoken');

  console.log('\n1. Authenticating Users...');
  superAdminToken = await loginUser('admin@examportal.com', 'admin123');
  facultyToken = await loginUser('suseelag@srmist.edu.in', 'suseelamam1234');
  
  try {
    const fetchRes = await fetch(`${BASE_URL}/admin/students`, { headers: { Authorization: `Bearer ${superAdminToken}` }});
    const students = await fetchRes.json();
    const studentUser = students.content[0];
    if (!studentUser) throw new Error("No students found in DB");
    studentToken = jwt.sign({ id: studentUser.id, role: 'STUDENT' }, process.env.JWT_SECRET || 'super_secret_jwt_key_for_development', { expiresIn: '1h' });
    console.log(`Successfully generated token for student ${studentUser.email}`);
  } catch(e) {
    console.log("Could not get student token:", e.message);
  }

  let failedCount = 0;
  const runTest = async (...args) => {
    const success = await testEndpoint(...args);
    if (!success) failedCount++;
  };

  console.log('\n2. Testing Admin Endpoints (Super Admin Token)...');
  await runTest('Admin Dashboard', '/admin/dashboard', superAdminToken);
  await runTest('Admin Faculties', '/admin/faculty', superAdminToken);
  await runTest('Admin Students', '/admin/students', superAdminToken);
  await runTest('Admin Exams', '/admin/exams', superAdminToken);
  await runTest('Admin Results', '/admin/results', superAdminToken);
  
  console.log('\n3. Testing Faculty Endpoints (Faculty Token)...');
  await runTest('Faculty Dashboard', '/faculty/dashboard', facultyToken);
  await runTest('Faculty Students', '/faculty/students', facultyToken);
  await runTest('Faculty Questions', '/faculty/questions', facultyToken);
  await runTest('Faculty Categories', '/faculty/categories', facultyToken, 501);
  await runTest('Faculty Exams', '/faculty/exams', facultyToken);

  console.log('\n4. Testing Student Endpoints (Student Token)...');
  await runTest('Student Dashboard', '/student/dashboard', studentToken);
  await runTest('Student Exams', '/student/exams', studentToken);
  await runTest('Student Results', '/student/results', studentToken);

  console.log('\n5. Testing Role Boundaries (403 Forbidden)...');
  await runTest('Student accessing Admin', '/admin/dashboard', studentToken, 403);
  await runTest('Faculty accessing Admin', '/admin/dashboard', facultyToken, 403);
  await runTest('Student accessing Faculty', '/faculty/dashboard', studentToken, 403);

  console.log('\n--- API AUDIT COMPLETE ---');
  if (failedCount > 0) {
    console.error(`\nFound ${failedCount} failures. Please fix them.`);
  } else {
    console.log('\nAll endpoints passed successfully.');
  }
}

runAudit();
