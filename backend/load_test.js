const http = require('http');

const runLoadTest = async (concurrency) => {
  console.log(`\nStarting load test with ${concurrency} concurrent requests...`);
  
  const postData = JSON.stringify({
    identifier: 'RA2311030010010',
    password: 'suseelamam1234'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const requests = Array.from({ length: concurrency }, (_, i) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, time: Date.now() - startTime, data });
        });
      });
      
      req.on('error', (e) => {
        resolve({ status: 'ERROR', error: e.message, time: Date.now() - startTime });
      });

      req.write(postData);
      req.end();
    });
  });

  const results = await Promise.all(requests);
  
  let successes = 0;
  let failures = 0;
  let unauthorized = 0;
  let serverErrors = 0;
  let poolErrors = 0;
  let maxTime = 0;
  
  for (const res of results) {
    if (res.time > maxTime) maxTime = res.time;
    if (res.status === 200) successes++;
    else if (res.status === 401) unauthorized++;
    else if (res.status === 500) {
      serverErrors++;
      if (res.data && res.data.includes('Timed out fetching')) {
        poolErrors++;
      }
    } else {
      failures++;
      console.log(`Failed request: ${res.status} - ${res.error || res.data}`);
    }
  }

  console.log(`Results for ${concurrency} concurrent requests:`);
  console.log(`Successful (200): ${successes}`);
  console.log(`Unauthorized (401): ${unauthorized}`);
  console.log(`Server Errors (500): ${serverErrors}`);
  console.log(`Pool Timeout Errors: ${poolErrors}`);
  console.log(`Other Failures: ${failures}`);
  console.log(`Max Response Time: ${maxTime}ms`);
  console.log('------------------------------------------------');
};

const main = async () => {
  try {
    await runLoadTest(10);
    await new Promise(r => setTimeout(r, 2000));
    await runLoadTest(25);
    await new Promise(r => setTimeout(r, 2000));
    await runLoadTest(50);
  } catch (error) {
    console.error('Test failed:', error);
  }
};

main();
