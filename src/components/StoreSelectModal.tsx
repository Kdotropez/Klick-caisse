import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  TextField,
  Alert,
  Link,
} from '@mui/material';
import { Store as StoreIcon, Lock } from '@mui/icons-material';
import { STORES, getStoreByCode } from '../types/Store';
import { StorageService } from '../services/StorageService';

export interface StoreSelectModalProps {
  /** Code boutique pré-sélectionné (ex. dernière session ou après migration) */
  initialCode: string;
  onConfirm: (storeCode: string) => void;
}

const StoreSelectModal: React.FC<StoreSelectModalProps> = ({ initialCode, onConfirm }) => {
  const validInitial = STORES.some((s) => s.code === initialCode) ? initialCode : STORES[0]?.code ?? '1';
  const [selected, setSelected] = useState<string>(validInitial);
  const [step, setStep] = useState<'store' | 'pin'>('store');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const selectedStore = getStoreByCode(selected);

  const handleOpenCaisse = () => {
    if (!StorageService.verifyStoreAccessPin(selected, pin)) {
      setPinError(`Saisissez le nom de la boutique : ${selectedStore?.name ?? ''}.`);
      return;
    }
    setPinError(null);
    onConfirm(selected);
  };

  const goToPinStep = () => {
    setPin('');
    setPinError(null);
    setStep('pin');
  };

  return (
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown>
      {step === 'store' ? (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StoreIcon color="primary" />
            Choisir la boutique
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Les tickets, clôtures, sauvegardes et catalogue seront ceux de cette boutique. Pour changer de
              magasin, fermez puis rouvrez l&apos;application.
            </Typography>
            <FormControl component="fieldset" variant="standard" sx={{ width: '100%' }}>
              <FormLabel component="legend">Boutique active</FormLabel>
              <RadioGroup
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                sx={{ mt: 1, gap: 0.5 }}
              >
                {STORES.map((store) => (
                  <Paper key={store.code} variant="outlined" sx={{ px: 1, py: 0.25 }}>
                    <FormControlLabel
                      value={store.code}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {store.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {store.location}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                    />
                  </Paper>
                ))}
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="contained" size="large" fullWidth onClick={goToPinStep}>
              Continuer
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock color="primary" />
            Mot de passe — {selectedStore?.name ?? 'Boutique'}
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Saisissez le <strong>nom de la boutique</strong> exactement comme affiché :{' '}
              <strong>{selectedStore?.name}</strong>. La casse et les accents sont tolérés (ex. « saint tropez » pour
              Saint Tropez).
            </Alert>
            <TextField
              fullWidth
              autoCapitalize="words"
              label="Nom de la boutique"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenCaisse()}
              autoFocus
              error={!!pinError}
              helperText={pinError}
            />
            <Box sx={{ mt: 1 }}>
              <Link component="button" type="button" variant="body2" onClick={() => setStep('store')}>
                ← Changer de boutique
              </Link>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="contained" size="large" fullWidth onClick={handleOpenCaisse}>
              Ouvrir la caisse
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default StoreSelectModal;
