import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Home,
  Restaurant,
  FitnessCenter,
  Bedtime,
  AccountBalance,
  CheckCircle,
  Book,
  People,
  CalendarMonth,
  ViewTimeline,
  Menu as MenuIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Home', path: '/', icon: <Home /> },
  { label: 'Nutrition', path: '/nutrition', icon: <Restaurant /> },
  { label: 'Workouts', path: '/workouts', icon: <FitnessCenter /> },
  { label: 'Sleep', path: '/sleep', icon: <Bedtime /> },
  { label: 'Finances', path: '/finances', icon: <AccountBalance /> },
  { label: 'Tasks', path: '/tasks', icon: <CheckCircle /> },
  { label: 'Journal', path: '/journal', icon: <Book /> },
  { label: 'Contacts', path: '/contacts', icon: <People /> },
  { label: 'Planner', path: '/planner', icon: <ViewTimeline /> },
  { label: 'Calendar', path: '/calendar', icon: <CalendarMonth /> },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>🦕</Typography>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dyno
          </Typography>
          <Typography variant="caption" color="text.secondary">Life Dashboard</Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItemButton
              key={item.path}
              selected={isActive}
              onClick={() => handleNav(item.path)}
              sx={{ mb: 0.5, borderRadius: 2, px: 2, py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#5B8DEF' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={onOpen}
          sx={{ position: 'fixed', top: 12, left: 12, zIndex: 1200, color: 'text.primary' }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              backgroundColor: 'rgba(18, 24, 33, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          backgroundColor: 'rgba(18, 24, 33, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
