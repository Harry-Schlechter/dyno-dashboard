import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { Restaurant } from '@mui/icons-material';
import { useSupabase } from '../../hooks/useSupabase';
import { format } from 'date-fns';

interface MealRow {
  date: string;
  meal_type: string | null;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
}

const MealsCaloriesWidget: React.FC = () => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data, loading } = useSupabase<MealRow>({
    table: 'meals',
    order: { column: 'date', ascending: false },
    limit: 30,
  });

  const today = useMemo(() => data.filter(m => m.date === todayStr), [data, todayStr]);
  const calories = today.reduce((s, m) => s + (m.calories || 0), 0);
  const protein = today.reduce((s, m) => s + (m.protein_g || 0), 0);

  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Restaurant sx={{ fontSize: 18, color: '#FF9800' }} />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            Today's meals
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="h3" sx={{ color: 'text.secondary' }}>—</Typography>
        ) : today.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nothing logged today</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#5B8DEF' }}>
                {Math.round(calories)}
              </Typography>
              <Typography variant="body2" color="text.secondary">cal</Typography>
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {today.length} meal{today.length !== 1 ? 's' : ''}
              </Typography>
              {protein > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {Math.round(protein)}g protein
                </Typography>
              )}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MealsCaloriesWidget;
