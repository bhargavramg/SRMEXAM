import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Radio, RadioGroup, FormControlLabel, FormControl, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Grid, Paper, Divider, TextField } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import { Flag, ChevronLeft, ChevronRight, Save, CheckCircle, Clock } from 'lucide-react';

const ExamInterface = () => {
  const { examId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  
  // New States for Single-Question View
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewStatus, setReviewStatus] = useState({}); // { [questionId]: 'marked' | 'visited' }
  const [timeSpent, setTimeSpent] = useState({}); // { [questionId]: seconds }

  const socketRef = useRef(null);
  const configRef = useRef(null);

  // Fetch Questions
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['examQuestions', sessionId],
    queryFn: () => studentApi.getExamQuestions(sessionId),
    refetchOnWindowFocus: false,
  });

  // Fetch Exam Details for Timer
  const { data: examDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['examDetails', examId],
    queryFn: () => studentApi.getExamDetails(examId),
    refetchOnWindowFocus: false,
  });

  // Fetch Config
  const { data: examConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['examConfig', examId],
    queryFn: () => studentApi.getExamConfig(examId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (examConfig) {
      configRef.current = examConfig;
      if (examConfig.requireFullscreen && !document.fullscreenElement) {
        handleViolation("Not in Full Screen");
      }
    }
  }, [examConfig]);

  // Setup Socket & Security Events
  useEffect(() => {
    if (!user || !examId || !sessionId) return;
    
    // Check fullscreen on mount if required
    if (configRef.current?.requireFullscreen && !document.fullscreenElement) {
       handleViolation("Not in Full Screen");
    }

    socketRef.current = io('http://localhost:5000');
    const socket = socketRef.current;

    socket.emit('join_exam', {
      examId,
      studentId: user.id,
      name: user.name,
      register_no: user.register_no
    });
    
    const token = localStorage.getItem('token');
    if (token) {
      socket.emit('join_room', { room: `session_${token}`, role: 'STUDENT', userId: user.id });
    }

    socket.on('session_terminated', () => {
      alert("Your session has been terminated because a new login was detected.");
      logout();
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab Switching");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && configRef.current?.requireFullscreen) {
        handleViolation("Exited Full Screen");
      }
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleCopy = (e) => e.preventDefault();
    const handlePaste = (e) => e.preventDefault();
    const handleCut = (e) => e.preventDefault();
    const handleDragStart = (e) => e.preventDefault();
    const handleSelectStart = (e) => e.preventDefault();

    // Prevent navigation (Back button)
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
      alert("Navigation is disabled during the examination.");
    };
    
    // Prevent accidental tab close
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your exam is in progress.";
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("selectstart", handleSelectStart);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (socket) socket.disconnect();
    };
  }, [user, examId, sessionId]);

  // Handle Violations
  const handleViolation = async (type) => {
    setWarningCount(prev => {
      const newCount = prev + 1;
      const maxWarnings = configRef.current?.maxWarnings || 3;
      
      if (newCount > maxWarnings) {
         forceSubmitExam("Maximum warnings exceeded.");
      } else {
         setWarningMessage(`Warning ${newCount}/${maxWarnings}: ${type} detected. Exam will be auto-submitted if limits are exceeded.`);
         setShowWarningModal(true);
      }
      
      studentApi.logExamActivity(sessionId, 'WARNING', type, 'GENERAL').catch(console.error);
      
      if (socketRef.current) {
        socketRef.current.emit('trigger_warning', {
          examId,
          studentId: user?.id,
          warningType: type,
          warningCount: newCount
        });
      }
      
      return newCount;
    });
  };

  // Timer Setup
  useEffect(() => {
    if (examDetails?.durationMins && timeLeft === null) {
      setTimeLeft(examDetails.durationMins * 60);
    }
  }, [examDetails]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      forceSubmitExam("Time is up! Exam auto-submitted.");
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  // Telemetry Setup
  useEffect(() => {
    if (!socketRef.current || !user || !examId) return;
    
    const telemetryTimer = setInterval(() => {
      socketRef.current.emit('student_telemetry', {
        examId,
        studentId: user.id,
        warningCount,
        timeLeft,
        isFullscreen: !!document.fullscreenElement
      });
    }, 5000);

    return () => clearInterval(telemetryTimer);
  }, [user, examId, warningCount, timeLeft]);

  // Auto Save Setup
  useEffect(() => {
    if (!examConfig?.autoSaveInterval || Object.keys(answers).length === 0) return;
    
    const autoSaveTimer = setInterval(() => {
      studentApi.autoSaveAnswers(sessionId, getEnhancedAnswers()).catch(console.error);
    }, examConfig.autoSaveInterval * 1000);

    return () => clearInterval(autoSaveTimer);
  }, [examConfig, answers, sessionId]);

  // Handle mark visited
  useEffect(() => {
    if (questionsData?.questions) {
      const currentQ = questionsData.questions[currentQuestionIndex];
      if (currentQ && !reviewStatus[currentQ.id]) {
        setReviewStatus(prev => ({ ...prev, [currentQ.id]: 'visited' }));
      }
    }
  }, [currentQuestionIndex, questionsData]);

  // Track time spent per question
  useEffect(() => {
    const currentQ = questionsData?.questions?.[currentQuestionIndex];
    if (!currentQ) return;
    
    const timerId = setInterval(() => {
      setTimeSpent(prev => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || 0) + 1
      }));
    }, 1000);

    return () => clearInterval(timerId);
  }, [currentQuestionIndex, questionsData]);

  const getEnhancedAnswers = () => {
    const enhanced = {};
    if (!questionsData?.questions) return enhanced;

    questionsData.questions.forEach(q => {
      const isAnswered = !!answers[q.id];
      const isDescriptive = ['SHORT_ANSWER', 'LONG_ANSWER', 'ESSAY'].includes(q.type);
      const isVisited = !!reviewStatus[q.id] || !!timeSpent[q.id] || isAnswered;
      
      if (isVisited) {
        enhanced[q.id] = {
          selectedOptionId: !isDescriptive ? (answers[q.id] || null) : null,
          textAnswer: isDescriptive ? (answers[q.id] || null) : null,
          timeSpent: timeSpent[q.id] || 0,
          markedForReview: reviewStatus[q.id] === 'marked',
          visited: isVisited
        };
      }
    });
    return enhanced;
  };

  const forceSubmitExam = async (reason) => {
    if (submitting) return;
    setSubmitting(true);
    alert(reason);
    try {
      const result = await studentApi.submitExam(sessionId, getEnhancedAnswers(), true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      navigate(`/student/exam/${examId}/result`, { state: { result }, replace: true });
    } catch (error) {
      console.error("Failed to auto-submit", error);
      if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
      navigate('/student/dashboard', { replace: true });
    }
  };

  const handleOptionChange = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to submit your exam? You cannot undo this action.")) return;
    setSubmitting(true);
    try {
      const result = await studentApi.submitExam(sessionId, getEnhancedAnswers(), false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      navigate(`/student/exam/${examId}/result`, { state: { result }, replace: true });
    } catch (error) {
      console.error("Failed to submit exam", error);
      alert("Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoadingQuestions || isLoadingDetails || isLoadingConfig) {
    return <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (!questionsData?.questions) {
    return <Typography color="error">Failed to load exam.</Typography>;
  }

  const questions = questionsData.questions;
  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSaveAndNext = () => {
    // Already saved in state via handleOptionChange, just move next
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
  };

  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentQuestion.id];
    setAnswers(newAnswers);
  };

  // Palette Color Logic
  const getPaletteColor = (qId) => {
    const isAnswered = !!answers[qId];
    const status = reviewStatus[qId];

    if (status === 'marked' && isAnswered) return '#9C27B0'; // Answered & Marked
    if (status === 'marked') return '#FF9800'; // Marked for review
    if (isAnswered) return '#4CAF50'; // Answered
    if (status === 'visited') return '#F44336'; // Visited but Unanswered
    return '#E0E0E0'; // Not visited (white/grey)
  };

  const getPaletteTextColor = (qId) => {
    const color = getPaletteColor(qId);
    return color === '#E0E0E0' ? '#333' : '#FFF';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', userSelect: 'none' }}>
      {/* Top Bar */}
      <Paper elevation={2} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1565C0', color: 'white', borderRadius: 0, zIndex: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">ExamPortal</Typography>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>{examDetails?.title}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>{examDetails?.subject?.name}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.2)', px: 2, py: 0.5, borderRadius: 1 }}>
            <Clock size={20} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: timeLeft < 300 ? '#FF5252' : 'inherit' }}>
              {formatTime(timeLeft)}
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={<CheckCircle size={20} />}
            sx={{ fontWeight: 'bold' }}
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </Button>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* Left Side - Question Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflowY: 'auto' }}>
          <Paper elevation={1} sx={{ p: 4, borderRadius: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* Question Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, borderBottom: '1px solid #E0E0E0', pb: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Question {currentQuestionIndex + 1}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Marks: {currentQuestion?.marks || 1}
              </Typography>
            </Box>

            {/* Question Text */}
            <Typography variant="body1" sx={{ fontSize: '1.1rem', mb: 4, whiteSpace: 'pre-line' }}>
              {currentQuestion?.text}
            </Typography>

            {/* Options or Text Input */}
            <FormControl component="fieldset" sx={{ mt: 2, width: '100%', flexGrow: 1 }}>
              {['SHORT_ANSWER', 'LONG_ANSWER', 'ESSAY'].includes(currentQuestion?.type) ? (
                <TextField
                  multiline
                  minRows={currentQuestion?.type === 'SHORT_ANSWER' ? 3 : 6}
                  fullWidth
                  variant="outlined"
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion?.id] || ''}
                  onChange={(e) => handleOptionChange(currentQuestion.id, e.target.value)}
                  sx={{ mt: 2, bgcolor: '#FAFAFA' }}
                />
              ) : (
                <RadioGroup
                  value={answers[currentQuestion?.id] || ''}
                  onChange={(e) => handleOptionChange(currentQuestion.id, e.target.value)}
                >
                  {currentQuestion?.options?.map(option => (
                    <FormControlLabel 
                      key={option.id} 
                      value={option.id} 
                      control={<Radio color="primary" />} 
                      label={
                        <Typography sx={{ fontSize: '1.05rem', p: 1 }}>
                          {option.text}
                        </Typography>
                      } 
                      sx={{
                         mb: 1.5, 
                         bgcolor: answers[currentQuestion.id] === option.id ? 'primary.50' : '#F9F9F9',
                         border: '1px solid',
                         borderColor: answers[currentQuestion.id] === option.id ? 'primary.main' : '#E0E0E0',
                         borderRadius: 2,
                         ml: 0,
                         width: '100%',
                         transition: 'all 0.2s',
                         '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.light' }
                      }}
                    />
                  ))}
                </RadioGroup>
              )}
            </FormControl>

            {/* Action Buttons */}
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
            </Box>

          </Paper>
        </Box>

        {/* Right Side - Question Palette */}
        <Box sx={{ width: 320, borderLeft: '1px solid #E0E0E0', bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
          {/* Student Info */}
          <Box sx={{ p: 3, borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 50, height: 50, bgcolor: '#E3F2FD', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {user?.name?.charAt(0)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.register_no}</Typography>
            </Box>
          </Box>

          {/* Palette Legend */}
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
          </Box>

        </Box>
      </Box>

      {/* Warning Modal */}
      <Dialog open={showWarningModal} onClose={() => setShowWarningModal(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Warning!</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', fontWeight: 500 }}>
            {warningMessage}
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, color: 'text.secondary', fontSize: '0.9rem' }}>
            Please return to full-screen mode and do not leave the exam tab.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowWarningModal(false);
            if (!document.fullscreenElement && configRef.current?.requireFullscreen) {
              document.documentElement.requestFullscreen().catch(console.error);
            }
          }} color="primary" variant="contained">
            Acknowledge & Return to Exam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamInterface;
