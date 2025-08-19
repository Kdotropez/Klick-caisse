import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
} from '@mui/material';
import { Keyboard } from '@mui/icons-material';

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts: Array<{ key: string; description: string }>;
}

const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  open,
  onClose,
  shortcuts,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Keyboard />
        Raccourcis Clavier
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Utilisez ces raccourcis pour accélérer votre travail en caisse :
        </Typography>
        
        <Grid container spacing={2}>
          {shortcuts.map((shortcut, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 1,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                backgroundColor: '#fafafa'
              }}>
                <Typography variant="body2">
                  {shortcut.description}
                </Typography>
                <Chip 
                  label={shortcut.key} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="body2" color="primary">
            💡 <strong>Astuce :</strong> Les raccourcis fonctionnent même quand vous n'êtes pas dans un champ de saisie.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShortcutsHelpModal;

