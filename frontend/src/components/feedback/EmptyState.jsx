import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

const EmptyState = ({ title = 'No data found', message = 'There are no items to display.', actionLabel, onAction, icon, size = 'medium' }) => {
  const iconSize = size === 'large' ? 96 : size === 'small' ? 48 : 64;
  const fontSize = size === 'large' ? 'h5' : size === 'small' ? 'body1' : 'h6';

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
      <Box sx={{ color: 'text.disabled', mb: 2 }}>
        {icon || <InboxOutlined sx={{ fontSize: iconSize }} />}
      </Box>
      <Typography variant={fontSize} fontWeight={600} color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: actionLabel ? 3 : 0 }}>
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
