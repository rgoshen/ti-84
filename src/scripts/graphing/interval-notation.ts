import type { Interval } from '@/scripts/explorer/parents';
import { formatNumber } from './hover';
import type { Window2D } from './math';

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

export function formatVisibleDomainInterval(
  window: Window2D,
  exclusions: number[],
): string {
  const lo = Math.min(window.xMin, window.xMax);
  const hi = Math.max(window.xMin, window.xMax);
  const loText = formatEndpoint(lo);
  const hiText = formatEndpoint(hi);
  const unique = new Map<string, number>();

  for (const exclusion of exclusions) {
    if (!Number.isFinite(exclusion) || exclusion <= lo || exclusion >= hi) continue;
    const formatted = formatEndpoint(exclusion);
    if (formatted === loText || formatted === hiText) continue;
    unique.set(formatted, exclusion);
  }

  const boundaries = [lo, ...[...unique.values()].sort((left, right) => left - right), hi];
  return boundaries
    .slice(0, -1)
    .map((left, index) => {
      const right = boundaries[index + 1];
      const leftBracket = index === 0 ? '[' : '(';
      const rightBracket = index === boundaries.length - 2 ? ']' : ')';
      return `${leftBracket}${formatEndpoint(left)}, ${formatEndpoint(right)}${rightBracket}`;
    })
    .join(' ∪ ');
}
