// Rounds a value up to a "nice" round number for a chart axis's top tick
// (1/2/5/10 × a power of ten — e.g. 837 -> 1000, 2400 -> 5000). Used so an
// axis's ticks land on clean whole numbers instead of recharts' default
// "nice" algorithm, which can produce awkward halves like "1,5 mil €".
export function niceAxisMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

// Builds an evenly-spaced set of "nice" tick values (0, step, 2*step, ...)
// for a numeric axis. Passing these explicitly via the `ticks` prop avoids
// relying on recharts' own tick-picking, which can land on unevenly-spaced
// steps (e.g. 0 / 1,5 mil / 3 mil / 5 mil) even when the domain max itself
// is a round number.
export function niceAxisTicks(
  maxValue: number,
  tickCount = 5,
): { max: number; ticks: number[] } {
  if (maxValue <= 0 || tickCount < 2) {
    return { max: 100, ticks: [0, 100] };
  }
  const rawStep = maxValue / (tickCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const ticks = Array.from({ length: tickCount }, (_, i) => i * step);
  return { max: ticks[ticks.length - 1], ticks };
}
