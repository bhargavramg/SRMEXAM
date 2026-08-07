const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const token = fs.readFileSync(path.join(__dirname, '../frontend/node_modules/.cache/token.txt'), 'utf8').trim();
    const res = await axios.get('http://localhost:5000/api/faculty/questions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success! Array length:", res.data.length);
  } catch (err) {
    console.error("Failed:", err.response ? err.response.data : err.message);
  }
}
test();
