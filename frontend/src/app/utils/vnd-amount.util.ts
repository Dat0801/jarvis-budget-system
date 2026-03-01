export function formatVndAmountInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  // Extract only digits
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  // Simple regex-based thousand separator for VND
  // This is more stable than Intl.NumberFormat in some environments
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseVndAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  const amount = parseInt(digits, 10);
  return isNaN(amount) || amount <= 0 ? null : amount;
}
