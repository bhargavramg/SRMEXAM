import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid, Typography, Box, Radio, RadioGroup,
  CircularProgress
} from '@mui/material';
import { Add } from '@mui/icons-material';
import facultyApi from '../../../api/facultyApi';
import { useSnackbar } from 'notistack';

const QuestionDialog = ({ open, onClose, onSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);

  const initialFormState = {
    bankId: '',
    type: 'MCQ',
    text: '',
    marks: 1,
    difficulty: 'MEDIUM',
    categoryId: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      setFormData(initialFormState);
      fetchInitialData();
    }
  }, [open]);

  const fetchInitialData = async () => {
    setFetchingData(true);
    try {
      const [banksRes, categoriesRes] = await Promise.all([
        facultyApi.getQuestionBanks(),
        facultyApi.getCategories()
      ]);
      setBanks(banksRes.data || banksRes);
      setCategories(categoriesRes.data || categoriesRes);
    } catch (error) {
      console.error('Failed to fetch initial data for question dialog', error);
      enqueueSnackbar('Failed to load required data. Please try again.', { variant: 'error' });
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, text) => {
    const newOptions = [...formData.options];
    newOptions[index].text = text;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleCorrectOptionChange = (index) => {
    const newOptions = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async () => {
    if (!formData.bankId) {
      enqueueSnackbar('Please select a Subject / Question Bank', { variant: 'error' });
      return;
    }
    if (!formData.text.trim()) {
      enqueueSnackbar('Question text is required', { variant: 'error' });
      return;
    }
    if (formData.marks <= 0) {
      enqueueSnackbar('Marks must be greater than 0', { variant: 'error' });
      return;
    }

    if (formData.type === 'MCQ') {
      const emptyOption = formData.options.find(o => !o.text.trim());
      if (emptyOption) {
        enqueueSnackbar('All options must be filled for MCQ', { variant: 'error' });
        return;
      }
      const correctOption = formData.options.find(o => o.isCorrect);
      if (!correctOption) {
        enqueueSnackbar('Please select a correct option', { variant: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        bankId: formData.bankId,
        type: formData.type,
        text: formData.text,
        marks: Number(formData.marks),
        difficulty: formData.difficulty,
        categoryId: formData.categoryId || undefined,
        options: formData.type === 'MCQ' ? formData.options : undefined
      };

      await facultyApi.createQuestion(payload);
      enqueueSnackbar('Question created successfully', { variant: 'success' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Create question error:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to create question', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Question</DialogTitle>
      <DialogContent dividers>
        {fetchingData ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Subject / Question Bank */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Subject / Question Bank</InputLabel>
                <Select
                  value={formData.bankId}
                  label="Subject / Question Bank"
                  onChange={(e) => handleChange('bankId', e.target.value)}
                >
                  {banks.map((bank) => (
                    <MenuItem key={bank.id} value={bank.id}>
                      {bank.name} ({bank.subject?.name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Question Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Question Type"
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <MenuItem value="MCQ">MCQ</MenuItem>
                  <MenuItem value="THEORY">THEORY</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Question Text */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Question Text"
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
              />
            </Grid>

            {/* Marks & Difficulty */}
            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                type="number"
                label="Marks"
                inputProps={{ min: 0.5, step: 0.5 }}
                value={formData.marks}
                onChange={(e) => handleChange('marks', parseFloat(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty}
                  label="Difficulty"
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                >
                  <MenuItem value="EASY">Easy</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HARD">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Category */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Category (Optional)</InputLabel>
                <Select
                  value={formData.categoryId}
                  label="Category (Optional)"
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Options (MCQ ONLY) */}
            {formData.type === 'MCQ' && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Options (Select correct answer)
                </Typography>
                <RadioGroup
                  value={formData.options.findIndex(o => o.isCorrect)}
                  onChange={(e) => handleCorrectOptionChange(parseInt(e.target.value))}
                >
                  <Grid container spacing={2}>
                    {formData.options.map((option, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Box display="flex" alignItems="center">
                          <Radio value={index} color="primary" />
                          <TextField
                            fullWidth
                            size="small"
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            error={!option.text.trim()}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading || fetchingData}
          startIcon={loading ? <CircularProgress size={20} /> : <Add />}
        >
          {loading ? 'Saving...' : 'Add Question'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionDialog;
