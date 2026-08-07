// We will use fetch since axios is missing

async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'suseelag@srmist.edu.in', password: 'suseelamam1234' })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    const assignmentsRes = await fetch('http://localhost:5000/api/faculty/assignments', { headers });
    const assignments = await assignmentsRes.json();
    
    console.log(`Found ${assignments.length} assignments.`);
    
    for (const a of assignments) {
      console.log(`Testing assignment ${a.id}...`);
      const studentsRes = await fetch(`http://localhost:5000/api/faculty/assignments/${a.id}/students`, { headers });
      if (!studentsRes.ok) {
        const errData = await studentsRes.text();
        console.error(`Failed for ${a.id}: ${studentsRes.status} ${errData}`);
      } else {
        const students = await studentsRes.json();
        console.log(`Success for ${a.id}: ${students.length} students.`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
