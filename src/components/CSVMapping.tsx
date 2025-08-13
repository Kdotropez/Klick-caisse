import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';

interface CSVMappingProps {
  headers: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  onBack: () => void;
}

const CSVMapping: React.FC<CSVMappingProps> = ({ headers, onMappingComplete, onBack }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({
    'Identifiant produit': 'Identifiant produit',
    'Nom': 'Nom',
    'ean13': 'ean13',
    'Référence': 'Référence',
    'Nom catégorie par défaut': 'Nom catégorie par défaut',
    'catégories associées': 'catégories associées',
    'wholesale_price': 'wholesale_price',
    'Prix de vente TTC final': 'Prix de vente TTC final',
    'Prix barré TTC': 'Prix barré TTC',
    'Identifiant déclinaison': 'Identifiant déclinaison',
    'ean13 décl.': 'ean13 décl.',
    'Référence déclinaison': 'Référence déclinaison',
    'Liste des attributs': 'Liste des attributs',
    'Impact sur prix de vente TTC': 'Impact sur prix de vente TTC',
  });

  const requiredFields = [
    'Identifiant produit',
    'Nom',
    'ean13',
    'Nom catégorie par défaut',
    'wholesale_price',
    'Prix de vente TTC final',
  ];

  const optionalFields = [
    'Référence',
    'catégories associées',
    'Prix barré TTC',
    'Identifiant déclinaison',
    'ean13 décl.',
    'Référence déclinaison',
    'Liste des attributs',
    'Impact sur prix de vente TTC',
    // Sous-catégories multi-colonnes (optionnelles)
    'Sous-catégorie 1',
    'Sous-catégorie 2',
    'Sous-catégorie 3',
    // Limité à 1..3 pour rester simple et propre
  ];

  const handleMappingChange = (field: string, value: string) => {
    setMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContinue = () => {
    onMappingComplete(mapping);
  };

  const isMappingValid = requiredFields.every(field => mapping[field] && headers.includes(mapping[field]));

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Configuration du mapping CSV
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Associez les champs requis aux colonnes de votre fichier CSV
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Colonnes détectées dans votre CSV :</strong> {headers.join(', ')}
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Champs obligatoires
        </Typography>
        <List dense>
          {requiredFields.map(field => (
            <ListItem key={field}>
              <ListItemText 
                primary={field}
                secondary="Champ obligatoire"
              />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Colonne CSV</InputLabel>
                <Select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  label="Colonne CSV"
                >
                  {headers.map(header => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Champs optionnels (déclinaisons)
        </Typography>
        <List dense>
          {optionalFields.map(field => (
            <ListItem key={field}>
              <ListItemText 
                primary={field}
                secondary="Champ optionnel"
              />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Colonne CSV</InputLabel>
                <Select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  label="Colonne CSV"
                >
                  <MenuItem value="">Aucune</MenuItem>
                  {headers.map(header => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItem>
          ))}
        </List>
      </Box>

      {!isMappingValid && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Veuillez mapper tous les champs obligatoires avant de continuer.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          onClick={onBack}
        >
          Retour
        </Button>
        <Button 
          variant="contained" 
          onClick={handleContinue}
          disabled={!isMappingValid}
          endIcon={<ArrowForward />}
        >
          Continuer avec ce mapping
        </Button>
      </Box>
    </Paper>
  );
};

export default CSVMapping; 