export function formatEuro(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe) + ' €';
}


