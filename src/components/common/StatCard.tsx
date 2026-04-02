import React from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import TrendSparkline from './TrendSparkline';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: any[];
  trendKey?: string;
  color?: string;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendKey,
  color = '#5B8DEF',
  icon,
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={1}>
              {title}
            </Typography>
            {icon && (
              <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
            )}
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{ color }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend && trendKey && (
            <Box sx={{ mt: 1 }}>
              <TrendSparkline data={trend} dataKey={trendKey} color={color} height={35} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default StatCard;
