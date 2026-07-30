const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const validateRequest = require('../utils/validateRequest');
const { CreateQuestionSchema, UpdateQuestionSchema } = require('../validators/questionValidators');
const { authenticate, authorize } = require('../middlewares/auth');

// All question routes require authentication and FACULTY/ADMIN/SUPER_ADMIN roles
router.use(authenticate, authorize('FACULTY', 'ADMIN', 'SUPER_ADMIN'));

router.route('/')
  .post(validateRequest(CreateQuestionSchema), questionController.createQuestion)
  .get(questionController.getAllQuestions);

router.route('/:id')
  .get(questionController.getQuestion)
  .put(validateRequest(UpdateQuestionSchema), questionController.updateQuestion)
  .delete(questionController.deleteQuestion);

module.exports = router;
