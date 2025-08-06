import React from 'react';
import { Box, Paper, Typography, IconButton } from '@mui/material';
import { Close, Minimize, Maximize, DragIndicator } from '@mui/icons-material';

interface WindowFrameProps {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent, windowId: string) => void;
  onMinimize: (windowId: string) => void;
  onMaximize: (windowId: string) => void;
  onClose: (windowId: string) => void;
  renderResizeHandles: (windowId: string) => React.ReactNode;
}

const WindowFrame: React.FC<WindowFrameProps> = ({
  id,
  title,
  x,
  y,
  width,
  height,
  zIndex,
  isMinimized,
  children,
  onMouseDown,
  onMinimize,
  onMaximize,
  onClose,
  renderResizeHandles,
}) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        zIndex: zIndex,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 3,
        border: '1px solid #ddd',
      }}
    >
      {/* Barre de titre */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          backgroundColor: 'primary.main',
          color: 'white',
          cursor: 'move',
          userSelect: 'none',
        }}
        onMouseDown={(e) => onMouseDown(e, id)}
      >
        <DragIndicator sx={{ mr: 1 }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onMinimize(id)}
          sx={{ color: 'white' }}
        >
          <Minimize />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onMaximize(id)}
          sx={{ color: 'white' }}
        >
          <Maximize />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onClose(id)}
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </Box>

      {/* Contenu de la fenêtre */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
        {renderResizeHandles(id)}
      </Box>
    </Paper>
  );
};

export default WindowFrame; 