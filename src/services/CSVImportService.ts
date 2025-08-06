import { Product, ProductVariation, Category, CSVProduct } from '../types/Product';

export class CSVImportService {
  
  // Convertit une ligne CSV en objet Product
  static parseCSVLine(line: CSVProduct): Product {
    return {
      id: line['Identifiant produit'],
      name: line['Nom'],
      ean13: line['ean13'],
      reference: line['Référence'],
      category: line['Nom catégorie par défaut'],
      wholesalePrice: parseFloat(line['wholesale_price']) || 0,
      finalPrice: parseFloat(line['Prix de vente TTC final']) || 0,
      crossedPrice: parseFloat(line['Prix barré TTC']) || 0,
      salesCount: 0, // Initialisé à 0
      position: 0,   // Position initiale
      variations: [] // Sera rempli lors du traitement
    };
  }

  // Traite le fichier CSV complet
  static processCSVData(csvData: CSVProduct[]): { products: Product[], categories: Category[] } {
    console.log('Début du traitement CSV avec', csvData.length, 'lignes');
    console.log('Première ligne exemple:', csvData[0]);
    
    const productsMap = new Map<string, Product>();
    const categoriesMap = new Map<string, Category>();
    
    // Première passe : créer les produits principaux
    csvData.forEach((line, index) => {
      const productId = line['Identifiant produit'];
      
      if (!productId) {
        console.warn('Ligne', index, 'ignorée: pas d\'identifiant produit');
        return;
      }
      
      if (!productsMap.has(productId)) {
        const product = this.parseCSVLine(line);
        product.position = index; // Position initiale
        productsMap.set(productId, product);
        
        if (index < 5) {
          console.log('Produit créé:', product.name, 'ID:', productId, 'Catégorie:', product.category);
        }
      }
      
      // Créer la catégorie si elle n'existe pas
      const categoryName = line['Nom catégorie par défaut'];
      if (categoryName && !categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, {
          id: categoryName,
          name: categoryName,
          color: this.generateCategoryColor(categoryName),
          productOrder: []
        });
        console.log('Catégorie créée:', categoryName);
      }
    });

    // Deuxième passe : traiter les déclinaisons
    csvData.forEach(line => {
      const productId = line['Identifiant produit'];
      const product = productsMap.get(productId);
      
      if (product && line['Identifiant déclinaison']) {
        const variation: ProductVariation = {
          id: line['Identifiant déclinaison'],
          ean13: line['ean13 décl.'],
          reference: line['Référence déclinaison'],
          attributes: line['Liste des attributs'],
          priceImpact: parseFloat(line['Impact sur prix de vente TTC']) || 0,
          finalPrice: product.finalPrice + (parseFloat(line['Impact sur prix de vente TTC']) || 0)
        };
        
        product.variations.push(variation);
      }
    });

    // Organiser les produits par catégorie
    productsMap.forEach(product => {
      const category = categoriesMap.get(product.category);
      if (category) {
        category.productOrder.push(product.id);
      }
    });

    const result = {
      products: Array.from(productsMap.values()),
      categories: Array.from(categoriesMap.values())
    };
    
    console.log('Résultat final:', result.products.length, 'produits,', result.categories.length, 'catégories');
    console.log('Premiers produits:', result.products.slice(0, 3).map(p => ({ id: p.id, name: p.name, category: p.category })));
    console.log('Catégories:', result.categories.map(c => c.name));
    
    return result;
  }

  // Génère une couleur pour chaque catégorie
  private static generateCategoryColor(categoryName: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    const hash = categoryName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }
} 