import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>This module is under development.</Typography>
      </Paper>
    </Box>
  );
};

export default Settings;
