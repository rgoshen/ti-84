import type { Interval } from '@/scripts/explorer/parents';
import { formatNumber } from './hover';

const formatEndpoint = (value: number): string => formatNumber(value);

export function formatIntervalNotation(interval: Interval): string {
  switch (interval.kind) {
    case 'all':
      return '(-∞, ∞)';
    case 'bound': {
      const endpoint = formatEndpoint(interval.value);
      if (interval.dir === 'ge') {
        return `${interval.strict ? '(' : '['}${endpoint}, ∞)`;
      }
      return `(-∞, ${endpoint}${interval.strict ? ')' : ']'}`;
    }
    case 'exclude': {
      const endpoint = formatEndpoint(interval.value);
      return `(-∞, ${endpoint}) ∪ (${endpoint}, ∞)`;
    }
    case 'between':
      return formatClosedInterval(interval.lo, interval.hi);
  }
}

export function formatClosedInterval(first: number, second: number): string {
  const lo = Math.min(first, second);
  const hi = Math.max(first, second);
  return `[${formatEndpoint(lo)}, ${formatEndpoint(hi)}]`;
}
