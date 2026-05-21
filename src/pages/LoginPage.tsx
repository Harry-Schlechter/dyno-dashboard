import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Stack } from '@mui/material';
import { useAuth } from '../lib/auth';

const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const r = await login(email.trim(), password);
    if (!r.ok) setError(r.error);
    setSubmitting(false);
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#0d1117', color: '#e6edf3', p: 2,
    }}>
      <Box component="form" onSubmit={onSubmit} sx={{ width: '100%', maxWidth: 360 }}>
        <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'center', mb: 0.5 }}>
          Dyno 🦕
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          Sign in to continue
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Email" type="email" fullWidth autoFocus required
            autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="Password" type="password" fullWidth required
            autoComplete="current-password"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default LoginPage;
