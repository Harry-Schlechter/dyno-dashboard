import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Alert, Chip,
} from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { supabase } from '../lib/supabase';

interface Props { open: boolean; onClose: () => void; }

function generateCode(): string {
  // 9-char human-friendly code, e.g. A4F-9KP-2X7. Avoids ambiguous chars.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

export const PairCockpitDialog: React.FC<Props> = ({ open, onClose }) => {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be signed in to pair the extension.');
        setLoading(false);
        return;
      }
      const newCode = generateCode();
      const payload = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: { id: session.user.id, email: session.user.email },
      };
      const { error: insertErr } = await supabase
        .from('extension_pairing')
        .insert({ user_id: session.user.id, code: newCode, payload });
      if (insertErr) {
        setError(insertErr.message);
      } else {
        setCode(newCode);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate pairing code.');
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCode(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Pair Cockpit Extension</DialogTitle>
      <DialogContent>
        {!code && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Generate a one-time code, then paste it into the Dyno Cockpit extension's options
            page. The code expires in 10 minutes.
          </Typography>
        )}
        {code && (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Paste this code into the extension options page within 10 minutes.
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(91,141,239,0.1)',
                border: '1px solid rgba(91,141,239,0.3)',
                fontFamily: 'monospace',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '0.1em',
                fontWeight: 700,
                mb: 1,
              }}
            >
              {code}
            </Box>
            <Button
              startIcon={copied ? <Check /> : <ContentCopy />}
              onClick={handleCopy}
              fullWidth
              variant="outlined"
              size="small"
            >
              {copied ? 'Copied!' : 'Copy code'}
            </Button>
            <Box sx={{ mt: 2 }}>
              <Chip label="One-time use" size="small" sx={{ mr: 1 }} />
              <Chip label="Expires in 10 min" size="small" />
            </Box>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {!code && (
          <Button
            onClick={handleGenerate}
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Generate code
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
