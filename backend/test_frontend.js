async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'suseelag@srmist.edu.in',
        password: 'suseelamam1234'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    
    const headers = { Authorization: `Bearer ${token}` };
    
    const studentsRes = await fetch('http://localhost:5000/api/faculty/students', { headers });
    const studentsData = await studentsRes.json();
    console.log('Students success:', studentsData.length, studentsData.error || '');
    
    const assignmentsRes = await fetch('http://localhost:5000/api/faculty/assignments', { headers });
    const assignmentsData = await assignmentsRes.json();
    console.log('Assignments success:', assignmentsData.length, assignmentsData.error || '');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
