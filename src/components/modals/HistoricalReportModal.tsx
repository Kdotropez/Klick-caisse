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
  const [selectedReportType, setSelectedReportType] = useState<'summary' | 'products' | 'daily'>('summary');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('custom');

  // Charger toutes les clôtures
  const allClosures = useMemo(() => {
    const closures = StorageService.loadClosures() as ClosureData[];
    console.log(`[DEBUG] Clôtures chargées:`, closures);
    console.log(`[DEBUG] Nombre de clôtures:`, closures.length);
    
    // Debug localStorage
    console.log(`[DEBUG] localStorage.getItem('klick_caisse_closures'):`, localStorage.getItem('klick_caisse_closures'));
    
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
        // CORRECTION: Utiliser le mois actuel (0-11) pour le calcul
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const currentMonthDates = {
          start: firstDayOfMonth.toISOString().split('T')[0],
          end: lastDayOfMonth.toISOString().split('T')[0]
        };
        console.log(`[DEBUG] Mois en cours: ${currentMonthDates.start} - ${currentMonthDates.end}`);
        console.log(`[DEBUG] Détail calcul: premier jour = ${firstDayOfMonth.toISOString()}, dernier jour = ${lastDayOfMonth.toISOString()}`);
        console.log(`[DEBUG] Vérification: premier jour = ${firstDayOfMonth.getDate()}, dernier jour = ${lastDayOfMonth.getDate()}`);
        return currentMonthDates;
        
      case 'last_month':
        const firstDayOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
        const lastMonthDates = {
          start: firstDayOfLastMonth.toISOString().split('T')[0],
          end: lastDayOfLastMonth.toISOString().split('T')[0]
        };
        console.log(`[DEBUG] Mois précédent: ${lastMonthDates.start} - ${lastMonthDates.end}`);
        console.log(`[DEBUG] Détail calcul: premier jour = ${firstDayOfLastMonth.toISOString()}, dernier jour = ${lastDayOfLastMonth.toISOString()}`);
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
      topProducts: [] as ProductSalesData[]
    };

    const productMap = new Map<string, ProductSalesData>();

    filteredClosures.forEach(closure => {
      console.log(`[DEBUG] Traitement clôture Z${closure.zNumber} du ${closure.closedAt}`);
      console.log(`[DEBUG] Nombre de transactions: ${closure.transactions.length}`);
      
             closure.transactions.forEach((tx: any, txIndex: number) => {
         console.log(`[DEBUG] Transaction ${txIndex + 1}:`, tx);
         console.log(`[DEBUG] Transaction ${txIndex + 1} - total: ${tx.total}, items: ${tx.items?.length || 0}`);
         
         // CA total
         stats.totalCA += tx.total || 0;
         stats.totalTransactions++;
        
        // Remises
        if (tx.globalDiscount) {
          stats.totalDiscounts += tx.globalDiscount;
        }
        if (tx.itemDiscounts) {
          Object.values(tx.itemDiscounts).forEach((discount: any) => {
            if (discount.type === 'euro') {
              stats.totalDiscounts += (discount.value || 0) * (tx.items?.length || 0);
            }
          });
        }

        // Méthodes de paiement
        const paymentMethod = tx.paymentMethod || 'Inconnu';
        const methodKey = paymentMethod.toLowerCase().includes('esp') || paymentMethod === 'cash' ? 'Espèces' :
                         paymentMethod.toLowerCase().includes('carte') || paymentMethod === 'card' ? 'Carte' : 'SumUp';
        stats.paymentMethods[methodKey] = (stats.paymentMethods[methodKey] || 0) + (tx.total || 0);

                 // Articles vendus
         tx.items?.forEach((item: any, itemIndex: number) => {
           stats.totalItems += item.quantity || 0;
           
           // Debug pour voir la structure des items
           console.log(`[DEBUG] Item ${itemIndex + 1} structure complète:`, JSON.stringify(item, null, 2));
           console.log(`[DEBUG] Item ${itemIndex + 1} - quantity: ${item.quantity}, price: ${item.price}, total: ${(item.quantity || 0) * (item.price || 0)}`);
           console.log(`[DEBUG] Types des propriétés: name=${typeof item.name}, productName=${typeof item.productName}, title=${typeof item.title}, label=${typeof item.label}, description=${typeof item.description}, product=${typeof item.product}`);
           console.log(`[DEBUG] Valeurs des propriétés: name="${item.name}", productName="${item.productName}", title="${item.title}", label="${item.label}", description="${item.description}", product="${item.product}"`);
           
           // Améliorer la gestion des noms de produits - essayer toutes les propriétés possibles
           let productName = '';
           
           // Essayer différentes propriétés pour le nom (s'assurer qu'elles sont des chaînes)
           if (item.name && typeof item.name === 'string' && item.name.trim() !== '') productName = item.name;
           else if (item.productName && typeof item.productName === 'string' && item.productName.trim() !== '') productName = item.productName;
           else if (item.title && typeof item.title === 'string' && item.title.trim() !== '') productName = item.title;
           else if (item.label && typeof item.label === 'string' && item.label.trim() !== '') productName = item.label;
           else if (item.description && typeof item.description === 'string' && item.description.trim() !== '') productName = item.description;
           else if (item.product && typeof item.product === 'string' && item.product.trim() !== '') productName = item.product;
           
           // Essayer d'autres propriétés possibles
           if (!productName || productName.trim() === '') {
             if (item.text && typeof item.text === 'string' && item.text.trim() !== '') productName = item.text;
             else if (item.displayName && typeof item.displayName === 'string' && item.displayName.trim() !== '') productName = item.displayName;
             else if (item.nom && typeof item.nom === 'string' && item.nom.trim() !== '') productName = item.nom;
             else if (item.libelle && typeof item.libelle === 'string' && item.libelle.trim() !== '') productName = item.libelle;
           }
           
           // Si toujours pas de nom, essayer avec l'ID
           if (!productName || productName.trim() === '') {
             if (item.id) productName = `Produit #${item.id}`;
             else if (item.productId) productName = `Produit #${item.productId}`;
             else productName = 'Produit sans nom';
           }
           
           // S'assurer que productName est une chaîne
           if (typeof productName !== 'string') {
             productName = String(productName);
           }
          
          console.log(`[DEBUG] Nom du produit final: "${productName}" (propriétés testées: name=${item.name}, productName=${item.productName}, title=${item.title}, label=${item.label}, description=${item.description}, product=${item.product})`);
          
          const existing = productMap.get(productName);
          const itemTotal = (item.price || 0) * (item.quantity || 0);
          
          if (existing) {
            existing.totalQuantity += item.quantity || 0;
            existing.totalRevenue += itemTotal;
            existing.transactionsCount++;
            existing.averagePrice = existing.totalRevenue / existing.totalQuantity;
          } else {
            productMap.set(productName, {
              productName,
              totalQuantity: item.quantity || 0,
              totalRevenue: itemTotal,
              averagePrice: item.price || 0,
              transactionsCount: 1
            });
          }
        });
      });
    });

    // Top produits
    stats.topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);

    return stats;
  }, [filteredClosures]);

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
        dayStats.totalCA += tx.total || 0;
        dayStats.totalTransactions++;
        
        // Remises
        if (tx.globalDiscount) {
          dayStats.totalDiscounts += tx.globalDiscount;
        }
        if (tx.itemDiscounts) {
          Object.values(tx.itemDiscounts).forEach((discount: any) => {
            if (discount.type === 'euro') {
              dayStats.totalDiscounts += (discount.value || 0) * (tx.items?.length || 0);
            }
          });
        }

        // Méthodes de paiement
        const paymentMethod = tx.paymentMethod || 'Inconnu';
        const methodKey = paymentMethod.toLowerCase().includes('esp') || paymentMethod === 'cash' ? 'Espèces' :
                         paymentMethod.toLowerCase().includes('carte') || paymentMethod === 'card' ? 'Carte' : 'SumUp';
        dayStats.paymentMethods[methodKey] = (dayStats.paymentMethods[methodKey] || 0) + (tx.total || 0);

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

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} €`;
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
                     // Exécuter le script de récupération
                     const script = `
