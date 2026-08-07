const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ id: 'f2c52cf6-1663-490e-9d79-5b2c29866dc7', role: 'FACULTY' }, 'super_secret_jwt_key_for_development');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/faculty/assignments',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const parsed = JSON.parse(data);
    console.log('Assignments count:', parsed.length);
    if (parsed.length > 0) {
       console.log('First assignment keys:', Object.keys(parsed[0]));
       console.log('Subject:', parsed[0].subject);
       console.log('Section:', parsed[0].section);
    }
  });
});
req.on('error', console.error);
req.end();
