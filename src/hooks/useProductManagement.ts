import { useState, useMemo, useCallback } from 'react';
import { Product, Category } from '../types/Product';
import { StorageService } from '../services/StorageService';

export interface UseProductManagementProps {
  products: Product[];
  categories: Category[];
  onProductsReorder?: (newProducts: Product[]) => void;
}

export const useProductManagement = ({ products, categories, onProductsReorder }: UseProductManagementProps) => {
  // États de filtrage et tri
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [subcategorySearchTerm, setSubcategorySearchTerm] = useState('');
  const [productSortMode, setProductSortMode] = useState<'sales' | 'name'>('sales');
  const [currentPage, setCurrentPage] = useState(1);

  // États d'édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProductsForDeletion, setSelectedProductsForDeletion] = useState<Set<string>>(new Set());
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<Product | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Constantes
  const CARDS_PER_PAGE = 23;

  // Normaliser les décimaux pour rendre équivalents 8,5 / 8.5 / 8.50 → 8.50
  const normalizeDecimals = (s: string): string => {
    if (!s) return s;
    return s
      .replace(/,/g, '.')
      .replace(/(\d+)[.](\d)(?!\d)/g, '$1.$20');
  };

  // Calcul des quantités vendues par produit
  const dailyQtyByProduct = useMemo(() => {
    const qtyMap: Record<string, number> = {};
    // Logique pour calculer les quantités vendues
    // À implémenter selon vos besoins
    return qtyMap;
  }, []);

  // Produits filtrés
  const filteredProducts = useMemo(() => {
    let uniqueProducts = products;
    
    // Filtrage par recherche d'article
    if (searchTerm.trim()) {
      const normalizedSearch = StorageService.normalizeLabel(searchTerm.trim());
      const tokens = normalizedSearch.split(/\s+/).filter(t => t.length >= 2);
      
      uniqueProducts = uniqueProducts.filter(product => {
        const normalizedName = StorageService.normalizeLabel(product.name);
        return tokens.every(token => {
          // Recherche flexible : ordre indépendant, correspondance partielle
          return tokenMatches(normalizedName, token);
        });
      });
    }

    // Filtrage par catégorie
    if (selectedCategory) {
      uniqueProducts = uniqueProducts.filter(product => product.category === selectedCategory);
    }

    // Filtrage par sous-catégorie
    if (selectedSubcategory) {
      const normSelected = normalizeDecimals(StorageService.normalizeLabel(selectedSubcategory));
      uniqueProducts = uniqueProducts.filter(product => {
        if (!Array.isArray(product.associatedCategories)) return false;
        
        const cleaned = product.associatedCategories
          .map(sc => String(sc || '').trim())
          .filter(sc => sc && sc !== '\\u0000')
          .filter(sc => {
            const norm = StorageService.normalizeLabel(sc);
            const alnum = norm.replace(/[^a-z0-9]/g, '');
            return alnum.length >= 2;
          });

        return cleaned.some(sc => {
          const norm = normalizeDecimals(StorageService.normalizeLabel(sc));
          return norm === normSelected;
        });
      });
    }

    return uniqueProducts;
  }, [products, searchTerm, selectedCategory, selectedSubcategory]);

  // Fonction de correspondance de tokens
  const tokenMatches = (text: string, token: string): boolean => {
    if (token.length < 2) return true;
    
    // Correspondance directe
    if (text.includes(token)) return true;
    
    // Correspondance par caractères consécutifs
    let tokenIndex = 0;
    for (let i = 0; i < text.length && tokenIndex < token.length; i++) {
      if (text[i] === token[tokenIndex]) {
        tokenIndex++;
      }
    }
    return tokenIndex === token.length;
  };

  // Produits triés et paginés
  const sortedAndFilteredProducts = useMemo(() => {
    if (isEditMode) {
      return filteredProducts;
    }

    return [...filteredProducts].sort((a, b) => {
      if (productSortMode === 'sales') {
        const qa = dailyQtyByProduct[a.id] || 0;
        const qb = dailyQtyByProduct[b.id] || 0;
        if (qa !== qb) return qb - qa;
      } else if (productSortMode === 'name') {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
      }
      
      // Fallback stable
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.id.localeCompare(b.id);
    });
  }, [filteredProducts, isEditMode, productSortMode, dailyQtyByProduct]);

  // Produits de la page courante
  const currentProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
    const endIndex = startIndex + CARDS_PER_PAGE;
    return sortedAndFilteredProducts.slice(startIndex, endIndex);
  }, [sortedAndFilteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / CARDS_PER_PAGE);

  // Actions
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setCategorySearchTerm('');
    setSubcategorySearchTerm('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setCurrentPage(1);
  }, []);

  const deleteSelectedProducts = useCallback(() => {
    const ids = Array.from(selectedProductsForDeletion);
    if (ids.length === 0) return;
    
    if (!confirm(`Supprimer ${ids.length} article(s) sélectionné(s) ?`)) return;
    
    const updatedProducts = products.filter(p => !ids.includes(p.id));
    onProductsReorder?.(updatedProducts);
    setSelectedProductsForDeletion(new Set());
  }, [selectedProductsForDeletion, products, onProductsReorder]);

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProductsForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  // Drag & Drop
  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    setDraggedProduct(product);
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, product: Product) => {
    e.preventDefault();
    setDragOverProduct(product);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    setDragOverProduct(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetProduct: Product) => {
    e.preventDefault();
    if (!draggedProduct || draggedProduct.id === targetProduct.id) return;

    const draggedIndex = products.findIndex(p => p.id === draggedProduct.id);
    const targetIndex = products.findIndex(p => p.id === targetProduct.id);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newProducts = [...products];
    // Échange direct des positions
    [newProducts[draggedIndex], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[draggedIndex]];
    
    onProductsReorder?.(newProducts);
    setDragOverProduct(null);
  }, [draggedProduct, products, onProductsReorder]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedProduct(null);
    setDragOverProduct(null);
    setIsDragging(false);
  }, []);

  return {
    // États
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    searchTerm,
    setSearchTerm,
    categorySearchTerm,
    setCategorySearchTerm,
    subcategorySearchTerm,
    setSubcategorySearchTerm,
    productSortMode,
    setProductSortMode,
    currentPage,
    setCurrentPage,
    isEditMode,
    setIsEditMode,
    selectedProductsForDeletion,
    setSelectedProductsForDeletion,
    draggedProduct,
    dragOverProduct,
    isDragging,

    // Données calculées
    filteredProducts,
    currentProducts,
    totalPages,
    dailyQtyByProduct,

    // Actions
    resetFilters,
    deleteSelectedProducts,
    toggleProductSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    normalizeDecimals,
  };
};
