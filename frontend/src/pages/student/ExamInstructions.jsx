import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Clock,
  FileText,
  Award,
  HelpCircle,
  ShieldAlert,
  Camera,
  Clipboard,
  Monitor,
  Wifi,
  Maximize2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import studentApi from '../../api/studentApi';
import { useSnackbar } from 'notistack';

// ─── tiny helper: bold stat card ─────────────────────────────────────────────
const StatCard = ({ icon, label, value, accent }) => (
  <Box
    sx={{
      flex: '1 1 160px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
      p: 2.5,
      borderRadius: 3,
      background: accent
        ? `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`
        : 'rgba(21,101,192,0.04)',
      border: `1.5px solid ${accent ? accent + '30' : 'rgba(21,101,192,0.12)'}`,
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 20px ${accent ? accent + '25' : 'rgba(21,101,192,0.12)'}`,
      },
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: accent || '#1565C0',
        color: '#fff',
        boxShadow: `0 4px 12px ${accent ? accent + '40' : 'rgba(21,101,192,0.3)'}`,
      }}
    >
      {icon}
    </Box>
    <Typography
      variant="caption"
      color="text.secondary"
      fontWeight={600}
      textAlign="center"
      sx={{ letterSpacing: 0.3, textTransform: 'uppercase', fontSize: '0.68rem' }}
    >
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={700} color="text.primary" textAlign="center" lineHeight={1.2}>
      {value}
    </Typography>
  </Box>
);

// ─── integrity rule row ───────────────────────────────────────────────────────
const RuleRow = ({ icon, title, description }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.5,
      py: 1,
      px: 1.5,
      borderRadius: 2,
      transition: 'background 0.15s',
      '&:hover': { background: 'rgba(21,101,192,0.03)' },
    }}
  >
    <Box
      sx={{
        mt: 0.25,
        width: 34,
        height: 34,
        borderRadius: 2,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(239,68,68,0.1)',
        color: '#EF4444',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
        {description}
      </Typography>
    </Box>
  </Box>
);

// ─── main component ───────────────────────────────────────────────────────────
const ExamInstructions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [agreed, setAgreed] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [enablingFullscreen, setEnablingFullscreen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  // Reuse the same API call that ExamLobby uses
  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ['examDetails', examId],
    queryFn: () => studentApi.getExamDetails(examId),
  });

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStatus, setExamStatus] = useState('LOADING'); // 'LOADING', 'NOT_STARTED', 'AVAILABLE', 'ENDED'

  // ── countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!exam) return;

    const calculateStatus = () => {
      const now = new Date();
      
      // If backend explicitly marked it completed/closed
      if (['COMPLETED', 'CLOSED', 'EVALUATION', 'RESULTS_PUBLISHED'].includes(exam.status)) {
        return { status: 'ENDED', remaining: 0 };
      }
      
      // If end time has passed
      if (exam.endTime && new Date(exam.endTime) <= now) {
        return { status: 'ENDED', remaining: 0 };
      }

      // If start time is in the future
      if (exam.startTime) {
        const start = new Date(exam.startTime);
        if (start > now) {
          return { 
            status: 'NOT_STARTED', 
            remaining: Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000)) 
          };
        }
      }
      
      return { status: 'AVAILABLE', remaining: 0 };
    };

    const updateTimer = () => {
      const { status, remaining } = calculateStatus();
      setExamStatus(status);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
    if (m > 0 || h > 0) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
    parts.push(`${s} second${s !== 1 ? 's' : ''}`);
    
    return parts.join(' ');
  };

  // ── fullscreen tracking ──────────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenEnabled(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ── fullscreen toggle ────────────────────────────────────────────────────
  const handleEnableFullscreen = useCallback(async () => {
    setEnablingFullscreen(true);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }

      if (document.fullscreenElement) {
        setFullscreenEnabled(true);
        enqueueSnackbar('Fullscreen mode enabled.', { variant: 'success' });
      } else {
        enqueueSnackbar('Could not enter fullscreen. Please allow it in your browser settings.', {
          variant: 'warning',
          autoHideDuration: 5000
        });
      }
    } catch (err) {
      console.error('Fullscreen error', err);
      enqueueSnackbar('Fullscreen permission denied. Please enable it to continue.', {
        variant: 'error',
      });
    } finally {
      setEnablingFullscreen(false);
    }
  }, [enqueueSnackbar]);

  // ── proceed to exam directly (bypassing lobby) ───────────────────────
  const handleProceed = useCallback(async () => {
    const requiresFullscreen = exam?.config?.requireFullscreen !== false; // default true
    if (requiresFullscreen && !document.fullscreenElement) {
      setFullscreenEnabled(false);
      enqueueSnackbar('Your exam cannot be started unless fullscreen mode is enabled. Please enter fullscreen again to continue.', { variant: 'error' });
      return;
    }
    if (!agreed) {
      enqueueSnackbar('Please agree to the examination rules before proceeding.', {
        variant: 'error',
      });
      return;
    }

    setStarting(true);
    try {
      setShowLoadingScreen(true);
      // Reuse the imported studentApi from line 139
      const session = await studentApi.startExamSession(examId);

      setTimeout(() => {
        navigate(`/student/exam/${examId}/take/${session.id}`);
      }, 2500);

    } catch (error) {
      console.error("Failed to start exam backend response:", error);
      enqueueSnackbar("Failed to start exam: " + (error.error || error.message || 'Unknown error'), { variant: 'error' });
      setStarting(false);
      setShowLoadingScreen(false);
      if (document.fullscreenElement) {
         document.exitFullscreen().catch(e => console.log(e));
      }
    }
  }, [agreed, exam, examId, navigate, enqueueSnackbar]);

  // ── loading / error states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          background: 'linear-gradient(160deg, #F0F7FF 0%, #F8FAFC 100%)',
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" color="text.secondary" fontWeight={500}>
          Loading examination details…
        </Typography>
      </Box>
    );
  }

  if (isError || !exam) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 4,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          Unable to load examination details. Please go back and try again.
        </Alert>
      </Box>
    );
  }

  if (showLoadingScreen) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #EEF4FF 0%, #F8FAFC 50%, #F0F7FF 100%)',
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h5" sx={{ mt: 4, color: 'primary.main', fontWeight: 600 }}>
          Preparing Secure Examination Environment...
        </Typography>
      </Box>
    );
  }

  const requiresFullscreen = exam?.config?.requireFullscreen !== false;
  const canProceed = agreed && (!requiresFullscreen || fullscreenEnabled) && examStatus === 'AVAILABLE';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EEF4FF 0%, #F8FAFC 50%, #F0F7FF 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        py: { xs: 2, md: 3 },
        px: 2,
      }}
    >
      {/* ── Header / Branding ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 2.5,
        }}
      >
        {/* SRM ExamPortal Logo — inline SVG from favicon.svg */}
        <Box
          component="img"
          src="/favicon.svg"
          alt="ExamPortal Logo"
          sx={{ width: 36, height: 36 }}
        />
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={800}
            color="primary.dark"
            lineHeight={1.1}
            letterSpacing={0.5}
            sx={{ fontFamily: '"Poppins", sans-serif' }}
          >
            SRM ExamPortal
          </Typography>
          <Typography variant="caption" color="text.secondary" letterSpacing={0.3}>
            Secure Online Examination System
          </Typography>
        </Box>
      </Box>

      {/* ── Main Card ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 860,
          background: '#FFFFFF',
          borderRadius: 4,
          boxShadow: '0 8px 40px rgba(21,101,192,0.10), 0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Card Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 60%, #1a237e 100%)',
            px: { xs: 2.5, md: 4 },
            py: { xs: 2, md: 2.5 },
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <Box
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              right: 80,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ShieldAlert size={20} color="rgba(255,255,255,0.8)" />
            <Typography
              variant="overline"
              sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 1.5 }}
            >
              Before You Begin
            </Typography>
          </Box>

          <Typography
            variant="h4"
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontFamily: '"Poppins", sans-serif',
              lineHeight: 1.25,
              mb: 0.75,
              fontSize: { xs: '1.4rem', sm: '1.75rem' },
            }}
          >
            {exam.title}
          </Typography>

          {exam.facultyAssignment?.subject?.name && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
              {exam.facultyAssignment.subject.name}
              {exam.facultyAssignment.subject.code
                ? ` · ${exam.facultyAssignment.subject.code}`
                : ''}
            </Typography>
          )}

          <Chip
            label="Exam Integrity & Instructions"
            size="small"
            sx={{
              mt: 2,
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: 0.5,
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          />
        </Box>

        {/* Card Body */}
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 2, md: 3 } }}>

          {/* ── Exam Stats ──────────────────────────────────────────────── */}
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: 1.2, fontSize: '0.68rem' }}
          >
            Examination Overview
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              mt: 1,
              mb: 2.5,
            }}
          >
            <StatCard
              icon={<Clock size={20} />}
              label="Duration"
              value={`${exam.durationMins} min`}
              accent="#1565C0"
            />
            <StatCard
              icon={<Award size={20} />}
              label="Total Marks"
              value={exam.totalMarks ?? '—'}
              accent="#10B981"
            />
            <StatCard
              icon={<HelpCircle size={20} />}
              label="Questions"
              value={exam.questionCount ?? exam._count?.questions ?? '—'}
              accent="#F59E0B"
            />
            <StatCard
              icon={<FileText size={20} />}
              label="Type"
              value={exam.examType ?? 'MCQ'}
              accent="#8B5CF6"
            />
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          {/* ── Integrity Rules ──────────────────────────────────────────── */}
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ShieldAlert size={18} color="#EF4444" />
              <Typography
                variant="subtitle1"
                fontWeight={700}
                color="text.primary"
                sx={{ fontFamily: '"Poppins", sans-serif' }}
              >
                Exam Integrity & Rules
              </Typography>
            </Box>

            <Box
              sx={{
                border: '1.5px solid rgba(239,68,68,0.18)',
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(239,68,68,0.02)',
              }}
            >
              <RuleRow
                icon={<Camera size={16} />}
                title="No Screenshots or Screen Recording"
                description="Capturing or recording your screen during the exam is strictly prohibited and will result in disqualification."
              />
              <Divider sx={{ mx: 2, borderColor: 'rgba(239,68,68,0.1)' }} />
              <RuleRow
                icon={<Clipboard size={16} />}
                title="No Copy &amp; Paste"
                description="Copying exam content or pasting external text is not allowed. Keyboard shortcuts are monitored."
              />
              <Divider sx={{ mx: 2, borderColor: 'rgba(239,68,68,0.1)' }} />
              <RuleRow
                icon={<Monitor size={16} />}
                title="No Tab or Window Switching"
                description="Switching to another browser tab, window, or application will be logged as a violation. Repeated violations may auto-submit your exam."
              />
              <Divider sx={{ mx: 2, borderColor: 'rgba(239,68,68,0.1)' }} />
              <RuleRow
                icon={<Wifi size={16} />}
                title="No External Resources or Assistance"
                description="Using reference materials, the internet, or receiving help from another person during the exam is a serious academic offence."
              />
              <Divider sx={{ mx: 2, borderColor: 'rgba(239,68,68,0.1)' }} />
              <RuleRow
                icon={<Maximize2 size={16} />}
                title="Fullscreen Mode Required"
                description="Your exam must be taken in fullscreen. Exiting fullscreen will trigger a security violation and may result in automatic submission."
              />
            </Box>
          </Box>

          {/* ── General Instructions ─────────────────────────────────────── */}
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
              border: '1.5px solid rgba(21,101,192,0.12)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle2 size={16} color="#1565C0" />
              <Typography variant="subtitle2" fontWeight={700} color="primary.dark">
                General Instructions
              </Typography>
            </Box>
            {[
              `The timer starts immediately when you enter the exam. You have ${exam.durationMins} minutes to complete it.`,
              'All answers are auto-saved. Do not refresh or close the browser during the exam.',
              'Ensure you have a stable internet connection before starting.',
              'Submit your exam before the timer runs out. The exam auto-submits when time expires.',
              'Results will be available after the faculty completes evaluation.',
            ].map((text, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    mt: 0.6,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          {/* ── Fullscreen Requirement ───────────────────────────────────── */}
          {requiresFullscreen && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 3,
                  border: fullscreenEnabled
                    ? '1.5px solid rgba(16,185,129,0.35)'
                    : '1.5px solid rgba(245,158,11,0.35)',
                  background: fullscreenEnabled
                    ? 'rgba(16,185,129,0.05)'
                    : 'rgba(245,158,11,0.05)',
                  transition: 'all 0.25s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: fullscreenEnabled
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(245,158,11,0.15)',
                      color: fullscreenEnabled ? '#10B981' : '#F59E0B',
                    }}
                  >
                    {fullscreenEnabled ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {fullscreenEnabled ? 'Fullscreen Active' : 'Fullscreen Required'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fullscreenEnabled
                        ? 'Your browser is in fullscreen mode. You are ready to begin.'
                        : 'Click the button to enter fullscreen before starting the exam.'}
                    </Typography>
                  </Box>
                </Box>
                {!fullscreenEnabled && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleEnableFullscreen}
                    disabled={enablingFullscreen}
                    startIcon={
                      enablingFullscreen ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <Maximize2 size={14} />
                      )
                    }
                    sx={{
                      borderColor: '#F59E0B',
                      color: '#F59E0B',
                      fontWeight: 600,
                      '&:hover': { borderColor: '#D97706', bgcolor: 'rgba(245,158,11,0.08)' },
                      flexShrink: 0,
                    }}
                  >
                    {enablingFullscreen ? 'Enabling…' : 'Enable Fullscreen'}
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* ── Agreement Checkbox ───────────────────────────────────────── */}
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              border: agreed
                ? '1.5px solid rgba(16,185,129,0.35)'
                : '1.5px solid rgba(21,101,192,0.18)',
              background: agreed ? 'rgba(16,185,129,0.04)' : 'rgba(21,101,192,0.03)',
              mb: 2,
              transition: 'all 0.25s ease',
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  sx={{
                    color: 'primary.main',
                    '&.Mui-checked': { color: '#10B981' },
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  I have read and agree to the examination rules. I understand that any violation
                  will be recorded and may result in disqualification.
                </Typography>
              }
              sx={{ m: 0, alignItems: 'flex-start' }}
            />
          </Box>

          {/* ── Exam Availability Status ──────────────────────────────────── */}
          {exam && examStatus !== 'LOADING' && (
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: examStatus === 'AVAILABLE' 
                  ? '1.5px solid rgba(16,185,129,0.35)' 
                  : examStatus === 'ENDED' 
                    ? '1.5px solid rgba(239,68,68,0.35)'
                    : '1.5px solid rgba(245,158,11,0.35)',
                background: examStatus === 'AVAILABLE'
                  ? 'rgba(16,185,129,0.04)'
                  : examStatus === 'ENDED'
                    ? 'rgba(239,68,68,0.04)'
                    : 'rgba(245,158,11,0.04)',
                mb: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                flexWrap: 'wrap',
                transition: 'all 0.25s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: examStatus === 'AVAILABLE'
                      ? 'rgba(16,185,129,0.15)'
                      : examStatus === 'ENDED'
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(245,158,11,0.15)',
                    color: examStatus === 'AVAILABLE'
                      ? '#10B981'
                      : examStatus === 'ENDED'
                        ? '#EF4444'
                        : '#F59E0B',
                  }}
                >
                  {examStatus === 'AVAILABLE' ? <CheckCircle2 size={18} /> : examStatus === 'ENDED' ? <AlertTriangle size={18} /> : <Clock size={18} />}
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    {examStatus === 'AVAILABLE' 
                      ? 'Exam is now available' 
                      : examStatus === 'ENDED'
                        ? 'Exam has ended'
                        : `Exam starts at ${new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {examStatus === 'AVAILABLE' 
                      ? 'You can now proceed to start the exam.'
                      : examStatus === 'ENDED'
                        ? 'This exam is no longer accepting new submissions.'
                        : `Starts in ${formatTimeRemaining(timeRemaining)}`
                    }
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* ── CTA Button ──────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              disabled={!canProceed || starting}
              onClick={handleProceed}
              endIcon={!starting && <ArrowRight size={18} />}
              sx={{
                px: 5,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: '"Poppins", sans-serif',
                borderRadius: 3,
                background: canProceed && !starting
                  ? 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)'
                  : undefined,
                boxShadow: canProceed && !starting
                  ? '0 4px 16px rgba(21,101,192,0.35)'
                  : 'none',
                transition: 'all 0.2s ease',
                '&:hover': canProceed && !starting
                  ? {
                      background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                      boxShadow: '0 6px 24px rgba(21,101,192,0.45)',
                      transform: 'translateY(-1px)',
                    }
                  : {},
                '&:active': { transform: 'translateY(0px)' },
              }}
            >
              {starting ? <CircularProgress size={24} color="inherit" /> : 'Agree & Start Exam'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Footer note */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ mt: 2, textAlign: 'center', maxWidth: 600 }}
      >
        By proceeding, you confirm that you are the registered student for this examination and that
        you will adhere to SRM's academic integrity policy.
      </Typography>
    </Box>
  );
};

export default ExamInstructions;
