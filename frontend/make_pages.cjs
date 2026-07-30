const fs = require('fs');
const pages = [
  'Dashboard', 'QuestionBank', 'CreateExamWizard', 'ManageExams',
  'QuestionCategories', 'StudentResults', 'LiveMonitoring',
  'ExamSchedule', 'Reports', 'Notifications', 'Profile', 'Settings'
];

pages.forEach(p => {
  const content = `import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const ${p} = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>${p.replace(/([A-Z])/g, ' $1').trim()}</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>This module is under development.</Typography>
      </Paper>
    </Box>
  );
};

export default ${p};
`;
  fs.writeFileSync('src/pages/faculty/' + p + '.jsx', content);
});

console.log('Created ' + pages.length + ' page shells');
