import React from 'react';
import { Card, CardContent, CardHeader, Box, useTheme } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const BarChartCard = ({ title, subtitle, data, dataKey, xKey, height = 300, colors, action, stacked = false }) => {
  const theme = useTheme();
  const defaultColors = colors || [theme.palette.primary.main, theme.palette.secondary?.main || '#82ca9d', '#ffc658'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Box>
          {payload.map((entry, index) => (
            <Box key={index} sx={{ color: entry.color, fontSize: '0.85rem' }}>
              {entry.name}: {entry.value}
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader
        title={title}
        subheader={subtitle}
        action={action}
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        subheaderTypographyProps={{ variant: 'body2' }}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey={xKey || 'name'} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            {stacked && <Legend />}
            {Array.isArray(dataKey) ? (
              dataKey.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={defaultColors[index % defaultColors.length]}
                  stackId={stacked ? 'stack' : undefined}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar dataKey={dataKey || 'value'} fill={defaultColors[0]} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BarChartCard;
