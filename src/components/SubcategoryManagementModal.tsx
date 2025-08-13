import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Add, Save, Cancel } from '@mui/icons-material';
import { Category } from '../types/Product';
import { StorageService } from '../services/StorageService';

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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Extraire toutes les sous-catégories existantes depuis les produits + registre global
  const getAllExistingSubcategories = (): string[] => {
    const allSubcategories = new Set<string>(StorageService.loadSubcategories());
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

  // Extraire les sous-catégories pour une catégorie spécifique (mémoïsée pour CI)
  const getSubcategoriesForCategory = useCallback((categoryId: string): string[] => {
    const category = categories.find(cat => cat.id === categoryId) as (Category & { subcategoryOrder?: string[] }) | undefined;
    if (!category) return [];

    const subcatsSet = new Set<string>();
    products.forEach(product => {
      if (product.category === category.name && product.associatedCategories) {
        product.associatedCategories.forEach((subcat: string) => {
          const s = (subcat || '').trim();
          if (s) subcatsSet.add(s);
        });
      }
    });
    let list = Array.from(subcatsSet);
    const order = category.subcategoryOrder || [];
    if (order.length > 0) {
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/s$/i, '');
      list.sort((a, b) => {
        const ia = order.findIndex(o => norm(o) === norm(a));
        const ib = order.findIndex(o => norm(o) === norm(b));
        const aa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
        const bb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
        if (aa !== bb) return aa - bb;
        return a.localeCompare(b, 'fr', { sensitivity: 'base' });
      });
    } else {
      list.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    }
    return list;
  }, [categories, products]);

  // Mettre à jour les sous-catégories quand une catégorie est sélectionnée
  useEffect(() => {
    if (selectedCategory) {
      const categorySubcategories = getSubcategoriesForCategory(selectedCategory);
      setSubcategories(categorySubcategories);
      setError('');
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory, products, categories, getSubcategoriesForCategory]);

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
    // Mettre à jour le registre global
    StorageService.saveSubcategories(getAllExistingSubcategories());
    
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
    StorageService.saveSubcategories(getAllExistingSubcategories());
    
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
    if (window.confirm(`Êtes-vous sûr de vouloir retirer la sous-catégorie "${subcategoryToDelete}" de cette catégorie ?\n(Ceci ne la supprimera pas du système) `)) {
      const updatedSubcategories = subcategories.filter(subcat => subcat !== subcategoryToDelete);
      setSubcategories(updatedSubcategories);
      onUpdateSubcategories(selectedCategory, updatedSubcategories);
      // Ne pas supprimer du registre global
      StorageService.saveSubcategories(getAllExistingSubcategories());
    }
  };

  // Drag and drop ordering for subcategories
  const handleDragStart = (index: number) => () => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    const updated = [...subcategories];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setSubcategories(updated);
    if (selectedCategory) {
      onUpdateSubcategories(selectedCategory, updated);
    }
    StorageService.saveSubcategories(getAllExistingSubcategories());
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setEditingSubcategory(null);
    setEditSubcategoryName('');
    setNewSubcategoryName('');
    setError('');
  };

  const handleToggleSubcategory = (subcategoryToToggle: string) => {
    if (!selectedCategory) return;

    let updatedSubcategories: string[];
    
    if (subcategories.includes(subcategoryToToggle)) {
      // Désélectionner la sous-catégorie
      updatedSubcategories = subcategories.filter(subcat => subcat !== subcategoryToToggle);
    } else {
      // Sélectionner la sous-catégorie
      updatedSubcategories = [...subcategories, subcategoryToToggle].sort();
    }

    setSubcategories(updatedSubcategories);
    onUpdateSubcategories(selectedCategory, updatedSubcategories);
    StorageService.saveSubcategories(getAllExistingSubcategories());
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
                {subcategories.length} sous-catégorie(s) sélectionnée(s) sur {getAllExistingSubcategories().length} disponibles
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

            {/* Sous-catégories existantes (grille drag & drop) */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                Sous-catégories existantes (glisser-déposer pour réordonner)
              </Typography>
              {subcategories.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">Aucune sous-catégorie trouvée pour cette catégorie</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, backgroundColor: '#fafafa', borderRadius: 1, p: 1 }}>
                  {subcategories.map((subcategory, index) => (
                    <Chip
                      key={subcategory}
                      label={`${index + 1}. ${subcategory}`}
                      draggable
                      onDragStart={handleDragStart(index)}
                      onDragOver={(e) => { handleDragOver(e); setHoverIndex(index); }}
                      onDragEnter={() => setHoverIndex(index)}
                      onDragLeave={() => setHoverIndex(null)}
                      onDrop={(e) => { handleDrop(index)(e); setHoverIndex(null); }}
                      onDoubleClick={() => handleEditSubcategory(subcategory)}
                      onDelete={() => handleDeleteSubcategory(subcategory)}
                      sx={{
                        cursor: 'grab',
                        opacity: dragIndex === index ? 0.6 : 1,
                        border: hoverIndex === index ? '2px dashed #1976d2' : '1px solid #ddd',
                        backgroundColor: hoverIndex === index ? '#e3f2fd' : 'white',
                        '&:hover': { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }
                      }}
                    />
                  ))}
                </Box>
              )}

              {editingSubcategory && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={editSubcategoryName}
                    onChange={(e) => setEditSubcategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    label={`Renommer "${editingSubcategory}"`}
                  />
                  <IconButton size="small" onClick={handleSaveEdit} sx={{ color: 'success.main' }}>
                    <Save />
                  </IconButton>
                  <IconButton size="small" onClick={handleCancelEdit} sx={{ color: 'error.main' }}>
                    <Cancel />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Toutes les sous-catégories existantes dans le système */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#666', fontWeight: 'bold' }}>
                Toutes les sous-catégories du système
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cliquez sur une sous-catégorie pour l'ajouter ou la retirer de cette catégorie
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getAllExistingSubcategories().map((subcat) => {
                  const isSelected = subcategories.includes(subcat);
                  return (
                    <Chip
                      key={subcat}
                      label={subcat}
                      size="small"
                      variant="outlined"
                      onClick={() => handleToggleSubcategory(subcat)}
                      sx={{ 
                        backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                        borderColor: isSelected ? '#1976d2' : '#ddd',
                        color: isSelected ? '#1976d2' : '#666',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: isSelected ? '#bbdefb' : '#e8e8e8',
                          borderColor: isSelected ? '#1565c0' : '#bbb',
                          transform: 'scale(1.05)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        },
                        '&:active': {
                          transform: 'scale(0.95)'
                        }
                      }}
                    />
                  );
                })}
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
