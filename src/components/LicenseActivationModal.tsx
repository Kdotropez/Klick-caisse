import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { licenseService, License } from '../services/LicenseService';

interface LicenseActivationModalProps {
  open: boolean;
  onClose: () => void;
  onLicenseActivated: (license: License) => void;
}

const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  open,
  onClose,
  onLicenseActivated,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [features, setFeatures] = useState<string[]>(['basic']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [machineId, setMachineId] = useState('');

  useEffect(() => {
    if (open) {
      setMachineId(licenseService.getMachineId());
      setError('');
      setSuccess('');
    }
  }, [open]);

  const handleActivate = () => {
    if (!customerName.trim() || !customerEmail.trim() || !licenseKey.trim() || !expiryDate) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    // Valider la clé de licence
    const isValid = licenseService.validateLicenseKey(licenseKey, customerName, customerEmail, expiryDate, features);
    
    if (!isValid) {
      setError('Clé de licence invalide');
      return;
    }

    // Créer et sauvegarder la licence
    const license: License = {
      key: licenseKey.toUpperCase(),
      machineId,
      issuedDate: new Date().toISOString(),
      expiryDate,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      isActive: true,
      features
    };

    licenseService.saveLicense(license);
    setSuccess('Licence activée avec succès !');
    
    setTimeout(() => {
      onLicenseActivated(license);
      onClose();
    }, 1500);
  };

  const handleDemoLicense = () => {
    const demoLicense = licenseService.generateDemoLicense();
    licenseService.saveLicense(demoLicense);
    setSuccess('Licence de démonstration activée (30 jours) !');
    
    setTimeout(() => {
      onLicenseActivated(demoLicense);
      onClose();
    }, 1500);
  };

  const handleRemoveLicense = () => {
    licenseService.removeLicense();
    setSuccess('Licence supprimée');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          🔐 Activation de Licence - Klick Caisse
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Identifiant Machine: <Chip label={machineId} size="small" variant="outlined" />
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nom du client"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            fullWidth
            required
          />
          
          <TextField
            label="Email du client"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            fullWidth
            required
          />
          
          <TextField
            label="Clé de licence"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            fullWidth
            required
            placeholder="XXXX-XXXX-XXXX-XXXX"
          />
          
          <TextField
            label="Date d'expiration"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />

          <Box>
            <Typography variant="body2" gutterBottom>
              Fonctionnalités:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="Basic"
                color={features.includes('basic') ? 'primary' : 'default'}
                onClick={() => setFeatures(['basic'])}
                clickable
              />
              <Chip
                label="Premium"
                color={features.includes('premium') ? 'primary' : 'default'}
                onClick={() => setFeatures(['premium'])}
                clickable
              />
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            📋 Instructions
          </Typography>
          <Typography variant="body2" paragraph>
            1. Remplissez les informations client
          </Typography>
          <Typography variant="body2" paragraph>
            2. Entrez la clé de licence fournie
          </Typography>
          <Typography variant="body2" paragraph>
            3. Sélectionnez la date d'expiration
          </Typography>
          <Typography variant="body2">
            4. Cliquez sur "Activer la licence"
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleDemoLicense} variant="outlined" color="info">
          🎯 Licence Démo (30j)
        </Button>
        <Button onClick={handleRemoveLicense} variant="outlined" color="error">
          🗑️ Supprimer Licence
        </Button>
        <Button onClick={onClose} variant="outlined">
          Annuler
        </Button>
        <Button onClick={handleActivate} variant="contained" color="primary">
          🔑 Activer la Licence
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseActivationModal;
