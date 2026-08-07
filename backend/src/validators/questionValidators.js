const { z } = require('zod');

const QuestionOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false),
  matchText: z.string().optional(),
});

const BaseQuestionSchema = z.object({
  bankId: z.string().uuid(),
  type: z.literal('MCQ').default('MCQ'),
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  marks: z.number().positive(),
  negativeMarks: z.number().min(0).default(0),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  categoryId: z.string().uuid().optional(),
  explanation: z.string().optional(),
  bloomsLevel: z.string().optional(),
  tags: z.array(z.string()).optional(), // Tag names
});

const CreateQuestionBase = BaseQuestionSchema.merge(
  z.object({
    options: z.array(QuestionOptionSchema).optional(),
  })
);

const CreateQuestionSchema = CreateQuestionBase.superRefine((data, ctx) => {
  if (!data.options || data.options.length !== 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'MCQ questions require exactly 4 options',
      path: ['options']
    });
  } else {
    const correctOptions = data.options.filter(o => o.isCorrect);
    if (correctOptions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MCQ questions must have exactly 1 correct option',
        path: ['options']
      });
    }
  }
});

const UpdateQuestionSchema = CreateQuestionBase.partial();

module.exports = {
  CreateQuestionSchema,
  UpdateQuestionSchema
};
