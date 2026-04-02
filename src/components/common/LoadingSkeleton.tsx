import React from 'react';
import { Skeleton, Card, CardContent, Box, Stack } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'chart' | 'text';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'card', count = 1 }) => {
  if (variant === 'card') {
    return (
      <Stack spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
              <Skeleton variant="rectangular" height={80} sx={{ mt: 2, borderRadius: 2 }} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  if (variant === 'table') {
    return (
      <Card>
        <CardContent>
          <Stack spacing={1}>
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'chart') {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="30%" height={32} />
          <Skeleton variant="rectangular" height={250} sx={{ mt: 2, borderRadius: 2 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={1}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="text" width={`${60 + Math.random() * 30}%`} height={24} />
      ))}
    </Stack>
  );
};

export default LoadingSkeleton;
