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
    return StorageService.loadClosures() as ClosureData[];
  }, []);

  // Fonction pour calculer les dates selon la période sélectionnée
  const getPeriodDates = (period: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    switch (period) {
      case 'current_month':
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        return {
          start: firstDayOfMonth.toISOString().split('T')[0],
          end: lastDayOfMonth.toISOString().split('T')[0]
        };
      case 'last_month':
        const firstDayOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
        return {
          start: firstDayOfLastMonth.toISOString().split('T')[0],
          end: lastDayOfLastMonth.toISOString().split('T')[0]
        };
      case 'current_year':
        return {
          start: `${currentYear}-01-01`,
          end: `${currentYear}-12-31`
        };
      case 'last_year':
        return {
          start: `${currentYear - 1}-01-01`,
          end: `${currentYear - 1}-12-31`
        };
      case 'all':
        return { start: '', end: '' };
      default:
        return { start: startDate, end: endDate };
    }
  };

  // Filtrer les clôtures par période
  const filteredClosures = useMemo(() => {
    const { start, end } = getPeriodDates(selectedPeriod);
    
    console.log(`[DEBUG] Période sélectionnée: ${selectedPeriod}, Dates: ${start} - ${end}`);
    
    if (!start && !end) return allClosures;
    
    return allClosures.filter(closure => {
      const closureDate = new Date(closure.closedAt).toISOString().split('T')[0];
      const startDate = start || '1900-01-01';
      const endDate = end || '2100-12-31';
      
      const isInRange = closureDate >= startDate && closureDate <= endDate;
      console.log(`[DEBUG] Clôture ${closure.zNumber} du ${closureDate}: ${isInRange ? 'INCLUSE' : 'EXCLUE'}`);
      
      return isInRange;
    });
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
      closure.transactions.forEach((tx: any) => {
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
        tx.items?.forEach((item: any) => {
          stats.totalItems += item.quantity || 0;
          
          // Debug pour voir la structure des items
          console.log(`[DEBUG] Item structure:`, item);
          
          // Améliorer la gestion des noms de produits
          let productName = item.name || item.productName || item.title || '';
          if (!productName || productName.trim() === '') {
            productName = item.id ? `Produit #${item.id}` : 'Produit sans nom';
          }
          
          console.log(`[DEBUG] Nom du produit final: "${productName}"`);
          
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
            <Grid item xs={12} sm={4}>
              <Chip 
                label={`${filteredClosures.length} clôture(s)`}
                color="primary"
                variant="outlined"
                sx={{ height: '40px', fontSize: '0.9rem' }}
              />
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
