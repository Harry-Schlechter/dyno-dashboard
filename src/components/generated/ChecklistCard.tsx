import React from 'react';
import { Card, CardContent, Box, Typography, Checkbox } from '@mui/material';

export interface ChecklistItem {
  label: string;
  done?: boolean;
  hint?: string;
}

interface Props {
  title?: string;
  items: ChecklistItem[];
}

const ChecklistCard: React.FC<Props> = ({ title = 'To do', items }) => {
  const done = items.filter(i => i.done).length;
  return (
    <Card sx={{ '&:hover': { transform: 'none' }, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {done} / {items.length}
          </Typography>
        </Box>
        <Box>
          {items.map((it, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, py: 0.5 }}>
              <Checkbox
                checked={!!it.done}
                disabled
                size="small"
                sx={{ p: 0.25, mt: -0.25, '&.Mui-disabled': { color: it.done ? '#4CAF50' : 'text.secondary' } }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.85rem',
                    textDecoration: it.done ? 'line-through' : 'none',
                    color: it.done ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {it.label}
                </Typography>
                {it.hint && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                    {it.hint}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChecklistCard;
