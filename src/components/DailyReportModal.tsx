import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Close, TrendingUp, Euro, Discount } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { CartItem } from '../types/Product';
import { APP_VERSION } from '../version';
import { StorageService } from '../services/StorageService';

interface DailyReportModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
}

interface DailyStats {
  totalSales: number;
  totalItems: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalDiscounts: number;
  totalOriginalAmount: number;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({
  open,
  onClose,
  cartItems
}) => {
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalSales: 0,
    totalItems: 0,
    totalTransactions: 0,
    averageTransactionValue: 0,
    totalDiscounts: 0,
    totalOriginalAmount: 0
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const d = new Date();
    const key = new Date().toISOString().slice(0, 10);
    return { from: key, to: key };
  });
  const [preset, setPreset] = useState<'day'|'range'|'month'|'lastMonth'|'year'>('day');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTicketsSection, setShowTicketsSection] = useState(false);
  // Tri des articles (détail produits)
  const [productSortKey, setProductSortKey] = useState<'name'|'category'|'totalQty'|'transactions'|'totalAmount'|'percentage'>('totalAmount');
  const [productSortDir, setProductSortDir] = useState<'asc'|'desc'>('desc');

  // Les données seront lues à la volée dans les mémos pour éviter les dépendances instables

  const getLocalDateKey = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Charger les transactions pour la date sélectionnée
  const selectedDateTransactions = React.useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const loadFromTxByDay = (dateKey: string): any[] => {
      try {
        const raw = localStorage.getItem('klick_caisse_transactions_by_day');
        if (!raw) return [];
        const map = JSON.parse(raw) as Record<string, any[]>;
        return Array.isArray(map[dateKey]) ? map[dateKey] : [];
      } catch { return []; }
    };
    const loadFromClosures = (dateKey: string): any[] => {
      try {
        const allClosures = StorageService.loadClosures();
        const list: any[] = [];
        (Array.isArray(allClosures) ? allClosures : []).forEach((c: any) => {
          const txs = Array.isArray(c.transactions) ? c.transactions : [];
          txs.forEach((t:any) => {
            const tk = getLocalDateKey(new Date(t.timestamp));
            if (tk === dateKey) list.push(t);
          });
        });
        return list;
      } catch { return []; }
    };
    if (preset === 'day') {
      const fromDay = loadFromTxByDay(selectedDate === todayKey ? todayKey : selectedDate);
      if (fromDay.length > 0) return fromDay;
      return loadFromClosures(selectedDate === todayKey ? todayKey : selectedDate);
    }
    // Agrégation sur intervalle
    try {
      const out: any[] = [];
      const seen = new Set<string>();
      const from = new Date(`${range.from}T00:00:00`);
      const to = new Date(`${range.to}T23:59:59`);
      const raw = localStorage.getItem('klick_caisse_transactions_by_day');
      if (raw) {
        const map = JSON.parse(raw) as Record<string, any[]>;
        Object.keys(map).forEach(day => {
          const d = new Date(`${day}T12:00:00`);
          if (d >= from && d <= to) {
            const list = Array.isArray(map[day]) ? map[day] : [];
            list.forEach(t => { const id=String((t as any)?.id); const ts = new Date(t?.timestamp).getTime(); const key = `${id}@${ts}`; if (!seen.has(key)) { seen.add(key); out.push(t); } });
          }
        });
      }
      const allClosures = StorageService.loadClosures();
      (Array.isArray(allClosures) ? allClosures : []).forEach((c: any) => {
        const txs = Array.isArray(c.transactions) ? c.transactions : [];
        txs.forEach((t:any) => {
          const tsDate = new Date(t?.timestamp);
          if (tsDate >= from && tsDate <= to) {
            const id=String(t?.id);
            const ts = tsDate.getTime();
            const key = `${id}@${ts}`;
            if (!seen.has(key)) { seen.add(key); out.push(t); }
          }
        });
      });
      return out;
    } catch { return []; }
  }, [selectedDate, preset, range]);

  // Fonction pour afficher les détails d'un ticket
  const showTicketDetails = (transaction: any) => {
    setSelectedTicket(transaction);
    setShowTicketModal(true);
  };

  // Calculer les statistiques de la date sélectionnée (aligne avec la liste affichée)
  useEffect(() => {
    const txs = Array.isArray(selectedDateTransactions) ? selectedDateTransactions : [];
    if (txs.length > 0) {
      let totalSales = 0;
      let totalItems = 0;
      let totalOriginalAmount = 0;
      let totalDiscounts = 0;

      txs.forEach((transaction: any) => {
        totalSales += Number(transaction.total) || 0;
        if (transaction.items && Array.isArray(transaction.items)) {
          transaction.items.forEach((item: any) => {
            const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
            const originalTotal = originalPrice * (item.quantity || 0);
            let finalTotal = originalTotal;
            const key = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
            const discount = transaction.itemDiscounts?.[key];
            if (discount) {
              if (discount.type === 'euro') {
                finalTotal = Math.max(0, originalTotal - (discount.value * (item.quantity || 0)));
              } else if (discount.type === 'percent') {
                finalTotal = originalTotal * (1 - discount.value / 100);
              } else if (discount.type === 'price') {
                finalTotal = (discount.value || 0) * (item.quantity || 0);
              }
            }
            totalOriginalAmount += originalTotal;
            totalItems += (item.quantity || 0);
            totalDiscounts += (originalTotal - finalTotal);
          });
        }
      });
      // Éviter les doubles comptages si des tickets identiques proviennent de sources différentes
      try {
        const uniqueIds = new Set<string>();
        const uniqueTxs: any[] = [];
        for (const t of txs) {
          const id = String(t?.id);
          if (!uniqueIds.has(id)) { uniqueIds.add(id); uniqueTxs.push(t); }
        }
        // Recalculer totalSales sur base des tickets uniques uniquement
        totalSales = uniqueTxs.reduce((s, t) => s + (Number(t?.total) || 0), 0);
      } catch {}
      const totalTransactions = txs.length;
      const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
      setDailyStats({ totalSales, totalItems, totalTransactions, averageTransactionValue, totalDiscounts, totalOriginalAmount });
      return;
    }

    // Fallback: utiliser le panier courant (aucune transaction affichable)
    const totalSales = cartItems.reduce((sum, item) => {
      const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
      return sum + (price * item.quantity);
    }, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalTransactions = cartItems.length > 0 ? 1 : 0;
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    setDailyStats({ totalSales, totalItems, totalTransactions, averageTransactionValue, totalDiscounts: 0, totalOriginalAmount: totalSales });
  }, [selectedDateTransactions, cartItems]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '60vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ color: '#2196f3', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
          Rapport · Klick V{APP_VERSION}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>

        {/* Filtres de période */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2 }}>
          <Button variant={preset==='day'?'contained':'outlined'} onClick={()=>{
            setPreset('day');
            const d=new Date();
            const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            setSelectedDate(k);
            setRange({ from: k, to: k });
          }}>Jour</Button>
          <Button variant={preset==='month'?'contained':'outlined'} onClick={()=>{
            setPreset('month');
            const d=new Date();
            const from=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
            const to=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()).padStart(2,'0')}`;
            setRange({ from, to });
          }}>Mois courant</Button>
          <Button variant={preset==='lastMonth'?'contained':'outlined'} onClick={()=>{
            setPreset('lastMonth');
            const d=new Date();
            const y=d.getFullYear();
            const m=d.getMonth();
            const first=new Date(y, m-1, 1);
            const last=new Date(y, m, 0);
            const from=`${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-01`;
            const to=`${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
            setRange({ from, to });
          }}>Mois précédent</Button>
          <Button variant={preset==='year'?'contained':'outlined'} onClick={()=>{
            setPreset('year');
            const d=new Date();
            const from=`${d.getFullYear()}-01-01`;
            const to=`${d.getFullYear()}-12-31`;
            setRange({ from, to });
          }}>Année</Button>
          <Button variant={preset==='range'?'contained':'outlined'} onClick={()=>{ setPreset('range'); }}>Période</Button>
        </Box>

        {/* POINT 1: TOTAL DES VENTES */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #2196f3',
          backgroundColor: '#f8f9ff'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Euro sx={{ color: '#2196f3', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                Point 1: Total des Ventes
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Montant total */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: '#e3f2fd',
                borderRadius: 1
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Montant Total des Ventes
                </Typography>
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976d2',
                  fontFamily: 'monospace'
                }}>
                  {formatPrice(dailyStats.totalSales)}
                </Typography>
              </Box>

              {/* Remises totales */}
              {dailyStats.totalDiscounts > 0 && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: '#fff3e0',
                  borderRadius: 1,
                  border: '1px solid #ff9800'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Discount sx={{ color: '#ff9800', fontSize: 20 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                      Total des Remises Appliquées
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 'bold', 
                    color: '#f57c00',
                    fontFamily: 'monospace'
                  }}>
                    -{formatPrice(dailyStats.totalDiscounts)}
                  </Typography>
                </Box>
              )}

              {/* Détails */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                      Articles Vendus
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#2196f3',
                      fontFamily: 'monospace'
                    }}>
                      {dailyStats.totalItems}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                      Transactions
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#ff9800',
                      fontFamily: 'monospace'
                    }}>
                      {dailyStats.totalTransactions}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                      Panier Moyen
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#4caf50',
                      fontFamily: 'monospace'
                    }}>
                      {formatPrice(dailyStats.averageTransactionValue)}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Remises appliquées */}
              {dailyStats.totalDiscounts > 0 && (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#fff3e0', 
                  borderRadius: 1,
                  border: '1px solid #ff9800'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Discount sx={{ color: '#ff9800', fontSize: 20 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                      Remises Appliquées
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      Total des remises
                    </Typography>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 'bold', 
                      color: '#f57c00',
                      fontFamily: 'monospace'
                    }}>
                      -{formatPrice(dailyStats.totalDiscounts)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                    Montant original : {formatPrice(dailyStats.totalOriginalAmount)} → Final : {formatPrice(dailyStats.totalSales)}
                  </Typography>
                </Box>
              )}

              {/* Résumé */}
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#e8f5e8', 
                borderRadius: 1,
                border: '1px solid #4caf50'
              }}>
                <Typography variant="body1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                  📊 Résumé : {dailyStats.totalItems} articles vendus pour un total de {formatPrice(dailyStats.totalSales)}
                  {dailyStats.totalDiscounts > 0 && ` (remises : -${formatPrice(dailyStats.totalDiscounts)})`}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Tickets de la journée */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #1976d2',
          backgroundColor: '#f8fbff'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                📋 Tickets
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowTicketsSection(!showTicketsSection)}
                sx={{ 
                  ml: 'auto',
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: 'white'
                  }
                }}
              >
                {showTicketsSection ? '🔼 Réduire' : '🔽 Développer'}
              </Button>
            </Box>
            
            {showTicketsSection && (
              <>
                <Divider sx={{ mb: 2 }} />
                
                {/* Sélecteurs de période */}
                {preset==='day' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      Date :
                    </Typography>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => { setSelectedDate(e.target.value); setRange({ from: e.target.value, to: e.target.value }); }}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => { const k=new Date().toISOString().slice(0, 10); setSelectedDate(k); setRange({ from: k, to: k }); }}
                    >
                      Aujourd'hui
                    </Button>
                  </Box>
                )}
                {preset==='range' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      De :
                    </Typography>
                    <input 
                      type="date" 
                      value={range.from} 
                      onChange={(e) => setRange(r=>({ ...r, from: e.target.value }))}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      À :
                    </Typography>
                    <input 
                      type="date" 
                      value={range.to} 
                      onChange={(e) => setRange(r=>({ ...r, to: e.target.value }))}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </Box>
                )}
                
                {/* Liste des tickets */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedDateTransactions.length > 0 ? (
                    selectedDateTransactions.map((transaction) => (
                      <Box key={transaction.id} sx={{ 
                        p: 2, 
                        backgroundColor: '#fff', 
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                          borderColor: '#1976d2'
                        }
                      }}
                      onClick={() => showTicketDetails(transaction)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="subtitle1" sx={{ 
                              fontWeight: 'bold', 
                              color: '#1976d2',
                              fontFamily: 'monospace'
                            }}>
                              #{transaction.id.slice(-6)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                              {new Date(transaction.timestamp).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                              {transaction.items ? transaction.items.reduce((sum: number, item: any) => sum + item.quantity, 0) : 0} articles
                            </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 'bold', 
                              color: '#1976d2',
                              fontFamily: 'monospace'
                            }}>
                              {formatPrice(transaction.total)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))
                  ) : (
        <Box sx={{ 
          p: 3, 
                      textAlign: 'center', 
                      color: 'text.secondary',
          backgroundColor: '#f9f9f9', 
                      borderRadius: 1
                    }}>
                      <Typography variant="body1">
                        Aucun ticket trouvé pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* POINT 2: RÉPARTITION PAR CATÉGORIE */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #4caf50',
          backgroundColor: '#f8fff8'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TrendingUp sx={{ color: '#4caf50', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                Point 2: Répartition par Catégorie
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {(() => {
              // Calculer les statistiques par catégorie
              const categoryStats = new Map<string, { name: string, totalSales: number, totalItems: number, transactions: number }>();
              
              selectedDateTransactions.forEach(transaction => {
                if (transaction.items && Array.isArray(transaction.items)) {
                  transaction.items.forEach((item: any) => {
                    const categoryName = item.product.category || 'Non classé';
                    const existing = categoryStats.get(categoryName) || { name: categoryName, totalSales: 0, totalItems: 0, transactions: 0 };
                    
                    existing.totalSales += (item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice) * item.quantity;
                    existing.totalItems += item.quantity;
                    existing.transactions += 1;
                    
                    categoryStats.set(categoryName, existing);
                  });
                }
              });
              
              const sortedCategories = Array.from(categoryStats.values())
                .sort((a, b) => b.totalSales - a.totalSales);
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {sortedCategories.length > 0 ? (
                    sortedCategories.map((category, index) => (
                      <Box key={category.name} sx={{ 
                        p: 2, 
                        backgroundColor: index === 0 ? '#e8f5e8' : '#f5f5f5', 
                        borderRadius: 1,
                        border: index === 0 ? '2px solid #4caf50' : '1px solid #e0e0e0'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: index === 0 ? '#2e7d32' : '#333' }}>
                            {index === 0 && '🏆 '}{category.name}
                          </Typography>
                          <Typography variant="h5" sx={{ 
                            fontWeight: 'bold', 
                            color: index === 0 ? '#2e7d32' : '#4caf50',
                            fontFamily: 'monospace'
                          }}>
                            {formatPrice(category.totalSales)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {category.totalItems} articles • {category.transactions} transactions
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {((category.totalSales / dailyStats.totalSales) * 100).toFixed(1)}% du CA total
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body1">Aucune donnée de catégorie disponible</Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </CardContent>
        </Card>

        {/* POINT 3: MÉTHODES DE PAIEMENT */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #ff9800',
          backgroundColor: '#fff8f0'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Euro sx={{ color: '#ff9800', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Point 3: Méthodes de Paiement
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {(() => {
              // Calculer les statistiques par méthode de paiement
              const paymentStats = new Map<string, { name: string, total: number, count: number, percentage: number }>();
              
              selectedDateTransactions.forEach(transaction => {
                const method = transaction.paymentMethod || 'cash';
                const methodName = method === 'cash' ? '💵 Espèces' : 
                                 method === 'card' ? '💳 Carte' : 
                                 method === 'check' ? '📝 Chèque' : 
                                 method === 'sumup' ? '📱 SumUp' : method;
                
                const existing = paymentStats.get(methodName) || { name: methodName, total: 0, count: 0, percentage: 0 };
                existing.total += transaction.total || 0;
                existing.count += 1;
                paymentStats.set(methodName, existing);
              });
              
              // Calculer les pourcentages
              const totalCA = Array.from(paymentStats.values()).reduce((sum, stat) => sum + stat.total, 0);
              paymentStats.forEach(stat => {
                stat.percentage = totalCA > 0 ? (stat.total / totalCA) * 100 : 0;
              });
              
              const sortedPayments = Array.from(paymentStats.values())
                .sort((a, b) => b.total - a.total);
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {sortedPayments.length > 0 ? (
                    sortedPayments.map((payment, index) => (
                      <Box key={payment.name} sx={{ 
                        p: 2, 
                        backgroundColor: '#fff', 
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {payment.name}
                          </Typography>
                          <Typography variant="h5" sx={{ 
                            fontWeight: 'bold', 
                            color: '#ff9800',
                            fontFamily: 'monospace'
                          }}>
                            {formatPrice(payment.total)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {payment.count} transaction{payment.count > 1 ? 's' : ''}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {payment.percentage.toFixed(1)}% du CA total
                          </Typography>
                        </Box>
                        {/* Barre de progression */}
                        <Box sx={{ 
                          width: '100%', 
                          height: 8, 
                          backgroundColor: '#e0e0e0', 
                          borderRadius: 4, 
                          mt: 1,
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            width: `${payment.percentage}%`, 
                            height: '100%', 
                            backgroundColor: '#ff9800',
                            transition: 'width 0.3s ease'
                          }} />
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body1">Aucune donnée de paiement disponible</Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </CardContent>
        </Card>

        {/* POINT 4: REMISES APPLIQUÉES */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #9c27b0',
          backgroundColor: '#faf5ff'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Discount sx={{ color: '#9c27b0', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                Point 4: Remises Appliquées
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {(() => {
              // Analyser les remises appliquées
              const discountStats = {
                totalDiscounts: 0,
                totalOriginalAmount: 0,
                transactionsWithDiscounts: 0,
                discountTypes: new Map<string, { count: number, total: number }>()
              };
              
              selectedDateTransactions.forEach(transaction => {
                let hasDiscounts = false;
                let transactionDiscounts = 0;
                let transactionOriginal = 0;
                
                if (transaction.items && Array.isArray(transaction.items)) {
                  transaction.items.forEach((item: any) => {
                    const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                    const originalTotal = originalPrice * item.quantity;
                    transactionOriginal += originalTotal;
                    
                    // Vérifier les remises sur articles
                    if (transaction.itemDiscounts && transaction.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`]) {
                      const discount = transaction.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`];
                      hasDiscounts = true;
                      
                      let discountAmount = 0;
                      if (discount.type === 'euro') {
                        discountAmount = discount.value * item.quantity;
                      } else if (discount.type === 'percent') {
                        discountAmount = originalTotal * (discount.value / 100);
                      } else if (discount.type === 'price') {
                        discountAmount = originalTotal - (discount.value * item.quantity);
                      }
                      
                      transactionDiscounts += discountAmount;
                      
                      // Compter les types de remises
                      const typeKey = `${discount.type} (${discount.value}${discount.type === 'percent' ? '%' : '€'})`;
                      const existing = discountStats.discountTypes.get(typeKey) || { count: 0, total: 0 };
                      existing.count += 1;
                      existing.total += discountAmount;
                      discountStats.discountTypes.set(typeKey, existing);
                    }
                  });
                }
                
                // Vérifier les remises globales
                if (transaction.globalDiscount) {
                  hasDiscounts = true;
                  const discount = transaction.globalDiscount;
                  let discountAmount = 0;
                  
                  if (discount.type === 'euro') {
                    discountAmount = discount.value;
                  } else if (discount.type === 'percent') {
                    discountAmount = transactionOriginal * (discount.value / 100);
                  }
                  
                  transactionDiscounts += discountAmount;
                  
                  // Compter les types de remises globales
                  const typeKey = `Global ${discount.type} (${discount.value}${discount.type === 'percent' ? '%' : '€'})`;
                  const existing = discountStats.discountTypes.get(typeKey) || { count: 0, total: 0 };
                  existing.count += 1;
                  existing.total += discountAmount;
                  discountStats.discountTypes.set(typeKey, existing);
                }
                
                if (hasDiscounts) {
                  discountStats.transactionsWithDiscounts += 1;
                  discountStats.totalDiscounts += transactionDiscounts;
                }
                discountStats.totalOriginalAmount += transactionOriginal;
              });
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Résumé des remises */}
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#f3e5f5', 
                    borderRadius: 1,
                    border: '1px solid #9c27b0'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                        Total des Remises
                      </Typography>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 'bold', 
                        color: '#7b1fa2',
                        fontFamily: 'monospace'
                      }}>
                        -{formatPrice(discountStats.totalDiscounts)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {discountStats.transactionsWithDiscounts} transaction{discountStats.transactionsWithDiscounts > 1 ? 's' : ''} avec remises
                    </Typography>
                  </Box>
                  
                  {/* Types de remises */}
                  {discountStats.discountTypes.size > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                        Types de Remises Appliquées
          </Typography>
                      {Array.from(discountStats.discountTypes.entries())
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([type, stats]) => (
                        <Box key={type} sx={{ 
                          p: 2, 
                          backgroundColor: '#fff', 
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {type}
          </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 'bold', 
                              color: '#9c27b0',
                              fontFamily: 'monospace'
                            }}>
                              -{formatPrice(stats.total)}
          </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            {stats.count} application{stats.count > 1 ? 's' : ''}
          </Typography>
        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body1">Aucune remise appliquée</Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </CardContent>
        </Card>

        {/* POINT 5: LISTING DÉTAILLÉ DES ARTICLES VENDUS */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #e91e63',
          backgroundColor: '#fce4ec'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#e91e63' }}>
                📋 Point 5: Listing Détaillé des Articles Vendus
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  try {
                    // Reproduire les données du tableau trié pour export (avec vrais IDs)
                    const articleStats = new Map<string, any>();
                    (Array.isArray(selectedDateTransactions) ? selectedDateTransactions : []).forEach((transaction:any) => {
                      if (Array.isArray(transaction.items)) {
                        transaction.items.forEach((item:any) => {
                          const product = item.product || {};
                          const variation = item.selectedVariation || null;
                          const variationLabel = variation ? (variation.attributes || variation.reference || variation.id) : undefined;
                          const articleKey = `${String(product.id)}__${variation ? String(variation.id) : 'main'}`;
                          const name = variation ? `${String(product.name)} (${String(variationLabel)})` : String(product.name);
                          const category = product.category || 'Non classé';
                          const existing = articleStats.get(articleKey) || {
                            name,
                            category,
                            productId: String(product.id || ''), // on exportera sans suffixe 'main'
                            productEAN: product.ean13 || '',
                            productRef: product.reference || '',
                            variationId: variation ? String(variation.id || '') : '',
                            variationEAN: variation ? (variation.ean13 || '') : '',
                            variationRef: variation ? (variation.reference || '') : '',
                            totalQty: 0,
                            totalAmount: 0,
                            transactions: 0,
                          };
                          const unitPrice = variation ? variation.finalPrice : product.finalPrice;
                          const qty = Number(item.quantity) || 0;
                          const itemTotal = (Number(unitPrice) || 0) * qty;
                          existing.totalQty += qty;
                          existing.totalAmount += itemTotal;
                          existing.transactions += 1;
                          articleStats.set(articleKey, existing);
                        });
                      }
                    });
                    const rows = Array.from(articleStats.values()).map(r => {
                      const rawProd = String(r.productId||'');
                      const isValidProdId = /^\d{4}$/.test(rawProd);
                      const varIdRaw = String(r.variationId||'');
                      const varId = varIdRaw && varIdRaw.startsWith('var_') ? varIdRaw : '';

                      return {
                        ...r,
                        productIdRaw: rawProd,
                        productId: isValidProdId ? rawProd : '',
                        variationId: varId
                      };
                    });
                    // Valider les IDs produit: doivent être exactement 4 chiffres, sinon proposer la saisie
                    const invalids = rows.filter((r:any) => !(/^\d{4}$/.test(String(r.productIdRaw||''))));
                    if (invalids.length > 0) {
                      const sample = invalids.slice(0, 15)
                        .map((x:any, i:number) => `${i+1}) ${x.name} · ID actuel: ${x.productIdRaw||'vide'}`)
                        .join('\n');
                      const askFill = window.confirm(
                        `⚠ ${invalids.length} article(s) sans ID produit à 4 chiffres.\n` +
                        sample +
                        (invalids.length>15?`\n... (+${invalids.length-15} autres)`:'') +
                        `\n\nOK = Saisir les IDs manquants maintenant\nAnnuler = Continuer sans (IDs vides)`
                      );
                      if (askFill) {
                        for (let i = 0; i < rows.length; i++) {
                          const r:any = rows[i];
                          if (!/^\d{4}$/.test(String(r.productId||''))) {
                            const entered = window.prompt(
                              `ID produit (4 chiffres) pour:\n${r.name}\nCatégorie: ${r.category}\nID actuel: ${r.productIdRaw||'vide'}\n\nLaissez vide pour passer, Annuler pour arrêter l'export.`,
                              ''
                            );
                            if (entered === null) return; // annuler export
                            if (entered.trim().length === 0) {
                              r.productId = '';
                            } else if (/^\d{4}$/.test(entered.trim())) {
                              r.productId = entered.trim();
                            } else {
                              // ID invalide -> on laisse vide
                              r.productId = '';
                            }
                          }
                        }
                      }
                    }
                    const csv = [
                      ['Produit','Catégorie','ID Produit','Quantité','Transactions','CA (€)'].join(';'),
                      ...rows.map(r => [
                        String(r.name).replace(/;/g, ','),
                        String(r.category||'').replace(/;/g, ','),
                        String(r.productId||''),
                        String(r.totalQty||0),
                        String(r.transactions||0),
                        (Number(r.totalAmount)||0).toFixed(2)
                      ].join(';'))
                    ].join('\n');
                    const bom = '\uFEFF'; // BOM pour Excel (UTF-8)
                    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const labelFrom = preset==='day' ? selectedDate : range.from;
                    const labelTo = preset==='day' ? selectedDate : range.to;
                    a.download = `rapport-point5-${labelFrom}_au_${labelTo}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    alert('Erreur export CSV');
                  }
                }}
              >
                Export Excel (CSV)
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {(() => {
              // Calculer les statistiques par article
              const articleStats = new Map<string, { 
                name: string, 
                category: string,
                productId: string,
                productEAN?: string,
                productRef?: string,
                variationId?: string,
                variationEAN?: string,
                variationRef?: string,
                variationLabel?: string,
                totalQty: number, 
                totalAmount: number, 
                transactions: number,
                percentage: number
              }>();
              
              selectedDateTransactions.forEach(transaction => {
                if (transaction.items && Array.isArray(transaction.items)) {
                  transaction.items.forEach((item: any) => {
                    const product = item.product || {};
                    const variation = item.selectedVariation || null;
                    const variationLabel = variation ? (variation.attributes || variation.reference || variation.id) : undefined;
                    const articleKey = `${String(product.id)}__${variation ? String(variation.id) : 'main'}`;
                    const articleName = variation ? `${String(product.name)} (${String(variationLabel)})` : String(product.name);
                    const categoryName = product.category || 'Non classé';

                    const existing = articleStats.get(articleKey) || { 
                      name: articleName, 
                      category: categoryName,
                      productId: String(product.id || ''),
                      productEAN: product.ean13 || undefined,
                      productRef: product.reference || undefined,
                      variationId: variation ? String(variation.id || '') : undefined,
                      variationEAN: variation ? variation.ean13 || undefined : undefined,
                      variationRef: variation ? variation.reference || undefined : undefined,
                      variationLabel: variation ? String(variationLabel || '') : undefined,
                      totalQty: 0, 
                      totalAmount: 0, 
                      transactions: 0,
                      percentage: 0
                    };

                    const unitPrice = variation ? variation.finalPrice : product.finalPrice;
                    const qty = Number(item.quantity) || 0;
                    const itemTotal = (Number(unitPrice) || 0) * qty;

                    existing.totalQty += qty;
                    existing.totalAmount += itemTotal;
                    existing.transactions += 1;

                    articleStats.set(articleKey, existing);
                  });
                }
              });
              
              // Calculer les pourcentages
              const totalCA = Array.from(articleStats.values()).reduce((sum, stat) => sum + stat.totalAmount, 0);
              articleStats.forEach(stat => {
                stat.percentage = totalCA > 0 ? (stat.totalAmount / totalCA) * 100 : 0;
              });
              
              const articles = Array.from(articleStats.values());
              const sortedArticles = articles.sort((a, b) => {
                const factor = productSortDir === 'asc' ? 1 : -1;
                const get = (x:any) => {
                  switch (productSortKey) {
                    case 'name': return (x.name||'').toLowerCase();
                    case 'category': return (x.category||'').toLowerCase();
                    case 'totalQty': return x.totalQty||0;
                    case 'transactions': return x.transactions||0;
                    case 'totalAmount': return x.totalAmount||0;
                    case 'percentage': return x.percentage||0;
                    default: return x.totalAmount||0;
                  }
                };
                const va = get(a); const vb = get(b);
                if (typeof va === 'number' && typeof vb === 'number') return factor * (va - vb);
                return factor * String(va).localeCompare(String(vb));
              });
              const toggleSort = (key: typeof productSortKey) => {
                if (productSortKey === key) {
                  setProductSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                } else {
                  setProductSortKey(key);
                  setProductSortDir('desc');
                }
              };
              const arrow = (key: typeof productSortKey) => productSortKey === key ? (productSortDir==='asc'?' ▲':' ▼') : '';
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Résumé */}
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#f8bbd9', 
                    borderRadius: 1,
                    border: '1px solid #e91e63'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63', textAlign: 'center' }}>
                      📊 {sortedArticles.length} articles différents vendus
                    </Typography>
                  </Box>
                  
                  {/* Tableau des articles avec tri par colonnes */}
                  {sortedArticles.length > 0 ? (
                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                      {/* En-têtes */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1.2fr 0.8fr', backgroundColor: '#f8bbd9', borderBottom: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" sx={{ p: 1, fontWeight: 'bold', cursor: 'pointer' }} onClick={()=>toggleSort('name')}>Produit{arrow('name')}</Typography>
                        <Typography variant="body2" sx={{ p: 1, fontWeight: 'bold', cursor: 'pointer' }} onClick={()=>toggleSort('category')}>Catégorie{arrow('category')}</Typography>
                        <Typography variant="body2" sx={{ p: 1, fontWeight: 'bold', textAlign: 'right', cursor: 'pointer' }} onClick={()=>toggleSort('totalQty')}>Qté{arrow('totalQty')}</Typography>
                        <Typography variant="body2" sx={{ p: 1, fontWeight: 'bold', textAlign: 'right', cursor: 'pointer' }} onClick={()=>toggleSort('transactions')}>Transac.{arrow('transactions')}</Typography>
                        <Typography variant="body2" sx={{ p: 1, fontWeight: 'bold', textAlign: 'right', cursor: 'pointer' }} onClick={()=>toggleSort('totalAmount')}>CA{arrow('totalAmount')}</Typography>
                        <Typography variant="body2" sx={{ p: 1, fontWeight: 'bold', textAlign: 'right', cursor: 'pointer' }} onClick={()=>toggleSort('percentage')}>% CA{arrow('percentage')}</Typography>
                      </Box>
                      {/* Lignes */}
                      <Box sx={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {sortedArticles.map((article, index) => (
                          <Box key={`${article.name}-${index}`} sx={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1.2fr 0.8fr', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ p: 1 }}>{article.name}</Typography>
                            <Typography variant="body2" sx={{ p: 1, color: '#666' }}>{article.category}</Typography>
                            <Typography variant="body2" sx={{ p: 1, textAlign: 'right', fontFamily: 'monospace' }}>{article.totalQty}</Typography>
                            <Typography variant="body2" sx={{ p: 1, textAlign: 'right', fontFamily: 'monospace' }}>{article.transactions}</Typography>
                            <Typography variant="body2" sx={{ p: 1, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#e91e63' }}>{formatPrice(article.totalAmount)}</Typography>
                            <Typography variant="body2" sx={{ p: 1, textAlign: 'right', fontFamily: 'monospace', color: '#e91e63' }}>{article.percentage.toFixed(1)}%</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body1">Aucun article vendu</Typography>
                    </Box>
                  )}
                  
                  {/* Top 3 articles */}
                  {sortedArticles.length >= 3 && (
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: '#fce4ec', 
                      borderRadius: 1,
                      border: '1px solid #e91e63'
                    }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63', mb: 1 }}>
                        🏆 Top 3 des Articles
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {sortedArticles.slice(0, 3).map((article, index) => (
                          <Box key={`top-${index}`} sx={{ textAlign: 'center', flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#e91e63' }}>
                              {index + 1}. {article.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                              {article.totalQty} unités • {formatPrice(article.totalAmount)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          sx={{ 
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' }
          }}
        >
          Fermer
        </Button>
      </DialogActions>

      {/* Modale de détails du ticket */}
      {showTicketModal && selectedTicket && (
      <Dialog 
        open={showTicketModal} 
        onClose={() => setShowTicketModal(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: '#1976d2', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              TICKET DE CAISSE
            </Typography>
            <Typography variant="body2">
              #{selectedTicket.id.slice(-6)} - {new Date(selectedTicket.timestamp).toLocaleDateString('fr-FR')} - {new Date(selectedTicket.timestamp).toLocaleTimeString('fr-FR')} · Klick {APP_VERSION}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setShowTicketModal(false)}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* Articles du ticket */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            {selectedTicket.items && Array.isArray(selectedTicket.items) && selectedTicket.items.map((item: any) => {
              const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
              const originalTotal = originalPrice * item.quantity;
              
              // Calculer le montant final avec remises
              let finalPrice = originalPrice;
              let finalTotal = originalTotal;
              let discountAmount = 0;
              
              if (selectedTicket.itemDiscounts && selectedTicket.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`]) {
                const discount = selectedTicket.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`];
                if (discount.type === 'euro') {
                  finalPrice = Math.max(0, originalPrice - discount.value);
                  finalTotal = finalPrice * item.quantity;
                  discountAmount = originalTotal - finalTotal;
                } else if (discount.type === 'percent') {
                  finalPrice = originalPrice * (1 - discount.value / 100);
                  finalTotal = finalPrice * item.quantity;
                  discountAmount = originalTotal - finalTotal;
                } else if (discount.type === 'price') {
                  finalPrice = discount.value;
                  finalTotal = finalPrice * item.quantity;
                  discountAmount = originalTotal - finalTotal;
                }
              }
              
              return (
                <Box key={`${item.product.id}-${item.selectedVariation?.id || 'main'}`} sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  py: 0.5,
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography variant="body1" sx={{ 
                      fontFamily: 'monospace',
                      minWidth: 50,
                      textAlign: 'right'
                    }}>
                      {item.quantity}
                    </Typography>
                    <Typography variant="body1">×</Typography>
                    <Typography variant="body1" sx={{ flex: 1, fontFamily: 'monospace' }}>
                      {item.product.name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {discountAmount > 0 && (
                      <>
                        <Typography variant="body1" sx={{ 
                          color: '#f44336', 
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          -{formatPrice(discountAmount)}
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#666',
                          fontFamily: 'monospace'
                        }}>
                          / ({formatPrice(originalTotal)})
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: '#1976d2', 
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}>
                          / {formatPrice(finalTotal)}
                        </Typography>
                      </>
                    )}
                    {discountAmount === 0 && (
                      <Typography variant="body1" sx={{ 
                        fontWeight: 'bold', 
                        color: '#1976d2',
                        fontFamily: 'monospace'
                      }}>
                        {formatPrice(finalTotal)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
          
          {/* Total */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2,
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            border: '2px solid #1976d2'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              TOTAL
            </Typography>
            <Typography variant="h5" sx={{ 
              fontWeight: 'bold', 
              color: '#1976d2',
              fontFamily: 'monospace'
            }}>
              {formatPrice(selectedTicket.total)}
            </Typography>
          </Box>
          
          {/* Méthode de paiement */}
          {selectedTicket.paymentMethod && (
            <Box sx={{ 
              mt: 2, 
              p: 1, 
              backgroundColor: '#e8f5e8', 
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Paiement : {selectedTicket.paymentMethod}
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Button 
            onClick={() => setShowTicketModal(false)} 
            variant="contained"
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
      )}
    </Dialog>
  );
};

export default DailyReportModal; 