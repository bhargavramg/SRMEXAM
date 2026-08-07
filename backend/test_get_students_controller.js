const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
const facultyController = require('./src/controllers/facultyController');

async function testGetStudents() {
  const req = {
    user: { id: 'f2c52cf6-1663-490e-9d79-5b2c29866dc7' }, // Dr. Suseela G
    query: {}
  };
  
  const res = {
    json: function(data) {
      console.log('Success length:', data.length);
    },
    status: function(code) {
      return {
        json: function(data) {
          console.error(`Error ${code}:`, data);
        }
      };
    }
  };

  await facultyController.getStudents(req, res);
}

testGetStudents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
