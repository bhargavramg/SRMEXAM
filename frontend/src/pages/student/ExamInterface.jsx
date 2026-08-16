import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Radio, RadioGroup, FormControlLabel, FormControl, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Grid, Paper, Divider, TextField } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useSnackbar } from 'notistack';
import SubmitExamModal from './components/SubmitExamModal';
import ExamSuccessScreen from './components/ExamSuccessScreen';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import { Lock, ChevronRight, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

// ============================================================================
// DEDUPLICATION WINDOW — ms within which a second focus-loss event is ignored
// ============================================================================
const DEDUP_WINDOW_MS = 800;

const ExamInterface = () => {
  const { examId, sessionId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  
  // New States for Submission Flow
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // idle | submitting | success | error

  // New States for Single-Question View
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewStatus, setReviewStatus] = useState({}); // { [questionId]: 'marked' | 'visited' }
  const [timeSpent, setTimeSpent] = useState({}); // { [questionId]: seconds }

  // ============================================================================
  // FOCUS-LOSS SECURITY STATE
  // showFocusOverlay: controls the double-layer protection overlay
  // focusLostTimestampRef: tracks when the last focus-loss event fired (deduplication)
  // ============================================================================
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);
  const focusLostTimestampRef = useRef(null); // timestamp of last recorded focus-loss

  const socketRef = useRef(null);
  const configRef = useRef(null);

  // Fetch Questions
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
  }, [questionsData]);

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

  // ============================================================================
  // FOCUS-LOSS HANDLER
  // Records the event through the existing logActivity API (backend is source of truth).
  // Deduplication: if another focus-loss event fired within DEDUP_WINDOW_MS, ignore it.
  // Does NOT auto-submit — that is reserved for fullscreen violations.
  // ============================================================================
  const handleFocusLost = useCallback(async () => {
    // Skip if exam is not active
    if (submissionStatus === 'submitting' || submissionStatus === 'success') return;

    const now = Date.now();

    // Deduplication: ignore if a focus-loss was already recorded within the window
    if (focusLostTimestampRef.current && (now - focusLostTimestampRef.current) < DEDUP_WINDOW_MS) {
      return;
    }

    // Mark the timestamp BEFORE the async call to prevent concurrent duplicates
    focusLostTimestampRef.current = now;

    // Show the content-protection overlay immediately (Layer 1 + Layer 2)
    setShowFocusOverlay(true);

    // Log to backend — backend increments warningCount, writes Warning + ActivityLog,
    // and broadcasts the confirmed count to faculty via socket.
    // Security: studentId comes from authenticated token, not from request body.
    try {
      await studentApi.logExamActivity(sessionId, 'WARNING', 'FOCUS_LOST', 'FOCUS_LOST');
    } catch (err) {
      // Security logging failure must NEVER break the exam
      console.warn('[ExamSecurity] Failed to log FOCUS_LOST event:', err?.message || err);
    }
  }, [sessionId, submissionStatus]);

  // ============================================================================
  // FOCUS-RETURN HANDLER
  // ============================================================================
  const handleFocusReturn = useCallback(() => {
    // Only show toast/remove overlay if we were previously hidden
    if (showFocusOverlay) {
      setShowFocusOverlay(false);
      enqueueSnackbar(
        'Exam window focus was lost. This activity has been recorded.',
        { variant: 'warning', autoHideDuration: 5000 }
      );
    }
  }, [showFocusOverlay, enqueueSnackbar]);

  // Setup Socket & Security Events
  useEffect(() => {
    if (!user || !examId || !sessionId) return;
    
    // Check fullscreen on mount if required
    if (configRef.current?.requireFullscreen && !document.fullscreenElement) {
       handleViolation("Not in Full Screen");
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', '');
    socketRef.current = io(socketUrl);
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
      enqueueSnackbar("Your session has been terminated because a new login was detected.", { variant: 'error', persist: true });
      logout();
    });

    // ============================================================================
    // FOCUS-LOSS DETECTION — multiple events, single violation (deduplication)
    // Primary: window.blur (user switches away from window)
    // Secondary: document.visibilitychange (tab hidden)
    // Both funnel into handleFocusLost which has the deduplication guard.
    // ============================================================================
    const handleBlur = () => {
      handleFocusLost();
    };

    const handleFocus = () => {
      handleFocusReturn();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab/window became hidden — treat as focus loss
        handleFocusLost();
      } else if (document.visibilityState === 'visible') {
        // Tab became visible again — restore
        handleFocusReturn();
      }
    };

    // Fullscreen change (existing behavior — separate from focus-loss)
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
      enqueueSnackbar("Navigation is disabled during the examination.", { variant: 'warning', autoHideDuration: 5000 });
    };
    
    // Prevent accidental tab close
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your exam is in progress.";
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Focus-loss events (multi-layer, deduplicated)
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Existing security events
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  }, [user, examId, sessionId, handleFocusLost, handleFocusReturn]);

  // Handle Violations (fullscreen / other existing violations — NOT focus loss)
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
      const isDescriptive = ['SHORT_ANSWER', 'LONG_ANSWER', 'ESSAY', 'THEORY'].includes(q.type);
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
    if (submissionStatus === 'submitting' || submissionStatus === 'success') return;
    setSubmissionStatus('submitting');
    enqueueSnackbar(reason, { variant: 'warning', autoHideDuration: 5000 });
    try {
      const result = await studentApi.submitExam(sessionId, getEnhancedAnswers(), true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      setSubmissionStatus('success');
    } catch (error) {
      console.error("Failed to auto-submit", error);
      const backendError = error.response?.data?.details || error.response?.data?.error || error.message || 'Unknown error';
      enqueueSnackbar(`Auto-Submission failed. HTTP: ${error.response?.status || 500} - ${backendError}`, { variant: 'error', persist: true });
      if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
      navigate('/student/dashboard', { replace: true });
    }
  };

  const handleOptionChange = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const calculateStats = () => {
    if (!questionsData?.questions) return { total: 0, answered: 0, unanswered: 0, marked: 0, remainingTime: "00:00" };
    const total = questionsData.questions.length;
    let answered = 0;
    let marked = 0;
    
    questionsData.questions.forEach(q => {
      if (answers[q.id]) answered++;
      if (reviewStatus[q.id] === 'marked') marked++;
    });
    
    return {
      total,
      answered,
      unanswered: total - answered,
      marked,
      remainingTime: formatTime(timeLeft)
    };
  };

  const handleSubmitClick = () => {
    // Remove overlay if visible so student can see submit modal
    if (showFocusOverlay) setShowFocusOverlay(false);
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    if (submissionStatus === 'submitting' || submissionStatus === 'success') return;
    setSubmissionStatus('submitting');
    try {
      const result = await studentApi.submitExam(sessionId, getEnhancedAnswers(), false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      setSubmissionStatus('success');
    } catch (error) {
      console.error("Failed to submit exam", error);
      const backendError = error.response?.data?.details || error.response?.data?.error || error.message || 'Unknown error';
      enqueueSnackbar(`Submission failed. HTTP: ${error.response?.status || 500} - ${backendError}`, { variant: 'error', persist: true });
      setSubmissionStatus('error');
      setTimeout(() => setSubmissionStatus('idle'), 500);
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
  
  const hasValidAnswer = !!answers[currentQuestion?.id] && (typeof answers[currentQuestion?.id] === 'string' ? answers[currentQuestion?.id].trim().length > 0 : true);
  const isFinalQuestion = currentQuestionIndex === questions.length - 1;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSaveAndNext = () => {
    studentApi.autoSaveAnswers(sessionId, getEnhancedAnswers()).catch(console.error);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentQuestion.id];
    setAnswers(newAnswers);
  };

  // Palette Color Logic
  const getPaletteColor = (qId, idx) => {
    const isAnswered = !!answers[qId] && (typeof answers[qId] === 'string' ? answers[qId].trim().length > 0 : true);
    if (isAnswered) return '#4CAF50'; // Answered
    if (idx === currentQuestionIndex) return '#F44336'; // Current Unanswered
    return '#E0E0E0'; // Locked future question
  };

  const getPaletteTextColor = (qId, idx) => {
    const color = getPaletteColor(qId, idx);
    return color === '#E0E0E0' ? '#333' : '#FFF';
  };

  if (submissionStatus === 'success') {
    return <ExamSuccessScreen examTitle={examDetails?.title} attemptNumber={1} />;
  }

  if (submissionStatus === 'submitting') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', userSelect: 'none' }}>
        <CircularProgress size={60} thickness={4} sx={{ mb: 4, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Submitting your examination...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please do not close this page.
        </Typography>
      </Box>
    );
  }

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
            onClick={handleSubmitClick}
            disabled={submissionStatus !== 'idle'}
            startIcon={<CheckCircle size={20} />}
            sx={{ fontWeight: 'bold' }}
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </Button>
        </Box>
      </Paper>

      {/* Main Content Area — position: relative so overlay can be absolutely positioned over it */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ====================================================================
            EXAM SECURITY OVERLAY (Layer 1 + Layer 2)
            Positioned absolutely over the entire exam content area.
            Appears when browser focus/visibility is lost.
            Does NOT destroy React state — answers, timer, and session are all preserved.
            NOTE: This is best-effort deterrence. It cannot block OS-level screenshot tools
            such as Windows Snipping Tool, Print Screen, or external capture applications.
        ==================================================================== */}
        {showFocusOverlay && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              // Layer 1 — blurs/obscures the underlying exam content
              backdropFilter: 'blur(16px)',
              // Layer 2 — dark overlay above blurred content
              bgcolor: 'rgba(13, 27, 62, 0.93)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Prevent any interaction with exam content below
              pointerEvents: 'all',
            }}
          >
            <Card
              elevation={8}
              sx={{
                maxWidth: 480,
                width: '90%',
                borderRadius: 3,
                border: '2px solid rgba(255, 255, 255, 0.15)',
                bgcolor: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ p: 5 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,152,0,0.18)',
                    border: '2px solid rgba(255,152,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <ShieldAlert size={36} color="#FF9800" />
                </Box>

                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{ mb: 1.5, color: 'white', letterSpacing: 0.3 }}
                >
                  🔒 Exam Content Hidden
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ mb: 2, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}
                >
                  Your exam window has lost focus.
                  <br />
                  Exam activity has been recorded.
                </Typography>

                <Box
                  sx={{
                    bgcolor: 'rgba(255,152,0,0.12)',
                    border: '1px solid rgba(255,152,0,0.3)',
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    mb: 3,
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Please return to the examination window to continue.
                    <br />
                    Your answers and timer have been preserved.
                  </Typography>
                </Box>

                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', display: 'block', mt: 1 }}
                >
                  Best-effort exam security · Cannot block OS-level screen capture
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Left Side - Question Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflowY: 'auto' }}>
          <Paper elevation={1} sx={{ p: 4, borderRadius: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* Question Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, borderBottom: '1px solid #E0E0E0', pb: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Question {currentQuestionIndex + 1} of {questions.length}
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
              {['SHORT_ANSWER', 'LONG_ANSWER', 'ESSAY', 'THEORY'].includes(currentQuestion?.type) ? (
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
                      color: getPaletteTextColor(q.id, idx),
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
          </Box>

        </Box>
      </Box>

      {/* Warning Modal (existing fullscreen/other violations) */}
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

      <SubmitExamModal 
        open={showSubmitModal} 
        onClose={() => setShowSubmitModal(false)} 
        onConfirm={confirmSubmit} 
        stats={calculateStats()} 
      />
    </Box>
  );
};

export default ExamInterface;
