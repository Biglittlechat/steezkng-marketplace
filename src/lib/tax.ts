export const NJ_TAX_RATE = 0.06625;

export function calculateTax(lines: Array<{ price: number; qty: number }>): number {
  return lines.reduce((sum, line) => {
    if (line.price <= 0) return sum;
    return sum + line.price * line.qty * NJ_TAX_RATE;
  }, 0);
}