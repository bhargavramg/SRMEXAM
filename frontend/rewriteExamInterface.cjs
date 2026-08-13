const fs = require('fs');

const path = "c:\\Users\\bharg\\OneDrive\\Desktop\\SRM QUIZ\\frontend\\src\\pages\\student\\ExamInterface.jsx";
let code = fs.readFileSync(path, 'utf8');

// Replace imports: Add Lock
code = code.replace("Flag, ChevronLeft, ChevronRight, Save, CheckCircle, Clock", "Lock, ChevronRight, CheckCircle, Clock");

// Process existingAnswers on query load
const initSearch = `  // Fetch Questions
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['examQuestions', sessionId],
    queryFn: () => studentApi.getExamQuestions(sessionId),
    refetchOnWindowFocus: false,
  });`;

const initReplace = `  // Fetch Questions
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['examQuestions', sessionId],
    queryFn: () => studentApi.getExamQuestions(sessionId),
    refetchOnWindowFocus: false,
  });

  // Initialize answers and progress from backend
  useEffect(() => {
    if (questionsData?.existingAnswers && Object.keys(answers).length === 0) {
      const restoredAnswers = {};
      let maxAnsweredIndex = -1;
      
      questionsData.questions.forEach((q, idx) => {
        const existingAns = questionsData.existingAnswers.find(ea => ea.questionId === q.id);
        if (existingAns) {
          if (existingAns.selectedOptions?.length > 0) {
            restoredAnswers[q.id] = existingAns.selectedOptions[0].id;
          } else if (existingAns.textAnswer) {
            restoredAnswers[q.id] = existingAns.textAnswer;
          }
          maxAnsweredIndex = idx;
        }
      });
      
      setAnswers(restoredAnswers);
      
      // If student was midway, resume at the first unanswered question
      if (maxAnsweredIndex >= 0 && maxAnsweredIndex < questionsData.questions.length - 1) {
        setCurrentQuestionIndex(maxAnsweredIndex + 1);
      }
    }
  }, [questionsData]);`;

code = code.replace(initSearch, initReplace);

// Handle 'Next' validation
const saveNextSearch = `  const handleSaveAndNext = () => {
    // Already saved in state via handleOptionChange, just move next
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };`;

const saveNextReplace = `  const handleSaveAndNext = () => {
    // Force auto-save to validate immediately
    studentApi.autoSaveAnswers(sessionId, getEnhancedAnswers()).catch(console.error);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };`;

code = code.replace(saveNextSearch, saveNextReplace);

// Remove Mark for review logic & previous logic
const removeCodeSearch = `  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSaveAndNext = () => {
    // Force auto-save to validate immediately
    studentApi.autoSaveAnswers(sessionId, getEnhancedAnswers()).catch(console.error);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleMarkForReview = () => {
    setReviewStatus(prev => ({
      ...prev,
      [currentQuestion.id]: 'marked'
    }));
    handleNext();
  };`;

const removeCodeReplace = `  const handleSaveAndNext = () => {
    studentApi.autoSaveAnswers(sessionId, getEnhancedAnswers()).catch(console.error);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };`;

code = code.replace(removeCodeSearch, removeCodeReplace);

// Identify if current question has valid answer
const isCurrentAnswered = `  const questions = questionsData.questions;
  const currentQuestion = questions[currentQuestionIndex];
  
  const hasValidAnswer = !!answers[currentQuestion?.id] && (typeof answers[currentQuestion?.id] === 'string' ? answers[currentQuestion?.id].trim().length > 0 : true);
  const isFinalQuestion = currentQuestionIndex === questions.length - 1;`;

const qSearch = `  const questions = questionsData.questions;
  const currentQuestion = questions[currentQuestionIndex];`;

code = code.replace(qSearch, isCurrentAnswered);

// Change Palette Logic
const paletteColorSearch = `  const getPaletteColor = (qId) => {
    const isAnswered = !!answers[qId];
    const status = reviewStatus[qId];

    if (status === 'marked' && isAnswered) return '#9C27B0'; // Answered & Marked
    if (status === 'marked') return '#FF9800'; // Marked for review
    if (isAnswered) return '#4CAF50'; // Answered
    if (status === 'visited') return '#F44336'; // Visited but Unanswered
    return '#E0E0E0'; // Not visited (white/grey)
  };`;

const paletteColorReplace = `  const getPaletteColor = (qId, idx) => {
    const isAnswered = !!answers[qId] && (typeof answers[qId] === 'string' ? answers[qId].trim().length > 0 : true);
    if (isAnswered) return '#4CAF50'; // Answered
    if (idx === currentQuestionIndex) return '#F44336'; // Current Unanswered
    return '#E0E0E0'; // Locked future question
  };`;

