import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Delete, Edit, Add, Save, Cancel } from '@mui/icons-material';
import { Category } from '../types/Product';

interface SubcategoryManagementModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  products: any[]; // Pour extraire les sous-catégories existantes
  onUpdateSubcategories: (categoryId: string, subcategories: string[]) => void;
}

const SubcategoryManagementModal: React.FC<SubcategoryManagementModalProps> = ({
  open,
  onClose,
  categories,
  products,
  onUpdateSubcategories
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [error, setError] = useState('');

  // Extraire toutes les sous-catégories existantes depuis les produits
  const getAllExistingSubcategories = (): string[] => {
    const allSubcategories = new Set<string>();
    products.forEach(product => {
      if (product.associatedCategories) {
        product.associatedCategories.forEach((subcat: string) => {
          if (subcat && subcat.trim()) {
            allSubcategories.add(subcat.trim());
          }
        });
      }
    });
    return Array.from(allSubcategories).sort();
  };

  // Extraire les sous-catégories pour une catégorie spécifique
  const getSubcategoriesForCategory = (categoryId: string): string[] => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return [];

    const subcategories = new Set<string>();
    products.forEach(product => {
      if (product.category === category.name && product.associatedCategories) {
        product.associatedCategories.forEach((subcat: string) => {
          if (subcat && subcat.trim()) {
            subcategories.add(subcat.trim());
          }
        });
      }
    });
    return Array.from(subcategories).sort();
  };

  // Mettre à jour les sous-catégories quand une catégorie est sélectionnée
  useEffect(() => {
    if (selectedCategory) {
      const categorySubcategories = getSubcategoriesForCategory(selectedCategory);
      setSubcategories(categorySubcategories);
      setError('');
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory, products]);

  const handleAddSubcategory = () => {
    if (!selectedCategory) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }

    if (!newSubcategoryName.trim()) {
      setError('Le nom de la sous-catégorie est requis');
      return;
    }

    if (subcategories.some(subcat => subcat.toLowerCase() === newSubcategoryName.toLowerCase())) {
      setError('Une sous-catégorie avec ce nom existe déjà');
      return;
    }

    const updatedSubcategories = [...subcategories, newSubcategoryName.trim()].sort();
    setSubcategories(updatedSubcategories);
    onUpdateSubcategories(selectedCategory, updatedSubcategories);
    
    setNewSubcategoryName('');
    setError('');
  };

  const handleEditSubcategory = (subcategory: string) => {
    setEditingSubcategory(subcategory);
    setEditSubcategoryName(subcategory);
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editingSubcategory || !editSubcategoryName.trim()) {
      setError('Le nom de la sous-catégorie est requis');
      return;
    }

    const existingSubcategory = subcategories.find(subcat => 
      subcat !== editingSubcategory && 
      subcat.toLowerCase() === editSubcategoryName.toLowerCase()
    );

    if (existingSubcategory) {
      setError('Une sous-catégorie avec ce nom existe déjà');
      return;
    }

    const updatedSubcategories = subcategories.map(subcat =>
      subcat === editingSubcategory ? editSubcategoryName.trim() : subcat
    ).sort();

    setSubcategories(updatedSubcategories);
    onUpdateSubcategories(selectedCategory, updatedSubcategories);
    
    setEditingSubcategory(null);
    setEditSubcategoryName('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingSubcategory(null);
    setEditSubcategoryName('');
    setError('');
  };

  const handleDeleteSubcategory = (subcategoryToDelete: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la sous-catégorie "${subcategoryToDelete}" ?`)) {
      const updatedSubcategories = subcategories.filter(subcat => subcat !== subcategoryToDelete);
      setSubcategories(updatedSubcategories);
      onUpdateSubcategories(selectedCategory, updatedSubcategories);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setEditingSubcategory(null);
    setEditSubcategoryName('');
    setNewSubcategoryName('');
    setError('');
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : '';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Gestion des Sous-catégories
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Sélection de la catégorie */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Sélectionner une catégorie</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              label="Sélectionner une catégorie"
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: category.color || '#757575',
                        borderRadius: '50%'
                      }}
                    />
                    {category.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {selectedCategory && (
          <>
            {/* Informations sur la catégorie sélectionnée */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#1976d2' }}>
                Catégorie : {getCategoryName(selectedCategory)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subcategories.length} sous-catégorie(s) trouvée(s)
              </Typography>
            </Box>

            {/* Ajout de nouvelle sous-catégorie */}
            <Box sx={{ mb: 3, p: 2, border: '2px dashed #1976d2', borderRadius: 1, backgroundColor: '#f0f8ff' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
                Ajouter une nouvelle sous-catégorie
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nom de la sous-catégorie"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory()}
                />
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddSubcategory}
                  disabled={!newSubcategoryName.trim()}
                  size="small"
                >
                  Ajouter
                </Button>
              </Box>
            </Box>

            {/* Liste des sous-catégories existantes */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                Sous-catégories existantes
              </Typography>
              
              {subcategories.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">
                    Aucune sous-catégorie trouvée pour cette catégorie
                  </Typography>
                </Box>
              ) : (
                <List sx={{ backgroundColor: '#fafafa', borderRadius: 1 }}>
                  {subcategories.map((subcategory, index) => (
                    <React.Fragment key={subcategory}>
                      <ListItem>
                        {editingSubcategory === subcategory ? (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={editSubcategoryName}
                              onChange={(e) => setEditSubcategoryName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            />
                            <IconButton
                              size="small"
                              onClick={handleSaveEdit}
                              sx={{ color: 'success.main' }}
                            >
                              <Save />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                              sx={{ color: 'error.main' }}
                            >
                              <Cancel />
                            </IconButton>
                          </Box>
                        ) : (
                          <>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Chip 
                                    label={`${index + 1}`} 
                                    size="small" 
                                    sx={{ 
                                      backgroundColor: '#1976d2', 
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }} 
                                  />
                                  <Typography variant="body1">
                                    {subcategory}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                size="small"
                                onClick={() => handleEditSubcategory(subcategory)}
                                sx={{ color: 'primary.main', mr: 1 }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteSubcategory(subcategory)}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </>
                        )}
                      </ListItem>
                      {index < subcategories.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            {/* Toutes les sous-catégories existantes dans le système */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#666', fontWeight: 'bold' }}>
                Toutes les sous-catégories du système
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getAllExistingSubcategories().map((subcat) => (
                  <Chip
                    key={subcat}
                    label={subcat}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      backgroundColor: subcategories.includes(subcat) ? '#e3f2fd' : '#f5f5f5',
                      borderColor: subcategories.includes(subcat) ? '#1976d2' : '#ddd'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        backgroundColor: '#f5f5f5',
        borderTop: '2px solid #e0e0e0'
      }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubcategoryManagementModal;
