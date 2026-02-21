export type CurrencyCode = 'USD' | 'EUR' | 'VND' | 'GBP' | 'JPY';

const DEFAULT_CURRENCY: CurrencyCode = 'VND';

const SUPPORTED_CODES: CurrencyCode[] = ['USD', 'EUR', 'VND', 'GBP', 'JPY'];

export function normalizeCurrencyCode(value: string | null | undefined): CurrencyCode {
  if (!value) {
    return DEFAULT_CURRENCY;
  }

  const upper = value.toUpperCase();
  const detected = SUPPORTED_CODES.find((code) => upper.includes(code));
  return detected || DEFAULT_CURRENCY;
}

export function getStoredCurrencyCode(): CurrencyCode {
  return normalizeCurrencyCode(localStorage.getItem('currency'));
}

export function getCurrencyDisplay(code: CurrencyCode): string {
  if (code === 'VND') {
    return 'đ';
  }

  return code;
}

export function formatCurrencyAmount(value: number, code: CurrencyCode, includeFractions = false): string {
  const minimumFractionDigits = includeFractions ? 2 : 0;
  const maximumFractionDigits = includeFractions ? 2 : 0;

  if (code === 'VND') {
    const formatted = new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);

    return `${formatted} đ`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}