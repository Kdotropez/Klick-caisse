import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  IconButton
} from '@mui/material';
import { Close, Lock, CheckCircle, Error } from '@mui/icons-material';
import { validateLicenseCode, getTodayCode, getExpectedFormat, LicenseInfo } from '../utils/license';

interface LicenseModalProps {
  open: boolean;
  onLicenseValid: () => void;
}

const LicenseModal: React.FC<LicenseModalProps> = ({ open, onLicenseValid }) => {
  const [licenseCode, setLicenseCode] = useState('');
  const [validationResult, setValidationResult] = useState<LicenseInfo | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Réinitialiser quand la modale s'ouvre
  useEffect(() => {
    if (open) {
      setLicenseCode('');
      setValidationResult(null);
      setAttempts(0);
    }
  }, [open]);

  const handleValidate = async () => {
    if (!licenseCode.trim()) {
      setValidationResult({
        isValid: false,
        code: getTodayCode(),
        date: new Date().toLocaleDateString('fr-FR'),
        message: 'Veuillez saisir un code'
      });
      return;
    }

    setIsLoading(true);
    
    // Simuler un délai pour l'effet
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = validateLicenseCode(licenseCode.trim());
    setValidationResult(result);
    setAttempts(prev => prev + 1);
    setIsLoading(false);

    if (result.isValid) {
      // Attendre un peu avant de fermer
      setTimeout(() => {
        onLicenseValid();
      }, 1000);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleValidate();
    }
  };



  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ 
        backgroundColor: '#1976d2', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Code d'Autorisation Klick Caisse
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
            Veuillez saisir le code d'autorisation du jour pour accéder à l'application.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {getExpectedFormat()}
            </Typography>
          </Alert>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Code d'autorisation"
            value={licenseCode}
            onChange={(e) => setLicenseCode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Code à 4 chiffres"
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

                     <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
             <Typography variant="caption" sx={{ color: 'text.secondary' }}>
               Tentatives: {attempts}/5
             </Typography>
           </Box>
        </Box>

        {validationResult && (
          <Alert 
            severity={validationResult.isValid ? 'success' : 'error'}
            icon={validationResult.isValid ? <CheckCircle /> : <Error />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {validationResult.message}
            </Typography>
            {!validationResult.isValid && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Date: {validationResult.date} | Code attendu: {validationResult.code}
              </Typography>
            )}
          </Alert>
        )}

        {attempts >= 3 && !validationResult?.isValid && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Attention: Vous avez fait {attempts} tentatives. Le code change chaque jour.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
        <Button 
          onClick={handleValidate} 
          variant="contained" 
          disabled={isLoading || !licenseCode.trim()}
          startIcon={isLoading ? null : <CheckCircle />}
        >
          {isLoading ? 'Vérification...' : 'Valider'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseModal;
