import React from 'react';
import { Card, CardContent, Box, Typography, Chip, Stack, Button } from '@mui/material';

type BookingKind = 'flight' | 'hotel' | 'rental' | 'reservation' | 'tour' | 'other';

interface Props {
  kind: BookingKind;
  title: string;
  subtitle?: string;
  /** Free-form date or date range, e.g. "Sat Jul 11 · 7:30am" or "Jul 11–14". */
  when?: string;
  /** Free-form location string. */
  where?: string;
  /** Confirmation/reference code, shown monospace. */
  reference?: string;
  /** Booking link (book / view / manage). */
  href?: string;
  hrefLabel?: string;
  /** Final price already paid, in dollars (rendered $1,234). */
  pricePaid?: number;
  /** Outstanding amount due, in dollars. */
  priceDue?: number;
  /** Status chip text. */
  status?: 'confirmed' | 'pending' | 'tentative' | 'cancelled';
  notes?: string;
}

const KIND_META: Record<BookingKind, { emoji: string; color: string }> = {
  flight:      { emoji: '✈️', color: '#5B8DEF' },
  hotel:       { emoji: '🏨', color: '#9C7BFF' },
  rental:      { emoji: '🚗', color: '#FF9800' },
  reservation: { emoji: '🍽️', color: '#EC407A' },
  tour:        { emoji: '🗺️', color: '#26C6DA' },
  other:       { emoji: '📌', color: '#7d8590' },
};

const STATUS_COLOR: Record<NonNullable<Props['status']>, string> = {
  confirmed: '#4CAF50',
  pending:   '#FFCA28',
  tentative: '#FF9800',
  cancelled: '#F44336',
};

const fmtMoney = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const BookingCard: React.FC<Props> = ({
  kind, title, subtitle, when, where, reference, href, hrefLabel,
  pricePaid, priceDue, status, notes,
}) => {
  const meta = KIND_META[kind];
  return (
    <Card sx={{ '&:hover': { transform: 'none' }, borderLeft: `3px solid ${meta.color}`, height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
          <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{meta.emoji}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {status && (
            <Chip
              size="small"
              label={status}
              sx={{
                height: 20, fontSize: '0.65rem', textTransform: 'capitalize',
                color: STATUS_COLOR[status], bgcolor: STATUS_COLOR[status] + '22',
                border: `1px solid ${STATUS_COLOR[status]}44`,
              }}
            />
          )}
        </Box>

        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {when && (
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              <Typography component="span" color="text.secondary" sx={{ fontSize: '0.75rem', mr: 1 }}>WHEN</Typography>
              {when}
            </Typography>
          )}
          {where && (
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              <Typography component="span" color="text.secondary" sx={{ fontSize: '0.75rem', mr: 1 }}>WHERE</Typography>
              {where}
            </Typography>
          )}
          {reference && (
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              <Typography component="span" color="text.secondary" sx={{ fontSize: '0.75rem', mr: 1 }}>REF</Typography>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{reference}</Typography>
            </Typography>
          )}
        </Stack>

        {(pricePaid !== undefined || priceDue !== undefined) && (
          <Stack direction="row" spacing={2} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {pricePaid !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>PAID</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#4CAF50' }}>{fmtMoney(pricePaid)}</Typography>
              </Box>
            )}
            {priceDue !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>DUE</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#FF9800' }}>{fmtMoney(priceDue)}</Typography>
              </Box>
            )}
          </Stack>
        )}

        {notes && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontSize: '0.78rem', fontStyle: 'italic' }}>
            {notes}
          </Typography>
        )}

        {href && (
          <Button
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="outlined"
            fullWidth
            sx={{
              mt: 1.5, textTransform: 'none', borderColor: meta.color, color: meta.color,
              '&:hover': { borderColor: meta.color, bgcolor: meta.color + '14' },
            }}
          >
            {hrefLabel ?? 'View booking'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingCard;
