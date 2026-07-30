const { z } = require('zod');

const QuestionOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false),
  matchText: z.string().optional(),
});

const BaseQuestionSchema = z.object({
  bankId: z.string().uuid(),
  type: z.enum([
    'MCQ', 'MULTIPLE_CORRECT', 'TRUE_FALSE', 'FILL_IN_BLANK',
    'SHORT_ANSWER', 'LONG_ANSWER', 'CODING', 'FILE_UPLOAD', 'MATCHING'
  ]),
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  marks: z.number().positive(),
  negativeMarks: z.number().min(0).default(0),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  categoryId: z.string().uuid().optional(),
  explanation: z.string().optional(),
  bloomsLevel: z.string().optional(),
  estimatedTime: z.number().int().positive().optional(),
  attachmentUrl: z.string().url().optional(),
  
  // Metadata
  unit: z.string().optional(),
  chapter: z.string().optional(),
  topic: z.string().optional(),
  tags: z.array(z.string()).optional(), // Tag names
});

const CodingSpecificSchema = z.object({
  programmingLanguage: z.string(),
  starterCode: z.string().optional(),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  hiddenTestCases: z.string().optional(),
  timeLimit: z.number().int().positive().optional(),
  memoryLimit: z.number().int().positive().optional(),
});

const CreateQuestionBase = BaseQuestionSchema.merge(
  z.object({
    options: z.array(QuestionOptionSchema).optional(),
    codingDetails: CodingSpecificSchema.optional(),
  })
);

const CreateQuestionSchema = CreateQuestionBase.superRefine((data, ctx) => {
  if (data.type === 'MCQ' || data.type === 'MULTIPLE_CORRECT') {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MCQ and Multiple Correct questions require at least 2 options',
        path: ['options']
      });
    }
  }
  if (data.type === 'CODING' && !data.codingDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Coding questions require codingDetails to be provided',
      path: ['codingDetails']
    });
  }
});

const UpdateQuestionSchema = CreateQuestionBase.partial();

module.exports = {
  CreateQuestionSchema,
  UpdateQuestionSchema
};
