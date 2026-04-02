import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, Avatar, Stack, Alert } from '@mui/material';
import { People, Cake, Schedule } from '@mui/icons-material';
import { useSupabase } from '../hooks/useSupabase';
import { formatDate } from '../lib/formatters';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  birthday: string;
  last_interaction: string;
  check_in_frequency_days: number;
  notes: string;
  phone: string;
  email: string;
}

const ContactsPage: React.FC = () => {
  const { data: contacts, loading, error } = useSupabase<Contact>({
    table: 'contacts',
    order: { column: 'name', ascending: true },
  });

  if (loading) return <LoadingSkeleton variant="card" count={3} />;

  if (error || contacts.length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700}>Contacts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Stay connected with the people who matter</Typography>
        </Box>
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>Contacts coming soon</Typography>
            <Typography variant="body1" color="text.secondary">
              Dyno will sync your contacts and interaction history here.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const now = new Date();
  const isOverdue = (contact: Contact) => {
    if (!contact.last_interaction || !contact.check_in_frequency_days) return false;
    const last = new Date(contact.last_interaction);
    const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > contact.check_in_frequency_days;
  };

  const getUpcomingBirthday = (contact: Contact) => {
    if (!contact.birthday) return null;
    const bday = new Date(contact.birthday);
    const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1);
    const daysUntil = Math.floor((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 ? daysUntil : null;
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700}>Contacts</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Stay connected with the people who matter</Typography>
      </Box>
      <Grid container spacing={3}>
        {contacts.map(contact => {
          const overdue = isOverdue(contact);
          const birthdayDays = getUpcomingBirthday(contact);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={contact.id}>
              <Card sx={overdue ? { border: '1px solid rgba(244, 67, 54, 0.3)' } : {}}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#5B8DEF', width: 48, height: 48 }}>
                      {contact.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>{contact.name}</Typography>
                      {contact.relationship && (
                        <Typography variant="caption" color="text.secondary">{contact.relationship}</Typography>
                      )}
                    </Box>
                  </Box>
                  <Stack spacing={1}>
                    {contact.last_interaction && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule sx={{ fontSize: 16, color: overdue ? '#F44336' : 'text.secondary' }} />
                        <Typography variant="body2" color={overdue ? 'error.main' : 'text.secondary'}>
                          Last: {formatDate(contact.last_interaction)}
                          {overdue && ' (overdue)'}
                        </Typography>
                      </Box>
                    )}
                    {birthdayDays !== null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Cake sx={{ fontSize: 16, color: '#FF9800' }} />
                        <Typography variant="body2" color="#FF9800">
                          Birthday in {birthdayDays} day{birthdayDays !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    )}
                    {contact.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{contact.notes}</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ContactsPage;
