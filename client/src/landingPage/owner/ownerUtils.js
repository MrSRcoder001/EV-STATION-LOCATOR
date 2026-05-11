export const safeText = (value, fallback = '-') => String(value || fallback);

export const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

export const stationAddress = (station) => {
  const address = station?.address;
  if (!address) return '-';
  if (typeof address === 'string') return address;
  return [address.fullAddress, address.area, address.village, address.city, address.pincode].filter(Boolean).join(', ') || '-';
};

export const bookingStart = (booking) => booking?.slotId?.start || booking?.meta?.start || booking?.createdAt;

export const statusClass = (status) => {
  if (status === 'accepted' || status === 'completed') return 'bg-primary/20 text-primary-light border-primary/30';
  if (status === 'rejected' || status === 'cancelled') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (status === 'active') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
};
