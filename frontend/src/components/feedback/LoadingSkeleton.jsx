import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';

const StatCardSkeleton = () => (
  <Card>
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
      <Skeleton variant="text" width="30%" height={16} sx={{ mt: 1 }} />
    </CardContent>
  </Card>
);

const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <Box>
    <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} variant="rectangular" height={40} sx={{ flex: 1, borderRadius: 1 }} />
        ))}
      </Box>
    ))}
  </Box>
);

const ChartSkeleton = ({ height = 300 }) => (
  <Card>
    <CardContent>
      <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={height - 80} sx={{ borderRadius: 1 }} />
    </CardContent>
  </Card>
);

const LoadingSkeleton = ({ type = 'card', ...props }) => {
  switch (type) {
    case 'stat':
      return <StatCardSkeleton />;
    case 'table':
      return <TableSkeleton {...props} />;
    case 'chart':
      return <ChartSkeleton {...props} />;
    default:
      return (
        <Box>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      );
  }
};

export default LoadingSkeleton;
