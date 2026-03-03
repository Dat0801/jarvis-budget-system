export function formatVndAmountInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value).trim();
  if (!raw) {
    return '';
  }

  // Handle decimal string from backend (e.g., "37500.00")
  let processedValue = raw;
  if (raw.includes('.')) {
    // Check if it's likely a decimal (like from backend) or already formatted
    // A formatted VND string would be like "37.500" or "3.750.000"
    // A decimal string from backend would be like "37500.00"
    
    // If there's only one dot and it's near the end, it's likely a decimal
    const parts = raw.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      processedValue = parts[0];
    }
  }

  // Extract only digits
  const digits = processedValue.replace(/\D/g, '');
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
  if (!raw) return null;

  // Handle decimal string from backend (e.g., "37500.00")
  let processedValue = raw;
  if (raw.includes('.')) {
    const parts = raw.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      processedValue = parts[0];
    }
  }

  const digits = processedValue.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  const amount = parseInt(digits, 10);
  return isNaN(amount) || amount <= 0 ? null : amount;
}
