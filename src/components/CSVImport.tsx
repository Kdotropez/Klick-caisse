import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { Upload, CheckCircle, Error } from '@mui/icons-material';
import { CSVImportService } from '../services/CSVImportService';
import { StorageService } from '../services/StorageService';
import { Product, Category, CSVProduct } from '../types';
import CSVMapping from './CSVMapping';

interface CSVImportProps {
  onImportComplete: (products: Product[], categories: Category[]) => void;
}

const CSVImport: React.FC<CSVImportProps> = ({ onImportComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CSVProduct[]>([]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    products?: Product[];
    categories?: Category[];
    stats?: {
      totalProducts: number;
      totalCategories: number;
      totalVariations: number;
    };
  } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setImportResult(null);

    try {
      // Si JSON, déléguer directement au service JSON nested
      if (file.name.toLowerCase().endsWith('.json')) {
        const result = await CSVImportService.importJSONNested(file);
        if (!result.success) throw result.message;

        // Sauvegarde auto (silencieuse) avant fusion
        StorageService.addAutoBackup();

        // Fusion non destructive par Identifiant produit
        const existingProducts = StorageService.loadProducts();
        const idToIndex = new Map(existingProducts.map((p) => [p.id, p] as const));
        const mergedProducts = [...existingProducts];
        for (const np of result.products) {
          const existing = idToIndex.get(np.id);
          if (existing) {
            idToIndex.set(np.id, {
              ...existing,
              name: np.name || existing.name,
              category: np.category || existing.category,
              associatedCategories: (np.associatedCategories && np.associatedCategories.length > 0)
                ? np.associatedCategories
                : (existing.associatedCategories || []),
              finalPrice: Number.isFinite(np.finalPrice) ? np.finalPrice : existing.finalPrice,
              ean13: np.ean13 || existing.ean13,
              wholesalePrice: Number.isFinite(np.wholesalePrice) ? np.wholesalePrice : existing.wholesalePrice,
              crossedPrice: Number.isFinite(np.crossedPrice) ? np.crossedPrice : existing.crossedPrice,
              variations: (np.variations && np.variations.length > 0) ? np.variations : existing.variations,
            });
          } else {
            idToIndex.set(np.id, np);
            mergedProducts.push(np);
          }
        }

        const mergedById = new Map(mergedProducts.map(p => [p.id, p] as const));
        let finalProducts = Array.from(idToIndex.values());

        // Fusion des catégories par nom normalisé
        const existingCategories = StorageService.loadCategories();
        const norm = (s: string) => StorageService.normalizeLabel(s);
        const nameToCat = new Map(existingCategories.map(c => [norm(c.name), c] as const));
        for (const c of result.categories) {
          const key = norm(c.name);
          if (!nameToCat.has(key)) nameToCat.set(key, c);
        }
        const finalCategories = Array.from(nameToCat.values());

        // Mettre à jour le registre des sous-catégories depuis les produits importés
        const allowedSubsRaw = Array.from(new Set(
          result.products
            .flatMap(p => (p.associatedCategories || []))
            .map((s: string) => StorageService.sanitizeLabel(s))
            .map((s: string) => s.trim())
            .filter((s: string) => !!s)
        ));
        const normalize = (s: string) => StorageService.normalizeLabel(s);
        const allowedSet = new Set(allowedSubsRaw.map(normalize));
        finalProducts = finalProducts.map(p => ({
          ...p,
          associatedCategories: Array.from(new Set((p.associatedCategories || [])
            .map((s: string) => StorageService.sanitizeLabel(s))
            .map((s: string) => s.trim())
            .filter((s: string) => allowedSet.has(normalize(s))))),
        }));

        StorageService.saveProducts(finalProducts);
        StorageService.saveCategories(finalCategories);
        StorageService.saveSubcategories(allowedSubsRaw);

        const totalVariations = result.products.reduce(
          (sum: number, product: Product) => sum + product.variations.length,
          0
        );
        const stats = {
          totalProducts: result.products.length,
          totalCategories: result.categories.length,
          totalVariations: totalVariations,
        };

        setImportResult({
          success: true,
          message: `Import JSON réussi ! ${stats.totalProducts} produits, ${stats.totalCategories} catégories, ${stats.totalVariations} déclinaisons`,
          products: result.products,
          categories: result.categories,
          stats,
        });
        onImportComplete(StorageService.loadProducts(), StorageService.loadCategories());
        setIsLoading(false);
        return;
      }

      const fileContent = await file.text();
      console.log('Contenu du fichier lu, taille:', fileContent.length);

      const lines = fileContent.split('\n').filter(line => line.trim() !== '');
      console.log('Nombre de lignes non vides:', lines.length);

      if (lines.length < 2) {
        // eslint-disable-next-line no-throw-literal
        throw 'Fichier CSV invalide : pas assez de lignes';
      }

      // Parser les en-têtes
      const headers = lines[0].split('\t').map(header => header.trim().replace(/\r?\n/g, ''));
      console.log('En-têtes détectées:', headers);
      console.log('Nombre d\'en-têtes:', headers.length);

      const parsedData: CSVProduct[] = [];
      let validLines = 0;
      let skippedLines = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const values = line.split('\t').map(value => value.trim().replace(/\r?\n/g, ''));
        
        // Créer un objet avec les valeurs disponibles
        const row: any = {};
        
        // Mapper les valeurs aux en-têtes correspondantes
        for (let j = 0; j < Math.min(headers.length, values.length); j++) {
          row[headers[j]] = values[j] || '';
        }
        
        // Ajouter des valeurs vides pour les colonnes manquantes
        for (let j = values.length; j < headers.length; j++) {
          row[headers[j]] = '';
        }

        // Vérifier que nous avons au moins un identifiant produit
        if (row['Identifiant produit'] && row['Identifiant produit'].trim()) {
          parsedData.push(row as CSVProduct);
          validLines++;
          
          if (validLines <= 5) {
            console.log(`Ligne ${i + 1} valide:`, row['Nom'], 'ID:', row['Identifiant produit']);
          }
        } else {
          skippedLines++;
          if (skippedLines <= 5) {
            console.log(`Ligne ${i + 1} ignorée: pas d'identifiant produit`);
          }
        }
      }

      console.log(`Résultat du parsing: ${validLines} lignes valides, ${skippedLines} lignes ignorées`);
      console.log('Première ligne parsée:', parsedData[0]);
      console.log('Dernière ligne parsée:', parsedData[parsedData.length - 1]);

      setCsvHeaders(headers);
      setCsvData(parsedData);
      setShowMapping(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      setImportResult({
        success: false,
        message: `Erreur lors de l'import : ${typeof error === 'string' ? error : String(error)}`,
      });
      setIsLoading(false);
    }
  };

  const handleMappingComplete = async (mapping: Record<string, string>) => {
    setIsLoading(true);
    
    try {
      // Appliquer le mapping aux données
      const mappedData: CSVProduct[] = csvData.map(row => {
        const mappedRow: any = {};
        Object.entries(mapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn as keyof CSVProduct] !== undefined) {
            mappedRow[field] = row[csvColumn as keyof CSVProduct];
          } else {
            mappedRow[field] = '';
          }
        });
        return mappedRow as CSVProduct;
      });

      console.log('Données mappées:', mappedData.slice(0, 3));
      console.log('Nombre total de lignes mappées:', mappedData.length);

      // Traiter les données avec notre service
      const result = await CSVImportService.importCSV(selectedFile!, mapping);
      
      if (!result.success) {
        throw result.message;
      }
      
      // Calculer les statistiques
      const totalVariations = result.products.reduce(
        (sum: number, product: Product) => sum + product.variations.length,
        0
      );

      const stats = {
        totalProducts: result.products.length,
        totalCategories: result.categories.length,
        totalVariations: totalVariations,
      };

      // Sauvegarde auto (silencieuse) avant fusion
      StorageService.addAutoBackup();

      // Fusion non destructive par Identifiant produit
      const existingProducts = StorageService.loadProducts();
      const idToIndex = new Map(existingProducts.map((p) => [p.id, p] as const));
      const mergedProducts = [...existingProducts];
      for (const np of result.products) {
        const existing = idToIndex.get(np.id);
        if (existing) {
          // Mettre à jour des champs de base sans détruire d'autres propriétés
          idToIndex.set(np.id, {
            ...existing,
            name: np.name || existing.name,
            category: np.category || existing.category,
            associatedCategories: (np.associatedCategories && np.associatedCategories.length > 0)
              ? np.associatedCategories
              : (existing.associatedCategories || []),
            finalPrice: Number.isFinite(np.finalPrice) ? np.finalPrice : existing.finalPrice,
            ean13: np.ean13 || existing.ean13,
            wholesalePrice: Number.isFinite(np.wholesalePrice) ? np.wholesalePrice : existing.wholesalePrice,
            crossedPrice: Number.isFinite(np.crossedPrice) ? np.crossedPrice : existing.crossedPrice,
          });
        } else {
          idToIndex.set(np.id, np);
          mergedProducts.push(np);
        }
      }

      // Recomposer la liste fusionnée dans l'ordre d'origine + nouveaux
      const mergedById = new Map(mergedProducts.map(p => [p.id, p] as const));
      let finalProducts = Array.from(idToIndex.values());

      // Fusion des catégories par nom normalisé
      const existingCategories = StorageService.loadCategories();
      const norm = (s: string) => StorageService.normalizeLabel(s);
      const nameToCat = new Map(existingCategories.map(c => [norm(c.name), c] as const));
      for (const c of result.categories) {
        const key = norm(c.name);
        if (!nameToCat.has(key)) {
          nameToCat.set(key, c);
        }
      }
      const finalCategories = Array.from(nameToCat.values());

      // 1) Construire la liste autorisée uniquement à partir des produits importés
      const allowedSubsRaw = Array.from(new Set(
        result.products
          .flatMap(p => (p.associatedCategories || []))
          .map((s: string) => StorageService.sanitizeLabel(s))
          .map((s: string) => s.trim())
          .filter((s: string) => !!s)
      ));
      const normalize = (s: string) => StorageService.normalizeLabel(s);
      const allowedSet = new Set(allowedSubsRaw.map(normalize));

      // 2) Purifier toutes les lignes produits: ne garder que les nouvelles sous-catégories
      finalProducts = finalProducts.map(p => ({
        ...p,
        associatedCategories: Array.from(new Set((p.associatedCategories || [])
          .map((s: string) => StorageService.sanitizeLabel(s))
          .map((s: string) => s.trim())
          .filter((s: string) => allowedSet.has(normalize(s))))),
      }));

      // 3) Sauvegarder les données fusionnées
      StorageService.saveProducts(finalProducts);
      StorageService.saveCategories(finalCategories);

      // 4) Écraser le registre enregistré avec la nouvelle liste uniquement
      StorageService.saveSubcategories(allowedSubsRaw);

      setImportResult({
        success: true,
        message: `Import réussi ! ${stats.totalProducts} produits, ${stats.totalCategories} catégories, ${stats.totalVariations} déclinaisons`,
        products: result.products,
        categories: result.categories,
        stats: stats,
      });

      // Notifier le composant parent
      onImportComplete(result.products, result.categories);

    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      setImportResult({
        success: false,
        message: `Erreur lors du traitement : ${typeof error === 'string' ? error : String(error)}`,
      });
    } finally {
      setIsLoading(false);
      setShowMapping(false);
    }
  };

  const handleBackToFileUpload = () => {
    setShowMapping(false);
    setCsvHeaders([]);
    setCsvData([]);
    setImportResult(null);
  };

  if (showMapping) {
    return (
      <CSVMapping
        headers={csvHeaders}
        onMappingComplete={handleMappingComplete}
        onBack={handleBackToFileUpload}
      />
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Import de la base de données CSV
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sélectionnez votre fichier CSV pour importer vos 1800 produits
      </Typography>

      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <input
          accept=".csv,.json"
          style={{ display: 'none' }}
          id="csv-file-input"
          type="file"
          onChange={handleFileUpload}
          disabled={isLoading}
        />
        <label htmlFor="csv-file-input">
          <Button
            variant="contained"
            component="span"
            startIcon={isLoading ? <CircularProgress size={20} /> : <Upload />}
            disabled={isLoading}
            size="large"
          >
            {isLoading ? 'Lecture du fichier...' : 'Sélectionner le fichier CSV'}
          </Button>
        </label>
      </Box>

      {importResult && (
        <Alert 
          severity={importResult.success ? 'success' : 'error'}
          icon={importResult.success ? <CheckCircle /> : <Error />}
          sx={{ mb: 3 }}
        >
          {importResult.message}
        </Alert>
      )}

      {importResult?.success && importResult.stats && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Statistiques de l'import
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Produits principaux"
                secondary={importResult.stats.totalProducts}
              />
              <Chip label={importResult.stats.totalProducts} color="primary" />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Catégories"
                secondary={importResult.stats.totalCategories}
              />
              <Chip label={importResult.stats.totalCategories} color="secondary" />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Déclinaisons"
                secondary={importResult.stats.totalVariations}
              />
              <Chip label={importResult.stats.totalVariations} color="info" />
            </ListItem>
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default CSVImport; 