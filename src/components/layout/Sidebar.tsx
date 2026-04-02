import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
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

const DRAWER_WIDTH = 200;

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Nutrition', path: '/nutrition', icon: Restaurant },
  { label: 'Workouts', path: '/workouts', icon: FitnessCenter },
  { label: 'Sleep', path: '/sleep', icon: Bedtime },
  { label: 'Finances', path: '/finances', icon: AccountBalance },
  { label: 'Tasks', path: '/tasks', icon: CheckCircle },
  { label: 'Journal', path: '/journal', icon: Book },
  { label: 'Contacts', path: '/contacts', icon: People },
  { label: 'Planner', path: '/planner', icon: ViewTimeline },
  { label: 'Calendar', path: '/calendar', icon: CalendarMonth },
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
    <Box sx={{ overflow: 'auto', px: 1.5, pt: 2.5 }}>
      {/* Branding */}
      <Box sx={{ mb: 3, px: 0.5 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Dyno 🦕
        </Typography>
      </Box>

      <Divider sx={{ mb: 2, opacity: 0.1 }} />

      <List sx={{ py: 0 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => handleNav(item.path)}
                sx={{
                  borderRadius: '12px',
                  py: 1,
                  px: 1.5,
                  minHeight: 0,
                  '&.Mui-selected': {
                    backgroundColor: `${theme.palette.primary.main}2E`,
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: `${theme.palette.primary.main}38`,
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 32,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
                  }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9375rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
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
          aria-label="Open navigation menu"
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer - 1,
            backgroundColor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            '&:hover': { backgroundColor: 'background.paper' },
          }}
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
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              backgroundColor: 'background.default',
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
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          backgroundColor: 'background.default',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
