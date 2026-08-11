import React, { useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Grid, MenuItem, CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import adminApi from '../../../api/adminApi';
import { useSnackbar } from 'notistack';

const FacultyDialogs = ({ open, type, data, onClose }) => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = type === 'edit';

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      employeeId: '',
      phone: '',
      departmentId: '',
      password: ''
    }
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => adminApi.getDepartments().then(res => res.data),
    enabled: open
  });

  useEffect(() => {
    if (open) {
      if (isEdit && data) {
        reset({
          name: data.name || '',
          email: data.email || '',
          employeeId: data.employeeId || '',
          phone: data.phone || '',
          departmentId: data.departmentId || ''
        });
      } else {
        reset({
          name: '', email: '', employeeId: '', phone: '', departmentId: '', password: ''
        });
      }
    }
  }, [open, isEdit, data, reset]);

  const mutation = useMutation({
    mutationFn: (formData) => {
      if (isEdit) {
        return adminApi.updateFaculty(data.id, formData);
      }
      return adminApi.createFaculty(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminFaculty']);
      enqueueSnackbar(isEdit ? 'Faculty updated successfully' : 'Faculty created successfully', { variant: 'success' });
      onClose();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.error || 'An error occurred', { variant: 'error' });
    }
  });

  const onSubmit = (formData) => {
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Faculty' : 'Add New Faculty'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Full Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="employeeId"
                control={control}
                rules={{ required: 'Employee ID is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Employee ID"
                    fullWidth
                    disabled={isEdit}
                    error={!!errors.employeeId}
                    helperText={errors.employeeId?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                rules={{ 
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Address"
                    type="email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="departmentId"
                control={control}
                rules={{ required: 'Department is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Department"
                    fullWidth
                    error={!!errors.departmentId}
                    helperText={errors.departmentId?.message}
                  >
                    <MenuItem value=""><em>Select Department</em></MenuItem>
                    {departments?.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            {!isEdit && (
              <Grid item xs={12}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password (Optional)"
                      type="password"
                      fullWidth
                      helperText="If left blank, Employee ID will be used as the default password"
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={mutation.isPending}
            startIcon={mutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {isEdit ? 'Save Changes' : 'Add Faculty'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FacultyDialogs;
