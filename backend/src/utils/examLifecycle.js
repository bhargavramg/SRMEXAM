const prisma = require('./db');

/**
 * Lazily checks and updates the lifecycle status of all exams globally based on current time.
 * Lifecycle: DRAFT -> SCHEDULED -> ACTIVE -> COMPLETED -> EVALUATION -> CLOSED -> ARCHIVED
 */
const updateGlobalExamStatuses = async () => {
  const now = new Date();
  
  // SCHEDULED -> ACTIVE
  await prisma.exam.updateMany({
    where: { 
      status: 'SCHEDULED', 
      AND: [
        {
          OR: [
            { startTime: { lte: now } },
            { startTime: null }
          ]
        },
        {
          OR: [
            { endTime: null },
            { endTime: { gt: now } }
          ]
        }
      ]
    },
    data: { status: 'ACTIVE' }
  });

  // SCHEDULED or ACTIVE -> COMPLETED
  await prisma.exam.updateMany({
    where: { 
      status: { in: ['SCHEDULED', 'ACTIVE'] }, 
      endTime: { lte: now } 
    },
    data: { status: 'COMPLETED' }
  });
};

module.exports = {
  updateGlobalExamStatuses
};
