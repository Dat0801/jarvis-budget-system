export function formatVndAmountInput(value: string | number | null | undefined): string {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  const decimalPattern = /^-?\d+(\.\d{1,2})$/;

  let amount: number | null = null;

  if (typeof value === 'number') {
    amount = value;
  } else if (decimalPattern.test(raw)) {
    amount = Number.parseFloat(raw);
  } else {
    const digits = raw.replace(/\D+/g, '');
    if (!digits) {
      return '';
    }
    amount = Number(digits);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function parseVndAmount(value: string | number | null | undefined): number | null {
  const digits = String(value ?? '').replace(/\D+/g, '');

  if (!digits) {
    return null;
  }

  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
