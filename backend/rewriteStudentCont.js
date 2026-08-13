const fs = require('fs');

const path = "c:\\Users\\bharg\\OneDrive\\Desktop\\SRM QUIZ\\backend\\src\\controllers\\studentController.js";
let code = fs.readFileSync(path, 'utf8');

const submitExamSearch = `    // Clear previous answers (from auto-save)
    await prisma.studentAnswer.deleteMany({ where: { sessionId } });

    // Get all exam questions with correct answers
    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      include: {
        question: { include: { options: true } }
      }
    });`;

const submitExamReplace = `    // Clear previous answers (from auto-save)
    await prisma.studentAnswer.deleteMany({ where: { sessionId } });

    // Get all exam questions with correct answers
    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      include: {
        question: { include: { options: true } }
      },
      orderBy: { orderIndex: 'asc' }
    });

    const random = getSeededRandom(session.id);
    if (session.exam.config?.randomQuestions) {
      examQuestions.sort(() => random() - 0.5);
    }

    let lastAnsweredIndex = -1;
    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i].question;
      const rawAnswer = answers ? answers[q.id] : undefined;
      let hasValidAnswer = false;

      if (rawAnswer) {
        if (typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
          hasValidAnswer = !!(rawAnswer.selectedOptionId || rawAnswer.answer || (rawAnswer.textAnswer && rawAnswer.textAnswer.trim()));
        } else if (typeof rawAnswer === 'string') {
          hasValidAnswer = !!rawAnswer.trim();
        }
      }

      if (hasValidAnswer) {
        if (i > lastAnsweredIndex + 1) {
          return res.status(400).json({ error: 'Sequential navigation violation. You skipped a question.' });
        }
        lastAnsweredIndex = i;
      }
    }

    if (!forced && lastAnsweredIndex !== examQuestions.length - 1) {
      return res.status(400).json({ error: 'You must answer all questions sequentially before submitting.' });
    }`;

code = code.replace(submitExamSearch, submitExamReplace);

const autoSaveSearch = `    const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== studentId || session.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'Invalid or inactive session' });
    }

    await prisma.studentAnswer.deleteMany({ where: { sessionId } });`;

const autoSaveReplace = `    const session = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { exam: { include: { config: true } } } });
    if (!session || session.studentId !== studentId || session.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'Invalid or inactive session' });
    }

    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: session.examId },
      orderBy: { orderIndex: 'asc' }
    });
    
    const random = getSeededRandom(session.id);
    if (session.exam.config?.randomQuestions) {
      examQuestions.sort(() => random() - 0.5);
    }

    let lastAnsweredIndex = -1;
    for (let i = 0; i < examQuestions.length; i++) {
      const qId = examQuestions[i].questionId;
      const rawAnswer = answers ? answers[qId] : undefined;
      let hasValidAnswer = false;

      if (rawAnswer) {
        if (typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
          hasValidAnswer = !!(rawAnswer.selectedOptionId || rawAnswer.answer || (rawAnswer.textAnswer && rawAnswer.textAnswer.trim()));
        } else if (typeof rawAnswer === 'string') {
          hasValidAnswer = !!rawAnswer.trim();
        }
      }

      if (hasValidAnswer) {
        if (i > lastAnsweredIndex + 1) {
          return res.status(400).json({ error: 'Sequential navigation violation. You skipped a question.' });
        }
        lastAnsweredIndex = i;
      }
    }

    await prisma.studentAnswer.deleteMany({ where: { sessionId } });`;

code = code.replace(autoSaveSearch, autoSaveReplace);

fs.writeFileSync(path, code);
console.log('Backend changes applied');
