const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ id: 'f2c52cf6-1663-490e-9d79-5b2c29866dc7', role: 'FACULTY' }, 'super_secret_jwt_key_for_development');

function fetchApi(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

Promise.all([
  fetchApi('/api/faculty/students'),
  fetchApi('/api/faculty/assignments')
]).then(([students, assignments]) => {
  console.log('--- PROMISE.ALL SUCCESS ---');
  console.log('Students count:', students.length);
  console.log('Assignments count:', assignments.length);
  if (assignments.length > 0) {
    console.log('Assignments Found:', assignments.length);
    console.log('Subject:', assignments[0].subject.name);
    console.log('Semester:', assignments[0].section.semester.semesterNumber);
    console.log('Section:', assignments[0].section.name);
    console.log('Status:', assignments[0].status);
  }
}).catch(err => {
  console.log('--- PROMISE.ALL FAILED ---');
  console.error(err);
});
