export function drawLineChart(canvas, series, options = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 900;
  const height = canvas.clientHeight || 280;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const pad = { left: 54, right: 20, top: 18, bottom: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const allValues = series.flatMap(item => item.values).filter(Number.isFinite);
  if (!allValues.length) return;

  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) { min -= 1; max += 1; }
  const extra = (max - min) * 0.08;
  min -= extra;
  max += extra;

  const xCount = Math.max(...series.map(item => item.values.length), 2);
  const x = index => pad.left + (index / (xCount - 1)) * plotW;
  const y = value => pad.top + (1 - (value - min) / (max - min)) * plotH;

  ctx.font = '12px Arial';
  ctx.fillStyle = '#6b7280';
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;

  for (let grid = 0; grid <= 5; grid++) {
    const yy = pad.top + (grid / 5) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.fillText((max - (grid / 5) * (max - min)).toFixed(options.decimals ?? 2), 6, yy + 4);
  }

  ctx.strokeStyle = '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  const labels = options.xLabels || [];
  const labelCount = Math.min(6, Math.max(2, labels.length));
  for (let i = 0; i < labelCount; i++) {
    const index = labels.length > 1 ? Math.round((i / (labelCount - 1)) * (labels.length - 1)) : 0;
    ctx.fillText(String(labels.length ? labels[index] : index), x(index) - 8, height - 10);
  }

  for (const item of series) {
    ctx.strokeStyle = item.color || (item.dashed ? '#6b7280' : '#2563eb');
    ctx.lineWidth = 2;
    ctx.setLineDash(item.dashed ? [7, 5] : []);
    ctx.beginPath();

    let drawing = false;
    item.values.forEach((value, index) => {
      if (!Number.isFinite(value)) {
        drawing = false;
        return;
      }
      if (drawing) ctx.lineTo(x(index), y(value));
      else ctx.moveTo(x(index), y(value));
      drawing = true;
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const marker of options.markerIndexes || []) {
    if (!Number.isInteger(marker.index)) continue;
    ctx.strokeStyle = marker.color || '#dc2626';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x(marker.index), pad.top);
    ctx.lineTo(x(marker.index), height - pad.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (options.legend?.length) {
    let legendX = pad.left + 8;
    const legendY = pad.top + 12;
    for (const item of options.legend) {
      ctx.strokeStyle = item.color || (item.dashed ? '#6b7280' : '#2563eb');
      ctx.setLineDash(item.dashed ? [7, 5] : []);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + 24, legendY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#374151';
      ctx.fillText(item.label, legendX + 30, legendY + 4);
      legendX += item.label.length * 7 + 55;
    }
  }
}
