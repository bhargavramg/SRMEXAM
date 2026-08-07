import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, Grid, Box
} from '@mui/material';

const AddStudentModal = ({ open, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    register_no: '',
    phone: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const resetState = () => {
    setFormData({ name: '', email: '', register_no: '', phone: '', password: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={resetState} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Student</DialogTitle>
      <DialogContent dividers>
        <Box component="form" sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Register Number"
                name="register_no"
                value={formData.register_no}
                onChange={handleChange}
                placeholder="e.g. RA20110"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@srmist.edu.in"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mobile Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank for auto-generate"
                helperText="Default: password123"
              />
            </Grid>
            {/* Note: Department, Course, Semester etc. can be assigned via enrollment later or added here if lists are provided */}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetState} disabled={isLoading}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!formData.name || !formData.email || !formData.register_no || isLoading}>
          Create Student
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStudentModal;
