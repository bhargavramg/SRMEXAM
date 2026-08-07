async function testLogin() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@examportal.com',
        password: 'admin123'
      })
    });
    const data = await res.json();
    console.log("Login status:", res.status);
    console.log("Login response:", data);
  } catch (err) {
    console.log("Login failed:", err);
  }
}

testLogin();
