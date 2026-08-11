import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem, Grid, CircularProgress, Box
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminApi from '../../../api/adminApi';
import { useSnackbar } from 'notistack';

const AddSectionModal = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    semesterId: '',
    name: '',
    capacity: 60
  });

  const { data: semesters = [], isLoading: isLoadingSemesters } = useQuery({
    queryKey: ['adminSemesters'],
    queryFn: () => adminApi.getSemesters()
  });

  const createSectionMutation = useMutation({
    mutationFn: (data) => adminApi.createSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminSections']);
      handleClose();
    },
    onError: (err) => {
      enqueueSnackbar(err.error || 'Failed to create section', { variant: 'error' });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setFormData({ semesterId: '', name: '', capacity: 60 });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createSectionMutation.mutate({
      ...formData,
      capacity: parseInt(formData.capacity, 10)
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Section</DialogTitle>
        <DialogContent dividers>
          {isLoadingSemesters ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    name="semesterId"
                    value={formData.semesterId}
                    onChange={handleChange}
                    label="Semester"
                  >
                    {semesters.map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        Semester {s.semesterNumber} - {s.course?.name} ({s.academicYear?.name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Section Name (e.g. A, B)"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8f9fa' }}>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!formData.semesterId || !formData.name || createSectionMutation.isLoading}
          >
            {createSectionMutation.isLoading ? 'Creating...' : 'Create Section'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddSectionModal;
