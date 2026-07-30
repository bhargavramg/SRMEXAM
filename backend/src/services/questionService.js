const questionRepository = require('../repositories/questionRepository');
const { NotFoundError } = require('../errors/AppError');

class QuestionService {
  async createQuestion(data) {
    // Business logic e.g., checking if QuestionBank exists can be added here
    return await questionRepository.create(data);
  }

  async getQuestionById(id) {
    const question = await questionRepository.findById(id);
    if (!question) {
      throw new NotFoundError(`Question with ID ${id} not found`);
    }
    return question;
  }

  async getAllQuestions(filters) {
    return await questionRepository.findAll(filters);
  }

  async updateQuestion(id, data) {
    await this.getQuestionById(id); // Throws if not found
    return await questionRepository.update(id, data);
  }

  async deleteQuestion(id) {
    await this.getQuestionById(id); // Throws if not found
    return await questionRepository.delete(id);
  }
}

module.exports = new QuestionService();
