import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { ArrowForwardIos } from '@mui/icons-material';

const ActionCard = ({ title, description, icon, onClick, color = 'primary' }) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 40px rgba(21, 101, 192, 0.12)',
        },
        bgcolor: `${color}.main`,
        color: `${color}.contrastText`,
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {icon && (
              <Box sx={{ display: 'flex' }}>
                {icon}
              </Box>
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} color="inherit">
                {title}
              </Typography>
              {description && (
                <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
                  {description}
                </Typography>
              )}
            </Box>
          </Box>
          <ArrowForwardIos sx={{ opacity: 0.7, fontSize: 18 }} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActionCard;
