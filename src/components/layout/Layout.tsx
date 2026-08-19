import React, { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import DemoBanner from '../common/DemoBanner';
import VoiceButton from '../common/VoiceButton';
import ChatPanel from '../chat/ChatPanel';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <DemoBanner />
        <VoiceButton />
        <ChatPanel />
        <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
