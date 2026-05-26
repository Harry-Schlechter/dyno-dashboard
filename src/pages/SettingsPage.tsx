import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Stack, Divider, Chip,
} from '@mui/material';
import { Logout, Extension as ExtensionIcon } from '@mui/icons-material';
import { useAuth } from '../lib/auth';
import { PairCockpitDialog } from '../components/PairCockpitDialog';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pairOpen, setPairOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Settings</Typography>

      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        {user && (
          <Card>
            <CardContent>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Account</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5 }}>{user.email}</Typography>
              <Chip label={`role: ${user.role}`} size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <ExtensionIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Dyno Cockpit</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Pair the Chrome extension with this account. Generate a one-time code, then paste it
              into the extension options page.
            </Typography>
            <Button variant="outlined" onClick={() => setPairOpen(true)}>
              Pair Cockpit
            </Button>
          </CardContent>
        </Card>

        <Divider sx={{ opacity: 0.1 }} />

        <Card>
          <CardContent>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Session</Typography>
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Logout />}
                onClick={handleLogout}
              >
                Sign out
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <PairCockpitDialog open={pairOpen} onClose={() => setPairOpen(false)} />
    </Box>
  );
};

export default SettingsPage;
