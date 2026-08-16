import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

export default function StudentSettings() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
        Settings
      </Typography>
      <Card sx={{ p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 3 }}>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            This module is under development.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
