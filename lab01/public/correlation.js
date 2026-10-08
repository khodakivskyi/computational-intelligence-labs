export function crossCorrelate(signal, template) {
  const n = signal.length;
  const m = template.length;
  if (m === 0 || n < m) return [];

  const correlation = [];
  for (let k = 0; k <= n - m; k++) {
    let sum = 0;
    for (let j = 0; j < m; j++) {
      sum += signal[k + j] * template[j];
    }
    correlation.push(sum);
  }

  return correlation;
}

export function findPeak(correlation) {
  if (!correlation.length) throw new Error('Масив кореляції порожній');

  let kMax = 0;
  let maxValue = correlation[0];

  for (let k = 1; k < correlation.length; k++) {
    if (correlation[k] > maxValue) {
      maxValue = correlation[k];
      kMax = k;
    }
  }

  return { kMax, maxValue };
}

export function averageSignals(signals) {
  if (!signals.length) return [];

  const length = signals[0].length;
  if (signals.some(signal => signal.length !== length)) {
    throw new Error('Усі сигнали повинні мати однакову довжину');
  }

  const result = new Array(length).fill(0);
  for (const signal of signals) {
    for (let i = 0; i < length; i++) result[i] += signal[i];
  }

  return result.map(value => value / signals.length);
}
