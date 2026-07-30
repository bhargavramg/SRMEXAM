const questionService = require('../services/questionService');
const ApiResponse = require('../utils/apiResponse');

exports.createQuestion = async (req, res, next) => {
  try {
    const question = await questionService.createQuestion(req.body);
    ApiResponse.created(res, question, 'Question created successfully');
  } catch (error) {
    next(error);
  }
};

exports.getQuestion = async (req, res, next) => {
  try {
    const question = await questionService.getQuestionById(req.params.id);
    ApiResponse.success(res, question);
  } catch (error) {
    next(error);
  }
};

exports.getAllQuestions = async (req, res, next) => {
  try {
    const questions = await questionService.getAllQuestions(req.query);
    ApiResponse.success(res, questions);
  } catch (error) {
    next(error);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await questionService.updateQuestion(req.params.id, req.body);
    ApiResponse.success(res, question, 'Question updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    await questionService.deleteQuestion(req.params.id);
    ApiResponse.noContent(res);
  } catch (error) {
    next(error);
  }
};
