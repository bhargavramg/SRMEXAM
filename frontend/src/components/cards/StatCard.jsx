import React from 'react';
import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StatCard = ({ title, value, icon, trend, trendLabel, color = 'primary', subtitle, onClick }) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 8px 40px rgba(21, 101, 192, 0.12)' } : {},
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2, mb: subtitle ? 0.5 : 0 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Chip
                size="small"
                icon={trend >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                label={`${trend >= 0 ? '+' : ''}${trend}% ${trendLabel || 'vs last month'}`}
                color={trend >= 0 ? 'success' : 'error'}
                variant="outlined"
                sx={{ mt: 1, height: 24, fontSize: '0.7rem', fontWeight: 600 }}
              />
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: `${color}.main`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                ml: 2,
                opacity: 0.9,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
