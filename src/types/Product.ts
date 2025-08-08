// Types pour les produits et déclinaisons
export interface Product {
  id: string;                    // Identifiant produit
  name: string;                  // Nom
  ean13: string;                 // Code-barre principal
  reference: string;             // Référence
  category: string;              // Nom catégorie par défaut
  associatedCategories?: string[]; // Catégories associées (sous-familles) - optionnel pour compatibilité
  wholesalePrice: number;        // Prix de vente HT (prix d'achat)
  finalPrice: number;            // Prix de vente TTC final
  crossedPrice: number;          // Prix barré TTC
  salesCount: number;            // Compteur de ventes
  position: number;              // Position dans la grille (pour drag & drop)
  remisable: boolean;            // Si le produit peut recevoir une remise globale
  variations: ProductVariation[]; // Déclinaisons
}

export interface ProductVariation {
  id: string;                    // Identifiant déclinaison
  ean13: string;                 // ean13 déclinaison
  reference: string;             // Référence déclinaison
  attributes: string;            // Liste des attributs (taille, couleur, etc.)
  priceImpact: number;           // Impact sur prix de vente TTC
  finalPrice: number;            // Prix final de la déclinaison
}

export interface Category {
  id: string;
  name: string;
  color?: string;                // Optionnel pour compatibilité
  productOrder?: string[];       // Optionnel pour compatibilité
}

export interface CSVProduct {
  'Identifiant boutique': string;
  'Nom': string;
  'Identifiant produit': string;
  'Référence': string;
  'Photo (couverture)': string;
  'ean13': string;
  'Référence fournisseur': string;
  'Nom catégorie par défaut': string;
  'wholesale_price': string;
  'Prix de vente HT': string;
  'Liste catégories associées (IDs)': string;
  'Prix de vente TTC avant remises': string;
  'Montant de la remise': string;
  'Prix barré TTC': string;
  'Prix de vente TTC final': string;
  'Quantité disponible à la vente': string;
  'Déclinaison par défaut ?': string;
  'Liste des attributs': string;
  'Photo': string;
  'Identifiant déclinaison': string;
  'ean13 décl.': string;
  'Référence déclinaison': string;
  'Référence fournisseur déclinaison': string;
  'Impact sur prix de vente (HT/TTC suivant PS version)': string;
  'Impact sur prix de vente TTC': string;
}

// Types pour le panier et les transactions
export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: ProductVariation;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'sumup';
  cashierName: string;
  timestamp: Date;
}