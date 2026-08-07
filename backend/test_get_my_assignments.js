const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
const facultyController = require('./src/controllers/facultyController');

async function testGetMyAssignments() {
  const req = {
    user: { id: 'f2c52cf6-1663-490e-9d79-5b2c29866dc7' } // Dr. Suseela G
  };
  
  const res = {
    json: function(data) {
      console.log('Success:', JSON.stringify(data, null, 2));
    },
    status: function(code) {
      return {
        json: function(data) {
          console.error(`Error ${code}:`, data);
        }
      };
    }
  };

  await facultyController.getMyAssignments(req, res);
}

testGetMyAssignments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
