import { Product, Category } from '../types/Product';

export class StorageService {
  private static readonly PRODUCTS_KEY = 'klick_caisse_products';
  private static readonly CATEGORIES_KEY = 'klick_caisse_categories';
  private static readonly SETTINGS_KEY = 'klick_caisse_settings';

  // Sauvegarder les produits
  static saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des produits:', error);
    }
  }

  // Charger les produits
  static loadProducts(): Product[] {
    try {
      const data = localStorage.getItem(this.PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      return [];
    }
  }

  // Sauvegarder les catégories
  static saveCategories(categories: Category[]): void {
    try {
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des catégories:', error);
    }
  }

  // Charger les catégories
  static loadCategories(): Category[] {
    try {
      const data = localStorage.getItem(this.CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      return [];
    }
  }

  // Sauvegarder les paramètres
  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  }

  // Charger les paramètres
  static loadSettings(): any {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      return {};
    }
  }

  // Exporter les données
  static exportData(): { products: Product[], categories: Category[], settings: any } {
    return {
      products: this.loadProducts(),
      categories: this.loadCategories(),
      settings: this.loadSettings()
    };
  }

  // Importer les données
  static importData(data: { products: Product[], categories: Category[], settings?: any }): void {
    this.saveProducts(data.products);
    this.saveCategories(data.categories);
    if (data.settings) {
      this.saveSettings(data.settings);
    }
  }

  // Effacer toutes les données
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.PRODUCTS_KEY);
      localStorage.removeItem(this.CATEGORIES_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
    }
  }

  // Vérifier si des données existent
  static hasData(): boolean {
    return !!(localStorage.getItem(this.PRODUCTS_KEY) || localStorage.getItem(this.CATEGORIES_KEY));
  }
} 