code = code.replace(paletteColorSearch, paletteColorReplace);

// Render action buttons
const actionBtnSearch = `            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #E0E0E0' }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleClearResponse}
                  disabled={!answers[currentQuestion?.id]}
                >
                  Clear Response
                </Button>
                <Button 
                  variant="outlined" 
                  color="warning" 
                  onClick={handleMarkForReview}
                  startIcon={<Flag size={18} />}
                >
                  Mark for Review & Next
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="inherit" 
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  startIcon={<ChevronLeft size={18} />}
                >
                  Previous
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleSaveAndNext}
                  endIcon={<ChevronRight size={18} />}
                >
                  Save & Next
                </Button>
              </Box>
            </Box>`;

const actionBtnReplace = `            {/* Action Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4, pt: 3, borderTop: '1px solid #E0E0E0' }}>
              {!hasValidAnswer && (
                <Typography variant="body2" color="error" fontWeight="bold">
                  Please answer this question before continuing.
                </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleClearResponse}
                  disabled={!hasValidAnswer}
                >
                  Clear Response
                </Button>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!isFinalQuestion ? (
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={handleSaveAndNext}
                      disabled={!hasValidAnswer}
                      endIcon={<ChevronRight size={18} />}
                    >
                      Save & Next
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="success"
                      onClick={handleSubmitClick}
                      disabled={!hasValidAnswer || submissionStatus !== 'idle'}
                      startIcon={<CheckCircle size={18} />}
                    >
                      {submitting ? 'Submitting...' : 'Submit Exam'}
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>`;

code = code.replace(actionBtnSearch, actionBtnReplace);

// Render Palette grid
const paletteSearch = `          {/* Palette Legend */}
          <Box sx={{ p: 3, borderBottom: '1px solid #E0E0E0' }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#4CAF50', borderRadius: 1 }} />
                <Typography variant="caption">Answered</Typography>
              </Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#F44336', borderRadius: 1 }} />
                <Typography variant="caption">Not Answered</Typography>
              </Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#E0E0E0', borderRadius: 1 }} />
                <Typography variant="caption">Not Visited</Typography>
              </Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#FF9800', borderRadius: 1 }} />
                <Typography variant="caption">Marked</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Palette Grid */}
          <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
              Question Palette
            </Typography>
            <Grid container spacing={1.5}>
              {questions.map((q, idx) => (
                <Grid item key={q.id}>
                  <Button
                    onClick={() => setCurrentQuestionIndex(idx)}
                    sx={{
                      minWidth: 45,
                      width: 45,
                      height: 45,
                      borderRadius: 1,
                      bgcolor: getPaletteColor(q.id),
                      color: getPaletteTextColor(q.id),
                      border: currentQuestionIndex === idx ? '2px solid #1565C0' : 'none',
                      '&:hover': {
                        opacity: 0.8,
                        bgcolor: getPaletteColor(q.id)
                      }
                    }}
                  >
                    {idx + 1}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>`;

const paletteReplace = `          {/* Palette Legend */}
          <Box sx={{ p: 3, borderBottom: '1px solid #E0E0E0' }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#4CAF50', borderRadius: 1 }} />
                <Typography variant="caption">Answered</Typography>
              </Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#F44336', borderRadius: 1 }} />
                <Typography variant="caption">Current</Typography>
              </Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: '#E0E0E0', borderRadius: 1 }} />
                <Typography variant="caption">Locked</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Palette Grid */}
          <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
              Question Progress
            </Typography>
            <Grid container spacing={1.5}>
              {questions.map((q, idx) => (
                <Grid item key={q.id}>
                  <Box
                    sx={{
                      width: 45,
                      height: 45,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: getPaletteColor(q.id, idx),
                      color: getPaletteTextColor(q.id),
                      border: currentQuestionIndex === idx ? '2px solid #1565C0' : 'none',
                      opacity: idx > currentQuestionIndex ? 0.6 : 1,
                    }}
                  >
                    {idx < currentQuestionIndex ? <CheckCircle size={18} /> : 
                     idx > currentQuestionIndex ? <Lock size={18} /> : 
                     idx + 1}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>`;

code = code.replace(paletteSearch, paletteReplace);

// Header Question X of Y
const headerSearch = `            {/* Question Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, borderBottom: '1px solid #E0E0E0', pb: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Question {currentQuestionIndex + 1}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Marks: {currentQuestion?.marks || 1}
              </Typography>
            </Box>`;

const headerReplace = `            {/* Question Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, borderBottom: '1px solid #E0E0E0', pb: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Marks: {currentQuestion?.marks || 1}
              </Typography>
            </Box>`;
            
code = code.replace(headerSearch, headerReplace);


fs.writeFileSync(path, code);
console.log('Frontend changes applied');
