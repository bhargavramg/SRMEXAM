import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { AlertCircle as ErrorOutline } from 'lucide-react';

const ErrorState = ({ title = 'Something went wrong', message = 'An error occurred while loading data.', onRetry, error, size = 'medium' }) => {
  const iconSize = size === 'large' ? 96 : size === 'small' ? 48 : 64;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: size === 'large' ? 8 : 4,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Box sx={{ color: 'error.main', mb: 2 }}>
        <ErrorOutline sx={{ fontSize: iconSize }} />
      </Box>
      <Typography variant={size === 'large' ? 'h5' : 'h6'} fontWeight={600} color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mb: onRetry ? 3 : 0 }}>
        {message}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ maxWidth: 500, mb: 2, textAlign: 'left', width: '100%' }}>
          {typeof error === 'string' ? error : error.message || 'Unknown error'}
        </Alert>
      )}
      {onRetry && (
        <Button variant="contained" color="primary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Box>
  );
};

export default ErrorState;
