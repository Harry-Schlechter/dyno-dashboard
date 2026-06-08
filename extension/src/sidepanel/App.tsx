import { useEffect, useState } from 'react';
import { Box, Tabs, Tab, Typography, Button, Stack } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { NowTab } from './tabs/NowTab';
import { CaptureTab } from './tabs/CaptureTab';
import { NotesTab } from './tabs/NotesTab';
import { getCurrentSession } from '../lib/supabase';

type TabKey = 'now' | 'capture' | 'notes';

export function App() {
  const [active, setActive] = useState<TabKey>('now');
  const [paired, setPaired] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Ask the service worker to refresh the session first. This forces a
      // refresh-token exchange if the access token has expired since the SW
      // last ran (Manifest V3 SWs are aggressively killed when idle).
      try {
        await chrome.runtime.sendMessage({ type: 'refresh-session' });
      } catch {
        // SW might be cold-starting — just continue, getSession below will retry.
      }
      const session = await getCurrentSession();
      if (!mounted) return;
      setPaired(!!session);
      setEmail(session?.user?.email ?? null);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(91,141,239,0.06) 0%, rgba(0,0,0,0) 100%)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            🦕 Dyno Cockpit
          </Typography>
          {email && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {email}
            </Typography>
          )}
        </Stack>
      </Box>

      {paired === false ? (
        <UnpairedNotice />
      ) : (
        <>
          <Tabs
            value={active}
            onChange={(_, v) => setActive(v)}
            variant="fullWidth"
            sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Tab value="now" label="Now" />
            <Tab value="capture" label="Capture" />
            <Tab value="notes" label="Notes" />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {active === 'now' && <NowTab />}
            {active === 'capture' && <CaptureTab />}
            {active === 'notes' && <NotesTab />}
          </Box>
        </>
      )}
    </Box>
  );
}

function UnpairedNotice() {
  const [hadSession, setHadSession] = useState(false);
  useEffect(() => {
    chrome.storage.local.get(['dyno-cockpit-auth'], (result) => {
      // If we have a stored auth blob but the session check still failed,
      // the refresh token is gone or revoked — frame it as "session expired".
      setHadSession(!!result['dyno-cockpit-auth']);
    });
  }, []);
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          {hadSession ? 'Session expired' : 'Not paired yet'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {hadSession
            ? 'Your pairing expired or was revoked. Re-pair to continue.'
            : 'Pair this extension with your Dyno dashboard account to start using the Cockpit.'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<OpenInNew />}
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          {hadSession ? 'Re-pair' : 'Open pairing page'}
        </Button>
      </Box>
    </Box>
  );
}
