import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box, Divider } from '@mui/material';

const InfoCard = ({ title, subtitle, icon, action, children, sx }) => {
  return (
    <Card sx={{ ...sx }}>
      {(title || icon) && (
        <>
          <CardHeader
            avatar={icon ? (
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
            ) : undefined}
            title={title && <Typography variant="h6" fontWeight={600}>{title}</Typography>}
            subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            action={action}
            sx={{ pb: children ? 1 : 0 }}
          />
          {children && <Divider />}
        </>
      )}
      {children && (
        <CardContent sx={{ '&:last-child': { pb: 3 } }}>
          {children}
        </CardContent>
      )}
    </Card>
  );
};

export default InfoCard;
