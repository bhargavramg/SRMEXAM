import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../../../api/adminApi';

const AssignSubjectModal = ({ open, onClose, facultyId }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    academicYearId: '',
    subjectId: '',
    assessmentTypeId: ''
  });

  const { data: academicYears = [], isLoading: isLoadingAY } = useQuery({
    queryKey: ['adminAcademicYears'],
    queryFn: () => adminApi.getAcademicYears()
  });

  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['adminSubjects'],
    queryFn: () => adminApi.getSubjects()
  });

  const { data: assessmentTypes = [], isLoading: isLoadingAT } = useQuery({
    queryKey: ['adminAssessmentTypes'],
    queryFn: () => adminApi.getAssessmentTypes()
  });

  const isLoading = isLoadingAY || isLoadingSubjects || isLoadingAT;

  const assignMutation = useMutation({
    mutationFn: (data) => adminApi.createFacultyAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminFacultyDetails', facultyId]);
      queryClient.invalidateQueries(['adminFacultyAssignments']);
      setFormData({ academicYearId: '', subjectId: '', assessmentTypeId: '' });
      onClose();
    },
    onError: (error) => {
      alert(error.response?.data?.error || error.message || 'Failed to assign subject');
    }
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!formData.subjectId || !formData.assessmentTypeId) {
      alert('Please fill all required fields');
      return;
    }
    assignMutation.mutate({
      facultyId,
      ...formData
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Subject to Faculty</DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
              <FormControl fullWidth size="medium">
                <InputLabel>Academic Year (Optional)</InputLabel>
                <Select
                  name="academicYearId"
                  value={formData.academicYearId}
                  label="Academic Year (Optional)"
                  onChange={handleChange}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {academicYears.map(ay => (
                    <MenuItem key={ay.id} value={ay.id}>{ay.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="medium" required>
                <InputLabel>Subject</InputLabel>
                <Select
                  name="subjectId"
                  value={formData.subjectId}
                  label="Subject"
                  onChange={handleChange}
                >
                  {subjects.map(sub => (
                    <MenuItem key={sub.id} value={sub.id}>{sub.name} ({sub.code})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="medium" required>
                <InputLabel>Assessment Type</InputLabel>
                <Select
                  name="assessmentTypeId"
                  value={formData.assessmentTypeId}
                  label="Assessment Type"
                  onChange={handleChange}
                >
                  {assessmentTypes.map(at => (
                    <MenuItem key={at.id} value={at.id}>{at.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || assignMutation.isLoading}
        >
          {assignMutation.isLoading ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignSubjectModal;
