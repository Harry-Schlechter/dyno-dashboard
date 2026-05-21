import React, { useMemo, useState } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, Chip, ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import { CheckCircleOutline, RemoveCircleOutline, NotificationsActiveOutlined, ChevronRight, WbSunny, Brightness3, AutoAwesome, EventNote, Note } from '@mui/icons-material';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useBriefings, Briefing, BriefingSection, BriefingAsk } from '../../hooks/useBriefings';

const kindIcon = (kind: string): React.ReactNode => {
  switch (kind) {
    case 'morning': return <WbSunny sx={{ fontSize: 18, color: '#FFB74D' }} />;
    case 'evening': return <Brightness3 sx={{ fontSize: 18, color: '#90CAF9' }} />;
    case 'weekly':  return <AutoAwesome sx={{ fontSize: 18, color: '#764ba2' }} />;
    default:        return <EventNote sx={{ fontSize: 18, color: '#5B8DEF' }} />;
  }
};

const kindLabel = (kind: string): string => {
  if (kind === 'morning') return 'Morning';
  if (kind === 'evening') return 'Evening';
  if (kind === 'weekly')  return 'Weekly';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
};

const sectionAccent = (kind: BriefingSection['kind']): string => {
  switch (kind) {
    case 'highlight': return '#5B8DEF';
    case 'wins':      return '#4CAF50';
    case 'missed':    return '#FF9800';
    case 'preview':   return '#90CAF9';
    case 'asks':      return '#E57373';
    case 'note':      return '#7d8590';
    case 'list':      return '#7d8590';
    default:          return '#7d8590';
  }
};

const SectionBlock: React.FC<{ section: BriefingSection }> = ({ section }) => {
  const accent = sectionAccent(section.kind);

  if (section.items.length === 0) return null;

  return (
    <Box>
      <Typography variant="caption" sx={{ letterSpacing: 1, color: accent, fontWeight: 700, display: 'block', mb: 0.5 }}>
        {section.label.toUpperCase()}
      </Typography>
      <Stack spacing={0.5}>
        {section.items.map((item, i) => {
          // Asks may be objects, everything else is a string
          if (section.kind === 'asks' && typeof item === 'object' && item !== null && 'ask' in item) {
            const ask = item as BriefingAsk;
            return (
              <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <NotificationsActiveOutlined sx={{ fontSize: 14, color: accent, mt: 0.25, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {ask.agent}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'block' }}>
                    {ask.ask}
                  </Typography>
                </Box>
                {ask.link && (
                  <Box
                    component="a"
                    href={ask.link}
                    sx={{ display: 'flex', alignItems: 'center', color: accent, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    <ChevronRight sx={{ fontSize: 16 }} />
                  </Box>
                )}
              </Box>
            );
          }

          // String items
          const text = typeof item === 'string' ? item : JSON.stringify(item);
          const Icon = section.kind === 'wins' ? CheckCircleOutline
                     : section.kind === 'missed' ? RemoveCircleOutline
                     : section.kind === 'highlight' ? AutoAwesome
                     : section.kind === 'preview' ? ChevronRight
                     : section.kind === 'note' ? Note
                     : null;

          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
              {Icon ? (
                <Icon sx={{ fontSize: 14, color: accent, mt: 0.4, flexShrink: 0 }} />
              ) : (
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: accent, mt: 0.85, flexShrink: 0 }} />
              )}
              <Typography variant="body2" sx={{ flex: 1 }}>
                {text}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

const BriefingCard: React.FC = () => {
  const { briefings, loading } = useBriefings();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Today's briefings, newest-first; preserve order so we can offer a switcher.
  const todays = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return briefings.filter(b => b.for_date === today);
  }, [briefings]);

  // Default selection: pick most relevant kind based on time of day, fall back to most recent.
  const defaultBriefing = useMemo<Briefing | null>(() => {
    if (todays.length === 0) return briefings[0] ?? null;
    const hour = new Date().getHours();
    const preferKind = hour >= 18 ? 'evening' : 'morning';
    const preferred = todays.find(b => b.kind === preferKind);
    return preferred ?? todays[0];
  }, [todays, briefings]);

  const active = useMemo<Briefing | null>(() => {
    if (selectedId) {
      return briefings.find(b => b.id === selectedId) ?? defaultBriefing;
    }
    return defaultBriefing;
  }, [selectedId, briefings, defaultBriefing]);

  if (loading || !active) {
    return null;
  }

  const sections = active.body?.sections ?? [];
  const hasStructured = sections.length > 0;

  // Multi-briefing day → show small switcher
  const switcherOptions = todays.length > 1 ? todays : null;

  return (
    <Card sx={{ '&:hover': { transform: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {kindIcon(active.kind)}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                {kindLabel(active.kind).toUpperCase()} · {active.agent_id}
              </Typography>
              <Typography variant="h6" sx={{ mt: -0.25, lineHeight: 1.25 }}>
                {active.headline}
              </Typography>
              <Tooltip title={format(parseISO(active.generated_at), 'PPpp')}>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(parseISO(active.generated_at), { addSuffix: true })}
                </Typography>
              </Tooltip>
            </Box>
          </Box>

          {switcherOptions && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={active.id}
              onChange={(_, v) => v && setSelectedId(v)}
            >
              {switcherOptions.map(b => (
                <ToggleButton key={b.id} value={b.id} sx={{ textTransform: 'none', py: 0.25, px: 1, fontSize: '0.75rem' }}>
                  {kindLabel(b.kind)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Box>

        {hasStructured ? (
          <Stack spacing={1.75}>
            {sections.map((s, i) => <SectionBlock key={i} section={s} />)}
          </Stack>
        ) : active.raw_text ? (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {active.raw_text}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No detail beyond the headline.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default BriefingCard;
