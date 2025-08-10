import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { Cashier } from '../types/Cashier';

interface CashierLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (cashier: Cashier) => void;
  cashiers: Cashier[];
}

const CashierLoginModal: React.FC<CashierLoginModalProps> = ({
  open,
  onClose,
  onLogin,
  cashiers
}) => {
  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [pinDisplay, setPinDisplay] = useState<string>('');

  const activeCashiers = cashiers.filter(c => c.isActive);

  useEffect(() => {
    if (open) {
      setSelectedCashierId('');
      setPin('');
      setError('');
      setPinDisplay('');
    }
  }, [open]);

  const handlePinChange = (value: string) => {
    // Ne permettre que 4 chiffres
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
      setPinDisplay('•'.repeat(value.length));
    }
  };

  const handleLogin = () => {
    if (!selectedCashierId) {
      setError('Veuillez sélectionner un caissier');
      return;
    }

    if (pin.length !== 4) {
      setError('Le code PIN doit contenir 4 chiffres');
      return;
    }

    const selectedCashier = cashiers.find(c => c.id === selectedCashierId);
    if (!selectedCashier) {
      setError('Caissier non trouvé');
      return;
    }

    if (selectedCashier.pin !== pin) {
      setError('Code PIN incorrect');
      setPin('');
      setPinDisplay('');
      return;
    }

    // Connexion réussie
    onLogin(selectedCashier);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        🔐 Connexion Caissier
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Caissier</InputLabel>
            <Select
              value={selectedCashierId}
              onChange={(e) => setSelectedCashierId(e.target.value)}
              label="Caissier"
            >
              {activeCashiers.map((cashier) => (
                <MenuItem key={cashier.id} value={cashier.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>
                      {cashier.firstName} {cashier.name}
                    </Typography>
                    {cashier.lastLogin && (
                      <Chip 
                        label={`Dernière connexion: ${new Date(cashier.lastLogin).toLocaleDateString()}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Code PIN"
            type="password"
            value={pinDisplay}
            onChange={(e) => handlePinChange(e.target.value)}
            onKeyPress={handleKeyPress}
            inputProps={{
              maxLength: 4,
              pattern: '[0-9]*'
            }}
            placeholder="••••"
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Entrez votre code PIN à 4 chiffres
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button 
          onClick={handleLogin} 
          variant="contained" 
          disabled={!selectedCashierId || pin.length !== 4}
        >
          Se connecter
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CashierLoginModal;
