import React from 'react';
import { Card, CardContent, CardHeader, Box, useTheme } from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PieChartCard = ({ title, subtitle, data, dataKey, nameKey, height = 300, colors, action, innerRadius = 0 }) => {
  const theme = useTheme();
  const defaultColors = colors || [
    theme.palette.primary.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.info.main,
    '#8884d8', '#82ca9d', '#ffc658',
  ];

  const CustomTooltip = ({ active, payload }) => {
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
          {payload.map((entry, index) => (
            <Box key={index} sx={{ color: entry.color, fontSize: '0.85rem' }}>
              {entry.name}: {entry.value} ({((entry.value / (data.reduce((s, d) => s + d[dataKey || 'value'], 0))) * 100).toFixed(1)}%)
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
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey || 'value'}
              nameKey={nameKey || 'name'}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={Math.min(height, 300) / 2 - 20}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => <span style={{ color: theme.palette.text.primary }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PieChartCard;
