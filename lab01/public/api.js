async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();

  if (!response.ok) {
    let message = text;
    try { message = JSON.parse(text).error || text; } catch {}
    throw new Error(`${response.status}: ${message}`);
  }

  return JSON.parse(text);
}

function toNumberArray(value) {
  if (Array.isArray(value)) return value.map(Number);
  if (Array.isArray(value?.data)) return value.data.map(Number);
  if (Array.isArray(value?.values)) return value.values.map(Number);
  if (Array.isArray(value?.signal)) return value.signal.map(Number);
  throw new Error('API повернуло дані у невідомому форматі');
}

export async function getConfig() {
  return getJson('/api/config');
}

export async function getPulse() {
  return toNumberArray(await getJson('/api/pulse'));
}

export async function getSensor(step) {
  return toNumberArray(await getJson(`/api/sensor?step=${encodeURIComponent(step)}`));
}
