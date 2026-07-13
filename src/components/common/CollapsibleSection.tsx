import React, { useState } from 'react';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import { ExpandLess } from '@mui/icons-material';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional right-aligned adornment (e.g. a count chip). */
  action?: React.ReactNode;
  sx?: object;
}

// A titled, collapsible wrapper used for agent voice + insights blocks so the
// data leads the page and the coaching commentary can be tucked away.
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, children, defaultOpen = false, action, sx,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box sx={{ mb: 2.5, ...sx }}>
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
          userSelect: 'none', py: 0.5,
          '&:hover .cs-title': { color: 'text.primary' },
        }}
      >
        <IconButton size="small" sx={{ p: 0.25 }} aria-label={open ? 'Collapse' : 'Expand'}>
          <ExpandLess
            sx={{
              fontSize: 20, color: 'text.secondary',
              transition: 'transform 0.25s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          />
        </IconButton>
        <Typography
          className="cs-title"
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1.5, transition: 'color 0.2s' }}
        >
          {title}
        </Typography>
        {action && <Box sx={{ ml: 'auto' }}>{action}</Box>}
      </Box>
      <Collapse in={open} timeout={280} unmountOnExit>
        <Box sx={{ pt: 1 }}>{children}</Box>
      </Collapse>
    </Box>
  );
};

export default CollapsibleSection;