// Script pour récupérer les clôtures depuis les transactions quotidiennes
console.log('=== RÉCUPÉRATION DEPUIS LES TRANSACTIONS ===');

// Fonction pour analyser les transactions par jour et créer des clôtures
function recoverClosuresFromTransactions() {
  try {
    // Récupérer les transactions par jour
    const transactionsByDayRaw = localStorage.getItem('klick_caisse_transactions_by_day');
    console.log('📊 Transactions par jour trouvées:', !!transactionsByDayRaw);
    
    if (!transactionsByDayRaw) {
      console.log('❌ Aucune transaction par jour trouvée');
      return [];
    }
    
    const transactionsByDay = JSON.parse(transactionsByDayRaw);
    console.log('📅 Jours avec transactions:', Object.keys(transactionsByDay));
    
    const recoveredClosures = [];
    let zNumber = 1;
    
    // Parcourir chaque jour
    Object.entries(transactionsByDay).forEach(([dateKey, transactions]) => {
      if (Array.isArray(transactions) && transactions.length > 0) {
        console.log(\`📅 Jour \${dateKey}: \${transactions.length} transactions\`);
        
        // Calculer le total CA
        const totalCA = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
        
        // Créer une clôture
        const closure = {
          zNumber: zNumber++,
          closedAt: dateKey,
          transactions: transactions,
          totalCA: totalCA,
          totalTransactions: transactions.length
        };
        
        recoveredClosures.push(closure);
        console.log(\`✅ Clôture Z\${closure.zNumber - 1} créée pour \${dateKey}: \${totalCA.toFixed(2)} €\`);
      }
    });
    
    return recoveredClosures;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    return [];
  }
}

// Exécuter la récupération
const recoveredClosures = recoverClosuresFromTransactions();

if (recoveredClosures.length > 0) {
  // Sauvegarder dans localStorage
  localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));
  
  // Vérifier la sauvegarde
  const saved = localStorage.getItem('klick_caisse_closures');
  const parsed = JSON.parse(saved);
  console.log(\`✅ \${parsed.length} clôtures sauvegardées\`);
  
  alert(\`✅ \${parsed.length} clôtures récupérées avec succès! Rechargez la page pour les voir.\`);
  
  // Forcer le rechargement des données
  window.location.reload();
} else {
  alert('❌ Aucune clôture récupérée. Vérifiez les logs dans la console.');
}
`;
                     
                     try {
                       eval(script);
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
                    <TableCell>Produit</TableCell>
                    <TableCell align="right">Quantité vendue</TableCell>
                    <TableCell align="right">CA généré</TableCell>
                    <TableCell align="right">Prix moyen</TableCell>
                    <TableCell align="right">Nombre de transactions</TableCell>
                    <TableCell align="right">% du CA total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {globalStats.topProducts.map((product, index) => (
                    <TableRow key={product.productName}>
                      <TableCell>
                        <Chip 
                          label={`#${index + 1}`} 
                          color={index < 3 ? "primary" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell align="right">{product.totalQuantity}</TableCell>
                      <TableCell align="right">{formatCurrency(product.totalRevenue)}</TableCell>
                      <TableCell align="right">{formatCurrency(product.averagePrice)}</TableCell>
                      <TableCell align="right">{product.transactionsCount}</TableCell>
                      <TableCell align="right">
                        {((product.totalRevenue / globalStats.totalCA) * 100).toFixed(1)}%
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
