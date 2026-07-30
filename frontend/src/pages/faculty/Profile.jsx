import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Profile = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Profile</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>This module is under development.</Typography>
      </Paper>
    </Box>
  );
};

export default Profile;
