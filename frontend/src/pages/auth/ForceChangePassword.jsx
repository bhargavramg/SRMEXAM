import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const ForceChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 64) {
      setError('New password must be between 8 and 64 characters');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }
    if (user?.register_no && newPassword === user.register_no) {
      setError('New password cannot be the same as your Register Number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axiosClient.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      enqueueSnackbar('Password updated successfully. Please log in again.', { variant: 'success' });
      
      // Clear the current authentication/session state
      logout();
      
      // Redirect to the login page automatically
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.error || err.message || 'Failed to change password. Check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" color="primary" fontWeight="bold">
            Action Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            For security reasons, you must change your default password before accessing your account.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Current Password (Register Number)"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Minimum 8 characters"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password & Continue'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default ForceChangePassword;
