import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { ExpandMore, TrendingUp, ShoppingCart, Euro } from '@mui/icons-material';
import { StorageService } from '../../services/StorageService';

interface HistoricalReportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ClosureData {
  zNumber: number;
  closedAt: string;
  transactions: any[];
}

interface ProductSalesData {
  productName: string;
  category?: string;
  subcategory?: string;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
  transactionsCount: number;
}

interface DailyStats {
  date: string;
  zNumber: number;
  totalCA: number;
  totalTransactions: number;
  totalItems: number;
  totalDiscounts: number;
  paymentMethods: Record<string, number>;
}

const HistoricalReportModal: React.FC<HistoricalReportModalProps> = ({ open, onClose }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedReportType, setSelectedReportType] = useState<'summary' | 'products' | 'categories' | 'daily'>('summary');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('custom');

  // Charger toutes les clôtures
  const allClosures = useMemo(() => {
    const closures = StorageService.loadClosures() as ClosureData[];
    console.log(`[DEBUG] Clôtures chargées:`, closures);
    console.log(`[DEBUG] Nombre de clôtures:`, closures.length);
    
    // Debug localStorage
    console.log(`[DEBUG] closures (boutique courante):`, closures.length);
    
    // Vérifier toutes les clés localStorage
    const allKeys = Object.keys(localStorage).filter(key => key.includes('klick_caisse'));
    console.log(`[DEBUG] Toutes les clés klick_caisse:`, allKeys);
    
    return closures;
  }, []);

  // Fonction pour calculer les dates selon la période sélectionnée
  const getPeriodDates = (period: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    console.log(`[DEBUG] Date actuelle: ${today.toISOString()}, Année: ${currentYear}, Mois: ${currentMonth}`);
    
    switch (period) {
             case 'current_month':
         // Mois en cours : du 1er au dernier jour du mois actuel
         const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
         const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
         const currentMonthDates = {
           start: firstDayOfMonth.toISOString().split('T')[0],
           end: lastDayOfMonth.toISOString().split('T')[0]
         };
         console.log(`[DEBUG] Mois en cours: ${currentMonthDates.start} - ${currentMonthDates.end}`);
         console.log(`[DEBUG] Date actuelle: ${today.toISOString().split('T')[0]}, Mois: ${currentMonth + 1}`);
         console.log(`[DEBUG] Premier jour: ${firstDayOfMonth.toISOString().split('T')[0]}, Dernier jour: ${lastDayOfMonth.toISOString().split('T')[0]}`);
         return currentMonthDates;
         
       case 'last_month':
         // Mois précédent : du 1er au dernier jour du mois précédent
         const firstDayOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
         const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
         const lastMonthDates = {
           start: firstDayOfLastMonth.toISOString().split('T')[0],
           end: lastDayOfLastMonth.toISOString().split('T')[0]
         };
         console.log(`[DEBUG] Mois précédent: ${lastMonthDates.start} - ${lastMonthDates.end}`);
         console.log(`[DEBUG] Premier jour: ${firstDayOfLastMonth.toISOString().split('T')[0]}, Dernier jour: ${lastDayOfLastMonth.toISOString().split('T')[0]}`);
         return lastMonthDates;
        
      case 'current_year':
        const currentYearDates = {
          start: `${currentYear}-01-01`,
          end: `${currentYear}-12-31`
        };
        console.log(`[DEBUG] Année en cours: ${currentYearDates.start} - ${currentYearDates.end}`);
        return currentYearDates;
        
      case 'last_year':
        const lastYearDates = {
          start: `${currentYear - 1}-01-01`,
          end: `${currentYear - 1}-12-31`
        };
        console.log(`[DEBUG] Année précédente: ${lastYearDates.start} - ${lastYearDates.end}`);
        return lastYearDates;
        
      case 'all':
        console.log(`[DEBUG] Toutes les clôtures sélectionnées`);
        return { start: '', end: '' };
        
      default:
        console.log(`[DEBUG] Période personnalisée: ${startDate} - ${endDate}`);
        return { start: startDate, end: endDate };
    }
  };

  // Filtrer les clôtures par période
  const filteredClosures = useMemo(() => {
    const { start, end } = getPeriodDates(selectedPeriod);
    
    console.log(`[DEBUG] Période sélectionnée: ${selectedPeriod}, Dates: ${start} - ${end}`);
    console.log(`[DEBUG] Nombre total de clôtures: ${allClosures.length}`);
    
    if (!start && !end) {
      console.log(`[DEBUG] Aucun filtre de date - toutes les clôtures incluses`);
      return allClosures;
    }
    
    const filtered = allClosures.filter(closure => {
      const closureDate = new Date(closure.closedAt).toISOString().split('T')[0];
      const startDate = start || '1900-01-01';
      const endDate = end || '2100-12-31';
      
      const isInRange = closureDate >= startDate && closureDate <= endDate;
      console.log(`[DEBUG] Clôture Z${closure.zNumber} du ${closureDate}: ${isInRange ? 'INCLUSE' : 'EXCLUE'} (${startDate} <= ${closureDate} <= ${endDate})`);
      
      return isInRange;
    });
    
    console.log(`[DEBUG] Clôtures filtrées: ${filtered.length} sur ${allClosures.length}`);
    return filtered;
  }, [allClosures, selectedPeriod, startDate, endDate]);

  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    const stats = {
      totalCA: 0,
      totalTransactions: 0,
      totalItems: 0,
      totalDiscounts: 0,
      totalDays: filteredClosures.length,
      paymentMethods: {} as Record<string, number>,
      topProducts: [] as ProductSalesData[],
      categories: new Map<string, { totalQuantity: number; totalRevenue: number; productsCount: number }>()
    };

    const productMap = new Map<string, ProductSalesData>();

    filteredClosures.forEach(closure => {
      console.log(`[DEBUG] Traitement clôture Z${closure.zNumber} du ${closure.closedAt}`);
      console.log(`[DEBUG] Nombre de transactions: ${closure.transactions.length}`);
      console.log(`[DEBUG] Structure de la clôture:`, closure);
      
      if (!closure.transactions || !Array.isArray(closure.transactions)) {
        console.log(`[DEBUG] ❌ Clôture Z${closure.zNumber} n'a pas de transactions valides`);
        return;
      }
      
      closure.transactions.forEach((tx: any, txIndex: number) => {
        console.log(`[DEBUG] Transaction ${txIndex + 1}:`, tx);
        console.log(`[DEBUG] Transaction ${txIndex + 1} - total: ${tx.total}, items: ${tx.items?.length || 0}`);
        console.log(`[DEBUG] Transaction ${txIndex + 1} - structure complète:`, JSON.stringify(tx, null, 2));
         
                 // Calculer le CA net (avec remises déduites)
        let transactionTotal = tx.total || 0;
        let transactionDiscounts = 0;
        
        // Remises globales
        if (tx.globalDiscount) {
          transactionDiscounts += tx.globalDiscount;
        }
        
        // Remises par article
        if (tx.itemDiscounts) {
          Object.values(tx.itemDiscounts).forEach((discount: any) => {
            if (discount.type === 'euro') {
              transactionDiscounts += (discount.value || 0) * (tx.items?.length || 0);
            }
          });
        }
        
        // CA net = CA brut - remises
        const netCA = transactionTotal - transactionDiscounts;
        stats.totalCA += netCA;
        stats.totalDiscounts += transactionDiscounts;
        stats.totalTransactions++;

        // Méthodes de paiement (utiliser le CA net)
        const paymentMethod = tx.paymentMethod || 'Inconnu';
        const methodKey = paymentMethod.toLowerCase().includes('esp') || paymentMethod === 'cash' ? 'Espèces' :
                         paymentMethod.toLowerCase().includes('carte') || paymentMethod === 'card' ? 'Carte' : 'SumUp';
        stats.paymentMethods[methodKey] = (stats.paymentMethods[methodKey] || 0) + netCA;

                 // Articles vendus - Utiliser la même logique que computeDailyProductSales
         tx.items?.forEach((item: any, itemIndex: number) => {
           // Utiliser la structure standard des items comme dans computeDailyProductSales
           const product = item.product;
           const quantity = item.quantity || 0;
           
           // Calculer le prix final comme dans computeDailyProductSales
           const finalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : product?.finalPrice || 0;
           const itemTotal = finalPrice * quantity;
           
           stats.totalItems += quantity;
           
           // Utiliser le nom du produit depuis l'objet product
           const productName = product?.name || 'Produit sans nom';
           const productId = product?.id || item.id || `item-${itemIndex}`;
           
           // Récupérer la catégorie et sous-catégorie depuis le produit
           const category = product?.category?.name || product?.category || '';
           const subcategory = product?.subcategory?.name || product?.subcategory || '';
           
           console.log(`[DEBUG] Item ${itemIndex + 1}: ${productName} (ID: ${productId}) - Qté: ${quantity} - Prix: ${finalPrice}€ - Total: ${itemTotal}€`);
           
           const existing = productMap.get(productId);
           
           if (existing) {
             existing.totalQuantity += quantity;
             existing.totalRevenue += itemTotal;
             existing.transactionsCount++;
             existing.averagePrice = existing.totalRevenue / existing.totalQuantity;
           } else {
             productMap.set(productId, {
               productName,
               category,
               subcategory,
               totalQuantity: quantity,
               totalRevenue: itemTotal,
               averagePrice: finalPrice,
               transactionsCount: 1
             });
           }
           
           // Ajouter aux statistiques par catégorie
           if (category) {
             const existingCategory = stats.categories.get(category);
             if (existingCategory) {
               existingCategory.totalQuantity += quantity;
               existingCategory.totalRevenue += itemTotal;
               existingCategory.productsCount++;
             } else {
               stats.categories.set(category, {
                 totalQuantity: quantity,
                 totalRevenue: itemTotal,
                 productsCount: 1
               });
             }
           }
         });
      });
    });

    // Liste complète des produits (plus de limite top20)
    stats.topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return stats;
  }, [filteredClosures]);

  // Tri pour Détail Produits
  const [productsSortKey, setProductsSortKey] = useState<'productName' | 'category' | 'subcategory' | 'totalQuantity' | 'totalRevenue' | 'averagePrice' | 'transactionsCount' | 'percentage'>('totalRevenue');
  const [productsSortDir, setProductsSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleProductsSort = (key: 'productName' | 'category' | 'subcategory' | 'totalQuantity' | 'totalRevenue' | 'averagePrice' | 'transactionsCount' | 'percentage') => {
    if (productsSortKey === key) {
      setProductsSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setProductsSortKey(key);
      setProductsSortDir('desc');
    }
  };
  const sortArrow = (key: typeof productsSortKey) => productsSortKey === key ? (productsSortDir === 'asc' ? ' ▲' : ' ▼') : '';

  // Calculer les statistiques par jour
  const dailyStats = useMemo(() => {
    const dailyMap = new Map<string, DailyStats>();

    filteredClosures.forEach(closure => {
      const date = new Date(closure.closedAt).toISOString().split('T')[0];
      const existing = dailyMap.get(date);
      
      const dayStats: DailyStats = {
        date,
        zNumber: closure.zNumber,
        totalCA: 0,
        totalTransactions: 0,
        totalItems: 0,
        totalDiscounts: 0,
        paymentMethods: {}
      };

      closure.transactions.forEach((tx: any) => {
        // Calculer le CA net (avec remises déduites)
        let transactionTotal = tx.total || 0;
        let transactionDiscounts = 0;
        
        // Remises globales
        if (tx.globalDiscount) {
          transactionDiscounts += tx.globalDiscount;
        }
        
        // Remises par article
        if (tx.itemDiscounts) {
          Object.values(tx.itemDiscounts).forEach((discount: any) => {
            if (discount.type === 'euro') {
              transactionDiscounts += (discount.value || 0) * (tx.items?.length || 0);
            }
          });
        }
        
        // CA net = CA brut - remises
        const netCA = transactionTotal - transactionDiscounts;
        dayStats.totalCA += netCA;
        dayStats.totalDiscounts += transactionDiscounts;
        dayStats.totalTransactions++;

        // Méthodes de paiement (utiliser le CA net)
        const paymentMethod = tx.paymentMethod || 'Inconnu';
        const methodKey = paymentMethod.toLowerCase().includes('esp') || paymentMethod === 'cash' ? 'Espèces' :
                         paymentMethod.toLowerCase().includes('carte') || paymentMethod === 'card' ? 'Carte' : 'SumUp';
        dayStats.paymentMethods[methodKey] = (dayStats.paymentMethods[methodKey] || 0) + netCA;

        // Articles
        tx.items?.forEach((item: any) => {
          dayStats.totalItems += item.quantity || 0;
        });
      });

      if (existing) {
        existing.totalCA += dayStats.totalCA;
        existing.totalTransactions += dayStats.totalTransactions;
        existing.totalItems += dayStats.totalItems;
        existing.totalDiscounts += dayStats.totalDiscounts;
        Object.entries(dayStats.paymentMethods).forEach(([method, amount]) => {
          existing.paymentMethods[method] = (existing.paymentMethods[method] || 0) + amount;
        });
      } else {
        dailyMap.set(date, dayStats);
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredClosures]);

  const toNum = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const formatCurrency = (amount: any) => `${toNum(amount).toFixed(2)} €`;
  const formatPercent1 = (v: any) => `${toNum(v).toFixed(1)}%`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
          📊 Rapport Historique
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyse des clôtures cumulées
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Filtres */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Période prédéfinie */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Période</InputLabel>
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  label="Période"
                >
                  <MenuItem value="all">Toutes les clôtures</MenuItem>
                  <MenuItem value="current_month">Mois en cours</MenuItem>
                  <MenuItem value="last_month">Mois précédent</MenuItem>
                  <MenuItem value="current_year">Année en cours</MenuItem>
                  <MenuItem value="last_year">Année précédente</MenuItem>
                  <MenuItem value="custom">Période personnalisée</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Type de rapport */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type de rapport</InputLabel>
                                 <Select
                   value={selectedReportType}
                   onChange={(e) => setSelectedReportType(e.target.value as any)}
                   label="Type de rapport"
                 >
                   <MenuItem value="summary">Résumé global</MenuItem>
                   <MenuItem value="products">Détail produits</MenuItem>
                   <MenuItem value="categories">Par catégorie</MenuItem>
                   <MenuItem value="daily">Par jour</MenuItem>
                 </Select>
              </FormControl>
            </Grid>

                         {/* Nombre de clôtures */}
             <Grid item xs={12} sm={3}>
               <Chip 
                 label={`${filteredClosures.length} clôture(s)`}
                 color="primary"
                 variant="outlined"
                 sx={{ height: '40px', fontSize: '0.9rem' }}
               />
             </Grid>
             
             {/* Bouton de récupération */}
             <Grid item xs={12} sm={3}>
               <Button
                 variant="outlined"
                 color="warning"
                 size="small"
                 onClick={() => {
                   if (window.confirm('Récupérer les clôtures depuis les transactions ? Cette action va analyser les transactions quotidiennes et créer des clôtures.')) {
                     try {
                       const { created, merged } = StorageService.recoverClosuresFromTransactionsByDay(true);
                       if (merged > 0) {
                         alert(`✅ Clôtures mises à jour (${created} créée(s), ${merged} au total). Rechargement…`);
                         window.location.reload();
                       } else {
                         alert('❌ Aucune clôture récupérée. Vérifiez les transactions archivées.');
                       }
                     } catch (error) {
                       console.error('Erreur lors de la récupération:', error);
                       alert('Erreur lors de la récupération. Vérifiez la console.');
                     }
                   }
                 }}
                 sx={{ height: '40px', fontSize: '0.8rem' }}
               >
                 🔄 Récupérer
               </Button>
             </Grid>

            {/* Champs de date personnalisés (visible seulement si période personnalisée) */}
            {selectedPeriod === 'custom' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date de début"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date de fin"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            {/* Affichage de la période sélectionnée */}
            {selectedPeriod !== 'custom' && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Période sélectionnée :
                  </Typography>
                  <Chip 
                    label={(() => {
                      const { start, end } = getPeriodDates(selectedPeriod);
                      if (!start && !end) return 'Toutes les clôtures';
                      return `${formatDate(start)} - ${formatDate(end)}`;
                    })()}
                    color="secondary"
                    size="small"
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Rapport Résumé Global */}
        {selectedReportType === 'summary' && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              📈 Résumé Global
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Euro color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="primary">
                        {formatCurrency(globalStats.totalCA)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      CA Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ShoppingCart color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="primary">
                        {globalStats.totalTransactions}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Transactions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TrendingUp color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="primary">
                        {globalStats.totalItems}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Articles vendus
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Euro color="error" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="error">
                        {formatCurrency(globalStats.totalDiscounts)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Remises totales
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Méthodes de paiement */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">💳 Méthodes de paiement</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {Object.entries(globalStats.paymentMethods).map(([method, amount]) => (
                    <Grid item xs={12} sm={4} key={method}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(amount)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {method}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Top produits */}
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">🏆 Top 20 Produits</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produit</TableCell>
                        <TableCell align="right">Quantité</TableCell>
                        <TableCell align="right">CA</TableCell>
                        <TableCell align="right">Prix moyen</TableCell>
                        <TableCell align="right">Transactions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {globalStats.topProducts.map((product, index) => (
                        <TableRow key={product.productName}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip 
                                label={`#${index + 1}`} 
                                size="small" 
                                color="primary" 
                                sx={{ mr: 1, minWidth: 30 }}
                              />
                              {product.productName}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{product.totalQuantity}</TableCell>
                          <TableCell align="right">{formatCurrency(product.totalRevenue)}</TableCell>
                          <TableCell align="right">{formatCurrency(product.averagePrice)}</TableCell>
                          <TableCell align="right">{product.transactionsCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

                 {/* Rapport Détail Produits */}
         {selectedReportType === 'products' && (
           <Box>
             <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
               📦 Détail des Produits
             </Typography>
             
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rang</TableCell>
                    <TableCell onClick={() => toggleProductsSort('productName')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>Produit{sortArrow('productName')}</TableCell>
                    <TableCell onClick={() => toggleProductsSort('category')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>Catégorie{sortArrow('category')}</TableCell>
                    <TableCell onClick={() => toggleProductsSort('subcategory')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>Sous-catégorie{sortArrow('subcategory')}</TableCell>
                    <TableCell align="right" onClick={() => toggleProductsSort('totalQuantity')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>Quantité vendue{sortArrow('totalQuantity')}</TableCell>
                    <TableCell align="right" onClick={() => toggleProductsSort('totalRevenue')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>CA généré{sortArrow('totalRevenue')}</TableCell>
                    <TableCell align="right" onClick={() => toggleProductsSort('averagePrice')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>Prix moyen{sortArrow('averagePrice')}</TableCell>
                    <TableCell align="right" onClick={() => toggleProductsSort('transactionsCount')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>Nombre de transactions{sortArrow('transactionsCount')}</TableCell>
                    <TableCell align="right" onClick={() => toggleProductsSort('percentage')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>% du CA total{sortArrow('percentage')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const rows = globalStats.topProducts.map(p => ({
                      ...p,
                      percentage: globalStats.totalCA > 0 ? (p.totalRevenue / globalStats.totalCA) * 100 : 0,
                    }));
                    rows.sort((a: any, b: any) => {
                      const factor = productsSortDir === 'asc' ? 1 : -1;
                      const va = a[productsSortKey];
                      const vb = b[productsSortKey];
                      if (typeof va === 'number' && typeof vb === 'number') return factor * (va - vb);
                      return factor * String(va || '').localeCompare(String(vb || ''));
                    });
                    return rows.map((product, index) => (
                     <TableRow key={product.productName}>
                       <TableCell>
                         <Chip 
                           label={`#${index + 1}`} 
                           color={index < 3 ? "primary" : "default"}
                           size="small"
                         />
                       </TableCell>
                       <TableCell>
                         <Box>
                           <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                             {product.productName}
                           </Typography>
                         </Box>
                       </TableCell>
                       <TableCell>
                         {product.category ? (
                           <Chip label={product.category} size="small" color="secondary" variant="outlined" />
                         ) : (
                           <Typography variant="body2" color="text.secondary">-</Typography>
                         )}
                       </TableCell>
                       <TableCell>
                         {product.subcategory ? (
                           <Chip label={product.subcategory} size="small" color="info" variant="outlined" />
                         ) : (
                           <Typography variant="body2" color="text.secondary">-</Typography>
                         )}
                       </TableCell>
                       <TableCell align="right">{product.totalQuantity}</TableCell>
                       <TableCell align="right">{formatCurrency(product.totalRevenue)}</TableCell>
                       <TableCell align="right">{formatCurrency(product.averagePrice)}</TableCell>
                       <TableCell align="right">{product.transactionsCount}</TableCell>
                       <TableCell align="right">
                        {formatPercent1(product.percentage)}
                       </TableCell>
                     </TableRow>
                    ));
                  })()}
                 </TableBody>
               </Table>
             </TableContainer>
           </Box>
         )}

         {/* Rapport Par Catégorie */}
         {selectedReportType === 'categories' && (
           <Box>
             <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
               📊 Détail par Catégorie
             </Typography>
             
             <TableContainer component={Paper}>
               <Table>
                 <TableHead>
                   <TableRow>
                     <TableCell>Rang</TableCell>
                     <TableCell>Catégorie</TableCell>
                     <TableCell align="right">Nombre de produits</TableCell>
                     <TableCell align="right">Quantité vendue</TableCell>
                     <TableCell align="right">CA généré</TableCell>
                     <TableCell align="right">% du CA total</TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                                       {Array.from(globalStats.categories.entries())
                      .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)
                      .map(([category, data], index) => (
                       <TableRow key={category}>
                         <TableCell>
                           <Chip 
                             label={`#${index + 1}`} 
                             color={index < 3 ? "primary" : "default"}
                             size="small"
                           />
                         </TableCell>
                         <TableCell>
                           <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                             {category}
                           </Typography>
                         </TableCell>
                         <TableCell align="right">{data.productsCount}</TableCell>
                         <TableCell align="right">{data.totalQuantity}</TableCell>
                         <TableCell align="right">{formatCurrency(data.totalRevenue)}</TableCell>
                         <TableCell align="right">
                           {(() => {
                             const num = toNum(data.totalRevenue);
                             const den = toNum(globalStats.totalCA);
                             const p = den > 0 ? (num / den) * 100 : 0;
                             return toNum(p).toFixed(1) + '%';
                           })()}
                         </TableCell>
                       </TableRow>
                     ))}
                 </TableBody>
               </Table>
             </TableContainer>
           </Box>
         )}

        {/* Rapport Par Jour */}
        {selectedReportType === 'daily' && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              📅 Détail par Jour
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Z</TableCell>
                    <TableCell align="right">CA</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell align="right">Articles</TableCell>
                    <TableCell align="right">Remises</TableCell>
                    <TableCell>Méthodes de paiement</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyStats.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{formatDate(day.date)}</TableCell>
                      <TableCell>Z{day.zNumber}</TableCell>
                      <TableCell align="right">{formatCurrency(day.totalCA)}</TableCell>
                      <TableCell align="right">{day.totalTransactions}</TableCell>
                      <TableCell align="right">{day.totalItems}</TableCell>
                      <TableCell align="right">{formatCurrency(day.totalDiscounts)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {Object.entries(day.paymentMethods).map(([method, amount]) => (
                            <Chip 
                              key={method}
                              label={`${method}: ${formatCurrency(amount)}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HistoricalReportModal;
