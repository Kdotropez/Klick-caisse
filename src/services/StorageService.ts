import { Product, Category } from '../types/Product';

export class StorageService {
  private static readonly PRODUCTS_KEY = 'klick_caisse_products';
  private static readonly CATEGORIES_KEY = 'klick_caisse_categories';
  private static readonly POSITIONS_KEY = 'klick_caisse_positions';

  // Sauvegarde les produits
  static saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des produits:', error);
    }
  }

  // Charge les produits
  static loadProducts(): Product[] {
    try {
      const data = localStorage.getItem(this.PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      return [];
    }
  }

  // Sauvegarde les catégories
  static saveCategories(categories: Category[]): void {
    try {
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des catégories:', error);
    }
  }

  // Charge les catégories
  static loadCategories(): Category[] {
    try {
      const data = localStorage.getItem(this.CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      return [];
    }
  }

  // Sauvegarde les positions par catégorie
  static saveProductPositions(categoryId: string, productOrder: string[]): void {
    try {
      const positions = this.loadAllPositions();
      positions[categoryId] = productOrder;
      localStorage.setItem(this.POSITIONS_KEY, JSON.stringify(positions));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des positions:', error);
    }
  }

  // Charge les positions pour une catégorie
  static loadProductPositions(categoryId: string): string[] {
    try {
      const positions = this.loadAllPositions();
      return positions[categoryId] || [];
    } catch (error) {
      console.error('Erreur lors du chargement des positions:', error);
      return [];
    }
  }

  // Charge toutes les positions
  private static loadAllPositions(): Record<string, string[]> {
    try {
      const data = localStorage.getItem(this.POSITIONS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur lors du chargement des positions:', error);
      return {};
    }
  }

  // Sauvegarde automatique (appelée après chaque modification)
  static autoSave(products: Product[], categories: Category[]): void {
    this.saveProducts(products);
    this.saveCategories(categories);
  }

  // Export des données en JSON (pour sauvegarde sur clé USB)
  static exportData(): string {
    try {
      const data = {
        products: this.loadProducts(),
        categories: this.loadCategories(),
        positions: this.loadAllPositions(),
        exportDate: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      return '';
    }
  }

  // Import des données depuis JSON
  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.products) {
        localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(data.products));
      }
      
      if (data.categories) {
        localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(data.categories));
      }
      
      if (data.positions) {
        localStorage.setItem(this.POSITIONS_KEY, JSON.stringify(data.positions));
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      return false;
    }
  }
} 