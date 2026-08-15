import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, Divider, Card, CardContent,
  FormControlLabel, Tooltip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  IndeterminateCheckBox as IndeterminateCheckBoxIcon,
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Replay as ReplayIcon,
  School as SchoolIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import facultyApi from '../../api/facultyApi';
import { useSnackbar } from 'notistack';
import PageHeader from '../../components/PageHeader';

// ─── Exam Summary Strip ───────────────────────────────────────────────────────
const ExamSummaryCard = ({ exam }) => {
  if (!exam) return null;
  const subject = exam.facultyAssignment?.subject;
  return (
    <Card sx={{ mb: 3, border: '1.5px solid', borderColor: 'primary.light', borderRadius: 3 }}>
      <CardContent sx={{ py: 2, px: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
        <Box sx={{ flex: '1 1 200px' }}>
          <Typography variant="overline" color="text.secondary" fontSize="0.65rem" letterSpacing={1}>
            Exam to Republish
          </Typography>
          <Typography variant="h6" fontWeight={700} color="primary.dark" noWrap>
            {exam.title}
          </Typography>
          {subject && (
            <Typography variant="body2" color="text.secondary">
              {subject.name} {subject.code ? `(${subject.code})` : ''}
            </Typography>
          )}
        </Box>
        {[
          { label: 'Duration', value: `${exam.durationMins} min` },
          { label: 'Total Marks', value: exam.totalMarks },
          { label: 'Questions', value: exam._count?.examQuestions ?? '—' },
          { label: 'Status', value: exam.status },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ textAlign: 'center', minWidth: 80 }}>
            <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} textTransform="uppercase" fontSize="0.65rem" letterSpacing={0.5}>
              {label}
            </Typography>
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {value}
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RepublishExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch exam details (reuse existing endpoint)
  const { data: exam, isLoading: loadingExam, isError: examError } = useQuery({
    queryKey: ['examDetail', examId],
    queryFn: () => facultyApi.getExam(examId),
  });

  // Fetch eligible students from new endpoint
  const { data: students = [], isLoading: loadingStudents, isError: studentsError, refetch: refetchStudents } = useQuery({
    queryKey: ['examEligibleStudents', examId],
    queryFn: () => facultyApi.getExamEligibleStudents(examId),
    enabled: !!examId,
  });

  // Republish mutation
  const republishMutation = useMutation({
    mutationFn: (data) => facultyApi.republishExam(examId, data),
    onSuccess: (data) => {
      enqueueSnackbar(data.message || 'Exam republished successfully!', { variant: 'success' });
      queryClient.invalidateQueries(['exams']);
      queryClient.invalidateQueries(['examEligibleStudents', examId]);
      navigate('/faculty/exams');
    },
    onError: (err) => {
      enqueueSnackbar(
        'Republish failed: ' + (err.response?.data?.error || err.message || 'Unknown error'),
        { variant: 'error' }
      );
    },
  });

  // ── Derived / filtered list ────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!searchText.trim()) return students;
    const q = searchText.toLowerCase();
    return students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.register_no?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [students, searchText]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allVisibleIds = filteredStudents.map(s => s.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
  const someSelected = allVisibleIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allVisibleIds.forEach(id => next.delete(id));
      } else {
        allVisibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearAll = () => setSelectedIds(new Set());

  const selectAll = () => setSelectedIds(new Set(students.map(s => s.id)));

  // ── Confirm & submit ───────────────────────────────────────────────────────
  const handleRepublish = () => {
    if (selectedIds.size === 0) {
      enqueueSnackbar('Please select at least one student.', { variant: 'warning' });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmRepublish = () => {
    setConfirmOpen(false);
    republishMutation.mutate({ studentIds: Array.from(selectedIds) });
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loadingExam || loadingStudents) {
    return (
      <Box>
        <LinearProgress />
        <Box sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Loading exam and student data…
          </Typography>
        </Box>
      </Box>
    );
  }

  if (examError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load exam details. Please go back and try again.</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/faculty/exams')} sx={{ mt: 2 }}>
          Back to Manage Exams
        </Button>
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Republish Exam"
        subtitle="Select students to republish this exam to. Existing assignments are preserved."
        breadcrumbs={[
          { label: 'Faculty' },
          { label: 'Manage Exams', href: '/faculty/exams' },
          { label: 'Republish' }
        ]}
        action={
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => navigate('/faculty/exams')}
            size="small"
          >
            Back to Manage Exams
          </Button>
        }
      />

      {/* Exam summary strip */}
      <ExamSummaryCard exam={exam} />

      {/* Student selection panel */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Toolbar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              px: 3,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PeopleIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>
                Select Students
              </Typography>
              <Chip
                label={`${selectedIds.size} selected`}
                size="small"
                color={selectedIds.size > 0 ? 'primary' : 'default'}
                icon={selectedIds.size > 0 ? <CheckCircleIcon /> : undefined}
              />
              {students.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {students.length} eligible student{students.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button size="small" onClick={selectAll} disabled={students.length === 0}>
                Select All
              </Button>
              <Button size="small" onClick={clearAll} disabled={selectedIds.size === 0} color="inherit">
                Clear All
              </Button>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <TextField
                size="small"
                placeholder="Search by name, reg. no., or email…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260 }}
              />
            </Box>
          </Box>

          {/* Student errors */}
          {studentsError && (
            <Alert severity="warning" sx={{ m: 2 }} action={
              <Button size="small" onClick={refetchStudents}>Retry</Button>
            }>
              Could not load students. Make sure students are enrolled in your assignments.
            </Alert>
          )}

          {/* Empty state */}
          {!studentsError && students.length === 0 && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={600}>
                No students found
              </Typography>
              <Typography variant="body2" color="text.disabled" mt={0.5}>
                There are no students enrolled in any of your assignments. Add students first from Student Management.
              </Typography>
            </Box>
          )}

          {/* Table */}
          {students.length > 0 && (
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                      <Checkbox
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={toggleAll}
                        icon={<CheckBoxBlankIcon />}
                        checkedIcon={<CheckBoxIcon />}
                        indeterminateIcon={<IndeterminateCheckBoxIcon />}
                        disabled={filteredStudents.length === 0}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Register No.
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Student Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Email
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }} align="center">
                      Already Assigned
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.disabled">No students match your search.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map(student => {
                      const isSelected = selectedIds.has(student.id);
                      return (
                        <TableRow
                          key={student.id}
                          hover
                          selected={isSelected}
                          onClick={() => toggleOne(student.id)}
                          sx={{
                            cursor: 'pointer',
                            '&.Mui-selected': { bgcolor: 'rgba(21,101,192,0.06)' },
                            '&.Mui-selected:hover': { bgcolor: 'rgba(21,101,192,0.10)' },
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleOne(student.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BadgeIcon fontSize="inherit" color="action" sx={{ fontSize: 14 }} />
                              <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                {student.register_no || '—'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {student.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon fontSize="inherit" color="action" sx={{ fontSize: 14 }} />
                              <Typography variant="body2" color="text.secondary">
                                {student.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={student.status}
                              size="small"
                              color={student.status === 'ACTIVE' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {student.alreadyAssigned ? (
                              <Tooltip title="Already assigned to this exam">
                                <Chip label="Assigned" size="small" color="info" variant="outlined" />
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Footer actions */}
          {students.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Students already assigned will <strong>not</strong> be duplicated. New students receive a notification.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  republishMutation.isPending
                    ? <CircularProgress size={18} color="inherit" />
                    : <ReplayIcon />
                }
                onClick={handleRepublish}
                disabled={selectedIds.size === 0 || republishMutation.isPending}
                sx={{
                  px: 4,
                  background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)' },
                  '&:disabled': { background: undefined },
                }}
              >
                Republish to {selectedIds.size > 0 ? `${selectedIds.size} Selected Student${selectedIds.size !== 1 ? 's' : ''}` : 'Selected Students'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReplayIcon color="primary" />
            Confirm Republish
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Republish <strong>"{exam?.title}"</strong> to{' '}
            <strong>{selectedIds.size} selected student{selectedIds.size !== 1 ? 's' : ''}</strong>?
          </DialogContentText>
          <Box
            component="ul"
            sx={{ mt: 2, pl: 2.5, color: 'text.secondary', fontSize: '0.875rem', lineHeight: 2 }}
          >
            <li>The exam questions, marks, duration and config are preserved.</li>
            <li>Students already assigned will NOT get duplicate assignments.</li>
            <li>Newly assigned students will receive an exam notification.</li>
            <li>Students NOT selected are not affected.</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmRepublish}
            startIcon={<ReplayIcon />}
            disabled={republishMutation.isPending}
          >
            Yes, Republish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RepublishExam;
