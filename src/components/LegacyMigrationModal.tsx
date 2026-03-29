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
  Alert,
} from '@mui/material';
import { Storage as StoreIcon, WarningAmber } from '@mui/icons-material';
import { STORES } from '../types/Store';

export interface LegacyMigrationModalProps {
  initialCode: string;
  onMigrate: (targetStoreCode: string) => void;
}

/**
 * Affiché une seule fois tant que des données « globales » (avant multi-boutiques)
 * sont présentes et non migrées. L’utilisateur choisit explicitement la boutique cible.
 */
const LegacyMigrationModal: React.FC<LegacyMigrationModalProps> = ({ initialCode, onMigrate }) => {
  const validInitial = STORES.some((s) => s.code === initialCode) ? initialCode : STORES[0]?.code ?? '1';
  const [selected, setSelected] = useState<string>(validInitial);

  return (
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmber color="warning" />
        Migration des données en mémoire
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Des tickets, clôtures ou autres données sont encore enregistrés dans l&apos;ancien emplacement
          (sans boutique). Choisissez la boutique <strong>vers laquelle tout doit être transféré</strong>.
          Cette opération ne se fait qu&apos;une fois par poste.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tout sera copié vers l&apos;espace de la boutique choisie. Vous ouvrirez ensuite la caisse en
          sélectionnant une boutique (vous pourrez choisir la même).
        </Typography>
        <FormControl component="fieldset" variant="standard" sx={{ width: '100%' }}>
          <FormLabel component="legend">Migrer les données vers</FormLabel>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StoreIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {store.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {store.location}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                />
              </Paper>
            ))}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', gap: 1 }}>
        <Button variant="contained" color="warning" size="large" fullWidth onClick={() => onMigrate(selected)}>
          Migrer vers cette boutique
        </Button>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          À l&apos;étape suivante, le mot de passe sera le <strong>nom de la boutique</strong> que vous ouvrirez (voir
          la liste des magasins).
        </Typography>
      </DialogActions>
    </Dialog>
  );
};

export default LegacyMigrationModal;
