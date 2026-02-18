export function formatVndAmountInput(value: string | number | null | undefined): string {
  const digits = String(value ?? '').replace(/\D+/g, '');

  if (!digits) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

export function parseVndAmount(value: string | number | null | undefined): number | null {
  const digits = String(value ?? '').replace(/\D+/g, '');

  if (!digits) {
    return null;
  }

  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
