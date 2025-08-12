import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Paper,
  Alert,
  Grid
} from '@mui/material';
import { licenseService, License } from '../services/LicenseService';

interface LicenseInfoModalProps {
  open: boolean;
  onClose: () => void;
  onEditLicense: () => void;
}

const LicenseInfoModal: React.FC<LicenseInfoModalProps> = ({
  open,
  onClose,
  onEditLicense,
}) => {
  const [licenseInfo, setLicenseInfo] = useState<{
    customerName: string;
    customerEmail: string;
    expiryDate: string;
    features: string[];
    daysRemaining: number;
  } | null>(null);
  const [validation, setValidation] = useState<any>(null);

  useEffect(() => {
    if (open) {
      const info = licenseService.getLicenseInfo();
      const validation = licenseService.validateCurrentLicense();
      setLicenseInfo(info);
      setValidation(validation);
    }
  }, [open]);

  const handleRemoveLicense = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer la licence ?')) {
      licenseService.removeLicense();
      onClose();
    }
  };

  if (!licenseInfo) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Informations de Licence</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Aucune licence trouvée. Veuillez activer une licence.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const isExpired = validation?.isExpired;
  const isExpiringSoon = licenseInfo.daysRemaining <= 7 && licenseInfo.daysRemaining > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          🔐 Informations de Licence - Klick Caisse
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Identifiant Machine: <Chip label={licenseService.getMachineId()} size="small" variant="outlined" />
          </Typography>
        </Box>

        {isExpired && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ⚠️ Licence expirée ! Veuillez renouveler votre licence.
          </Alert>
        )}

        {isExpiringSoon && !isExpired && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Licence expire dans {licenseInfo.daysRemaining} jour(s)
          </Alert>
        )}

        {validation?.isValid && !isExpired && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Licence valide
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                👤 Informations Client
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Nom:</strong> {licenseInfo.customerName}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Email:</strong> {licenseInfo.customerEmail || 'Non spécifié'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                📅 Validité
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Expire le:</strong> {new Date(licenseInfo.expiryDate).toLocaleDateString('fr-FR')}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Jours restants:</strong> 
                <Chip 
                  label={licenseInfo.daysRemaining} 
                  color={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'success'}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                ⚙️ Fonctionnalités
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {licenseInfo.features.map((feature) => (
                  <Chip
                    key={feature}
                    label={feature === 'basic' ? 'Basic' : feature === 'premium' ? 'Premium' : feature}
                    color={feature === 'premium' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            📋 Statut de la Licence
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Validation:</strong> {validation?.message}
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Machine:</strong> {validation?.isValid ? '✅ Validée' : '❌ Non validée'}
          </Typography>
          <Typography variant="body2">
            <strong>Expiration:</strong> {isExpired ? '❌ Expirée' : isExpiringSoon ? '⚠️ Expire bientôt' : '✅ Valide'}
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleRemoveLicense} variant="outlined" color="error">
          🗑️ Supprimer Licence
        </Button>
        <Button onClick={onEditLicense} variant="outlined" color="primary">
          ✏️ Modifier Licence
        </Button>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseInfoModal;
