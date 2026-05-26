import { useEffect, useState } from 'react';
import {
  Box, Container, Card, CardContent, Typography, TextField, Button,
  Alert, Chip, Divider, CircularProgress, Stack,
} from '@mui/material';
import { CheckCircle, LinkOff } from '@mui/icons-material';
import { getSupabase, getCurrentSession, setSessionFromPairing } from '../lib/supabase';
import { DASHBOARD_URL } from '../lib/config';

interface PairedState {
  email: string;
  userId: string;
}

export function OptionsApp() {
  const [paired, setPaired] = useState<PairedState | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bootChecked, setBootChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getCurrentSession();
      if (session?.user) {
        setPaired({ email: session.user.email || '(no email)', userId: session.user.id });
      }
      setBootChecked(true);
    })();
  }, []);

  const handlePair = async () => {
    setError(null);
    setSuccess(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Paste the pairing code from the dashboard.');
      return;
    }
    setLoading(true);
    try {
      const supa = getSupabase();
      const { data, error: lookupErr } = await supa
        .from('extension_pairing')
        .select('id, user_id, payload, expires_at, consumed_at')
        .eq('code', trimmed)
        .maybeSingle();

      if (lookupErr) {
        setError(`Lookup failed: ${lookupErr.message}`);
        setLoading(false);
        return;
      }
      if (!data) {
        setError('Code not found. Generate a new one from the dashboard.');
        setLoading(false);
        return;
      }
      if (data.consumed_at) {
        setError('This code has already been used. Generate a fresh one.');
        setLoading(false);
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        setError('This code has expired. Generate a fresh one.');
        setLoading(false);
        return;
      }

      const payload = data.payload as { access_token: string; refresh_token: string };
      const result = await setSessionFromPairing(payload);
      if (!result.ok) {
        setError(`Could not apply session: ${result.error}`);
        setLoading(false);
        return;
      }

      // Mark consumed (best-effort — RLS only lets the owner update, which we now are post-setSession)
      await supa.from('extension_pairing')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', data.id);

      const session = await getCurrentSession();
      if (session?.user) {
        setPaired({ email: session.user.email || '(no email)', userId: session.user.id });
        setSuccess('Paired! Open the side panel from any tab.');
        setCode('');
      } else {
        setError('Session did not stick — try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Pairing failed.');
    }
    setLoading(false);
  };

  const handleUnpair = async () => {
    await getSupabase().auth.signOut();
    setPaired(null);
    setSuccess(null);
    setError(null);
  };

  if (!bootChecked) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h1" sx={{ fontWeight: 700, mb: 1 }}>
        🦕 Dyno Cockpit
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        Pair this extension with your Dyno dashboard account.
      </Typography>

      {paired ? (
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <CheckCircle sx={{ color: 'success.main' }} />
              <Typography variant="h4">Paired</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Signed in as
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
              {paired.email}
            </Typography>
            <Chip label={`user_id: ${paired.userId.slice(0, 8)}…`} size="small" sx={{ mr: 1 }} />
            <Divider sx={{ my: 3, opacity: 0.1 }} />
            <Button
              onClick={handleUnpair}
              variant="outlined"
              color="error"
              startIcon={<LinkOff />}
              size="small"
            >
              Unpair
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              1. Open the{' '}
              <a
                href={DASHBOARD_URL}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#5B8DEF', textDecoration: 'none' }}
              >
                dashboard
              </a>{' '}
              and click <strong>Pair Cockpit</strong> in the sidebar.
              <br />
              2. Copy the code it generates.
              <br />
              3. Paste it below.
            </Typography>
            <TextField
              fullWidth
              autoFocus
              label="Pairing code"
              placeholder="A4F-9KP-2X7"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              sx={{ mb: 2, '& input': { fontFamily: 'monospace', letterSpacing: '0.1em', textAlign: 'center', fontSize: '1.1rem' } }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePair(); }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handlePair}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              Pair extension
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </Container>
  );
}
