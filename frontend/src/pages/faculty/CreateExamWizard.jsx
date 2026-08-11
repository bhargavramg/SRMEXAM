import React, { useState, useCallback } from 'react';
import {
  Box, Grid, Typography, Stepper, Step, StepLabel, Button,
  Card, CardContent, Paper, Chip, Stack, Alert,
  FormControlLabel, Switch, RadioGroup, Radio, FormControl,
  FormLabel, Divider,
} from '@mui/material';
import {
  ArrowBack, ArrowForward, SaveOutlined,
  QuizOutlined, ScheduleOutlined, LibraryBooksOutlined,
  SettingsOutlined, CheckCircleOutlined, Delete,
} from '@mui/icons-material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput, FormSelect } from '../../components/forms';
import { DataTable } from '../../components/tables';
import { SuccessDialog } from '../../components/dialogs';
import PageHeader from '../../components/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import facultyApi from '../../api/facultyApi';
import { useNavigate } from 'react-router-dom';
import StudentAssignmentStep from './components/StudentAssignmentStep';
import { useSnackbar } from 'notistack';

const steps = ['Exam Details', 'Schedule', 'Questions', 'Configuration', 'Student Assignment', 'Review'];

const examSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  instructions: z.string().max(500, 'Instructions too long').optional(),
  facultyAssignmentId: z.string().min(1, 'Please select an assignment'),
  totalMarks: z.coerce.number().min(1, 'Total marks must be at least 1').max(500, 'Total marks cannot exceed 500'),
  passingMarks: z.coerce.number().min(1, 'Passing marks must be at least 1'),
  durationMins: z.coerce.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 480 minutes'),
  negativeMarking: z.boolean().default(false),
  negativeMarkValue: z.coerce.number().min(0).default(0),
  randomQuestions: z.boolean().default(true),
  randomOptions: z.boolean().default(true),
  showResult: z.enum(['immediately', 'after_end', 'manual']),
  requireFullscreen: z.boolean().default(true),
  requireCamera: z.boolean().default(false),
  maxWarnings: z.coerce.number().min(0).default(3),
  startTime: z.any().optional(),
  endTime: z.any().optional(),
  selectedQuestions: z.array(z.any()).min(1, 'Select at least one question'),
});

const CreateExamWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      instructions: '',
      facultyAssignmentId: '',
      totalMarks: 100,
      passingMarks: 40,
      durationMins: 60,
      negativeMarking: false,
      negativeMarkValue: 0,
      randomQuestions: true,
      randomOptions: true,
      showResult: 'manual',
      requireFullscreen: true,
      requireCamera: false,
      maxWarnings: 3,
      startTime: null,
      endTime: null,
      selectedQuestions: [],
    },
  });

  const { control, handleSubmit, trigger, watch, setValue, getValues } = methods;
  const formValues = watch();
  const selectedQuestions = useWatch({ control, name: 'selectedQuestions' });

  const { data: assignments = [] } = useQuery({
    queryKey: ['myAssignments'],
    queryFn: () => facultyApi.getMyAssignments()
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['myQuestions'],
    queryFn: () => facultyApi.getQuestions()
  });

  const assignmentOptions = assignments.map(a => ({
    value: a.id,
    label: a.subject?.name || 'Unknown Subject',
    subtitle: `${a.assessmentType?.name || 'N/A'} • ${a.academicYear?.name || 'N/A'}`
  }));

  const createExamMutation = useMutation({
    mutationFn: (data) => facultyApi.createExam(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['exams']);
      setSuccessDialogOpen(true);
    },
    onError: (err) => {
      enqueueSnackbar("Failed to create exam: " + (err.error || err.message || 'Unknown error'), { variant: 'error' });
    }
  });

  const canProceed = useCallback(async () => {
    let fieldsToValidate = [];
    switch (activeStep) {
      case 0: fieldsToValidate = ['title', 'instructions', 'facultyAssignmentId', 'totalMarks', 'passingMarks']; break;
      case 1: fieldsToValidate = ['durationMins']; break;
      case 2: fieldsToValidate = ['selectedQuestions']; break;
      case 3: fieldsToValidate = ['negativeMarking', 'negativeMarkValue', 'showResult']; break;
      default: return true;
    }
    const result = await trigger(fieldsToValidate);
    return result;
  }, [activeStep, trigger]);

  const handleNext = async () => {
    const isStepValid = await canProceed();
    if (isStepValid) {
      setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSaveDraft = () => {
    const data = getValues();
    const payload = {
      title: data.title || 'Untitled Exam',
      facultyAssignmentId: data.facultyAssignmentId || undefined,
      durationMins: data.durationMins || 60,
      passingMarks: data.passingMarks || 40,
      totalMarks: data.totalMarks || 100,
      instructions: data.instructions || undefined,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      questionIds: data.selectedQuestions?.map(q => q.id) || [],
      assignedStudentIds: selectedStudents.map(s => s.id),
      config: {
        randomQuestions: data.randomQuestions ?? true,
        randomOptions: data.randomOptions ?? true,
        requireFullscreen: data.requireFullscreen ?? true,
        maxWarnings: data.maxWarnings ?? 3,
      }
    };
    console.log("Create Exam Payload (Draft):", payload);
    createExamMutation.mutate(payload);
  };

  const onSubmit = (data) => {
    const payload = {
      title: data.title,
      facultyAssignmentId: data.facultyAssignmentId,
      durationMins: data.durationMins,
      passingMarks: data.passingMarks,
      totalMarks: data.totalMarks,
      instructions: data.instructions,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      questionIds: data.selectedQuestions.map(q => q.id),
      assignedStudentIds: selectedStudents.map(s => s.id),
      config: {
        randomQuestions: data.randomQuestions,
        randomOptions: data.randomOptions,
        requireFullscreen: data.requireFullscreen,
        maxWarnings: data.maxWarnings,
      }
    };
    console.log("Create Exam Payload:", payload);
    createExamMutation.mutate(payload);
  };

  const handleQuestionSelect = (ids) => {
    const selected = questions.filter((q) => ids.includes(q.id));
    setValue('selectedQuestions', selected, { shouldValidate: true });
  };

  const removeSelectedQuestion = (id) => {
    const updated = selectedQuestions.filter((q) => q.id !== id);
    setValue('selectedQuestions', updated, { shouldValidate: true });
  };

  const totalSelectedMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);

  const renderAssignmentValue = (selectedId) => {
    const opt = assignmentOptions.find(o => o.value === selectedId);
    if (!opt) return <Typography variant="body2" color="text.secondary">Select assignment</Typography>;
    return (
      <Box>
        <Typography variant="body2" fontWeight={500} lineHeight={1.3}>{opt.label}</Typography>
        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.3}>{opt.subtitle}</Typography>
      </Box>
    );
  };

  const renderAssignmentOption = (opt) => (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="body2" fontWeight={500}>{opt.label}</Typography>
      <Typography variant="caption" color="text.secondary">{opt.subtitle}</Typography>
    </Box>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormInput
                name="title"
                control={control}
                label="Exam Title"
                required
                placeholder="e.g., Mid-Term Examination - DBMS"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect
                name="facultyAssignmentId"
                control={control}
                label="Faculty Assignment"
                options={assignmentOptions}
                required
                placeholder="Select assignment"
                renderValue={renderAssignmentValue}
                renderOption={renderAssignmentOption}
              />
            </Grid>
            <Grid item xs={12}>
              <FormInput
                name="instructions"
                control={control}
                label="Instructions"
                multiline
                rows={3}
                placeholder="Provide instructions for students taking this exam"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormInput
                name="totalMarks"
                control={control}
                label="Total Marks"
                type="number"
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormInput
                name="passingMarks"
                control={control}
                label="Passing Marks"
                type="number"
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormInput
                name="durationMins"
                control={control}
                label="Duration (minutes)"
                type="number"
                required
                helperText="Max 480 mins"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormInput
                name="startTime"
                control={control}
                label="Start Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormInput
                name="endTime"
                control={control}
                label="End Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>Leave start/end time empty if you want to publish it manually later.</Alert>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select questions from the bank. Total selected marks: <strong>{totalSelectedMarks}</strong> / {formValues.totalMarks}
            </Alert>
            {totalSelectedMarks > formValues.totalMarks && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Total selected marks ({totalSelectedMarks}) exceed the exam total marks ({formValues.totalMarks}). Please adjust.
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <DataTable
                  rows={questions}
                  columns={[
                    { field: 'text', headerName: 'Question', flex: 2, minWidth: 200 },
                    { field: 'bank', headerName: 'Bank', width: 140, renderCell: ({ row }) => row.bank?.name },
                    { field: 'difficulty', headerName: 'Difficulty', width: 100 },
                    { field: 'marks', headerName: 'Marks', width: 80, align: 'center', headerAlign: 'center' },
                  ]}
                  checkboxSelection
                  rowSelectionModel={selectedQuestions.map(q => q.id)}
                  onRowSelectionChange={(ids) => handleQuestionSelect(ids)}
                  getRowId={(row) => row.id}
                  height={400}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, fontSize: 14 }}>Selected Questions ({selectedQuestions.length})</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 360, overflow: 'auto', borderRadius: 1.5 }}>
                  {selectedQuestions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No questions selected.</Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {selectedQuestions.map((q) => (
                        <Box key={q.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontSize: 13 }}>{q.text}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              <Chip label={q.marks + ' marks'} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </Box>
                          </Box>
                          <IconButton size="small" color="error" onClick={() => removeSelectedQuestion(q.id)}><Delete fontSize="small" /></IconButton>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: 14 }}>Question Display</Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formValues.randomQuestions} onChange={(e) => setValue('randomQuestions', e.target.checked)} />} label="Shuffle Questions" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formValues.randomOptions} onChange={(e) => setValue('randomOptions', e.target.checked)} />} label="Shuffle Options" />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: 14 }}>Result & Review</Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <FormControl>
                <FormLabel sx={{ fontSize: 14, fontWeight: 500 }}>Show Result</FormLabel>
                <RadioGroup value={formValues.showResult} onChange={(e) => setValue('showResult', e.target.value)}>
                  <FormControlLabel value="immediately" control={<Radio />} label="Immediately after submission" />
                  <FormControlLabel value="after_end" control={<Radio />} label="After exam end time" />
                  <FormControlLabel value="manual" control={<Radio />} label="Manual release by faculty" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: 14 }}>Proctoring & Security</Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formValues.requireFullscreen} onChange={(e) => setValue('requireFullscreen', e.target.checked)} />} label="Require Full Screen Mode" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formValues.requireCamera} onChange={(e) => setValue('requireCamera', e.target.checked)} />} label="Require Camera (Proctoring)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormInput
                name="maxWarnings"
                control={control}
                label="Max Warnings Before Auto-Submit"
                type="number"
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
          </Grid>
        );

      case 4:
        return (
          <StudentAssignmentStep
            assignmentId={formValues.facultyAssignmentId}
            selectedStudents={selectedStudents}
            setSelectedStudents={setSelectedStudents}
          />
        );

      case 5:
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>Review your exam configuration before saving.</Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      <QuizOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />Exam Details
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <ReviewItem label="Title" value={formValues.title} />
                      <ReviewItem label="Total Marks" value={formValues.totalMarks} />
                      <ReviewItem label="Passing Marks" value={formValues.passingMarks} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      <ScheduleOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />Schedule
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <ReviewItem label="Duration" value={`${formValues.durationMins} minutes`} />
                      <ReviewItem label="Start Time" value={formValues.startTime || 'Not set'} />
                      <ReviewItem label="End Time" value={formValues.endTime || 'Not set'} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      <LibraryBooksOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />Questions & Students
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <ReviewItem label="Total Questions" value={selectedQuestions.length} />
                      <ReviewItem label="Total Marks" value={totalSelectedMarks} />
                      <ReviewItem label="Assigned Students" value={selectedStudents.length > 0 ? selectedStudents.length : 'All (Legacy fallback if none)'} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 1.5 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      <SettingsOutlined sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />Configuration
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <ReviewItem label="Proctoring" value={formValues.requireFullscreen ? 'Enabled' : 'Disabled'} />
                      <ReviewItem label="Camera" value={formValues.requireCamera ? 'Required' : 'Not required'} />
                      <ReviewItem label="Result Display" value={formValues.showResult === 'immediately' ? 'Immediately' : formValues.showResult === 'after_end' ? 'After end time' : 'Manual release'} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  const isLastStep = activeStep === steps.length - 1;

  return (
    <Box>
      <PageHeader
        title="Create Exam"
        subtitle="Set up a new examination"
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Create Exam' }]}
        titleSize={36}
      />
      <Card sx={{ mb: 2, borderRadius: 1.5, overflow: 'hidden' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: 13, fontWeight: 500 }, '& .MuiStep-root': { py: 0 }, '& .MuiStepLabel-iconContainer': { pr: 0.5 } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>
      <Card sx={{ borderRadius: 1.5 }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<ArrowBack />}
                variant="outlined"
                size="medium"
              >
                Back
              </Button>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  onClick={handleSaveDraft}
                  variant="outlined"
                  color="inherit"
                  startIcon={<SaveOutlined />}
                  size="medium"
                  disabled={createExamMutation.isPending}
                  sx={{ borderColor: 'text.secondary', color: 'text.secondary', '&:hover': { borderColor: 'text.primary', color: 'text.primary' } }}
                >
                  Save Draft
                </Button>
                {isLastStep ? (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={createExamMutation.isPending}
                    endIcon={createExamMutation.isPending ? null : <CheckCircleOutlined />}
                    size="medium"
                  >
                    {createExamMutation.isPending ? 'Creating...' : 'Create Exam'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    endIcon={<ArrowForward />}
                    size="medium"
                  >
                    Continue
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
      <SuccessDialog
        open={successDialogOpen}
        onClose={() => { setSuccessDialogOpen(false); navigate('/faculty/exams'); }}
        title="Exam Created!"
        message="Your exam has been created successfully as a DRAFT. You can publish it from the Exams page."
        buttonLabel="View Exams"
      />
    </Box>
  );
};

const ReviewItem = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{label}</Typography>
    <Typography variant="body2" fontWeight={500} sx={{ fontSize: 13 }}>{value}</Typography>
  </Box>
);

const IconButton = ({ size, color, onClick, children }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      bgcolor: 'transparent',
      cursor: 'pointer',
      p: 0.5,
      borderRadius: 1,
      color: 'error.main',
      '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' },
      lineHeight: 1,
    }}
  >
    {children}
  </Box>
);

export default CreateExamWizard;
