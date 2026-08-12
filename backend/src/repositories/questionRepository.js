const prisma = require('../utils/db');

class QuestionRepository {
  async create(data) {
    const { options, tags, codingDetails, ...questionData } = data;

    return await prisma.question.create({
      data: {
        ...questionData,
        ...codingDetails,
        options: options ? {
          create: options
        } : undefined,
        tags: tags ? {
          create: tags.map(tag => ({
            tag: {
              connectOrCreate: {
                where: { name: tag },
                create: { name: tag }
              }
            }
          }))
        } : undefined
      },
      include: {
        options: true,
        tags: { include: { tag: true } }
      }
    });
  }

  async findById(id) {
    return await prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        tags: { include: { tag: true } }
      }
    });
  }

  async findAll(filters) {
    const { bankId, type, difficulty, search } = filters;
    
    const where = {};
    if (bankId) where.bankId = bankId;
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } }
      ];
    }

    return await prisma.question.findMany({
      where,
      include: {
        options: true,
        tags: { include: { tag: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(id, data) {
    // Basic update for now, omit complex relations updates unless specified
    return await prisma.question.update({
      where: { id },
      data,
      include: {
        options: true,
        tags: { include: { tag: true } }
      }
    });
  }

  async delete(id) {
    return await prisma.question.delete({
      where: { id }
    });
  }
}

module.exports = new QuestionRepository();
