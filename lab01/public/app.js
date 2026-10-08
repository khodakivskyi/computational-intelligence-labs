import { getConfig, getPulse, getSensor } from './api.js';
import { averageSignals, crossCorrelate, findPeak } from './correlation.js';
import { drawLineChart } from './charts.js';

const state = {
  config: null,
  pulse: [],
  singleDepths: [],
  averageDepths: [],
  scanning: false
};

const $ = id => document.getElementById(id);

function setStatus(text, error = false) {
  $('status').textContent = text;
  $('status').style.background = error ? '#fee2e2' : '#e5e7eb';
  $('status').style.color = error ? '#991b1b' : '#1f2937';
}

async function loadConfiguration() {
  const [config, pulse] = await Promise.all([getConfig(), getPulse()]);

  state.config = config;
  state.pulse = pulse;
  $('sampleRate').textContent = config.sample_rate ?? '—';
  $('soundSpeed').textContent = config.sound_speed ?? '—';
  $('carrierFreq').textContent = config.carrier_freq ?? '—';
  $('totalSteps').textContent = config.total_steps ?? '—';
  $('pulseLength').textContent = pulse.length;
  $('step').max = Math.max(0, Number(config.total_steps) - 1);
  drawLineChart($('pulseChart'), [{ values: pulse, color: '#7c3aed' }], {
    decimals: 2,
    xLabels: pulse.map((_, index) => index)
  });
}

function calculateDepth(correlation) {
  const { kMax, maxValue } = findPeak(correlation);
  const sampleRate = Number(state.config.sample_rate);
  const soundSpeed = Number(state.config.sound_speed);
  const delayTime = kMax / sampleRate;
  const depth = (delayTime * soundSpeed) / 2;

  return { kMax, maxValue, delayTime, depth };
}

function showMaxDepth(signalLength) {
  const sampleRate = Number(state.config.sample_rate);
  const soundSpeed = Number(state.config.sound_speed);
  const maxLag = signalLength - state.pulse.length;
  const maxDepth = maxLag >= 0 ? (maxLag * soundSpeed) / (2 * sampleRate) : 0;

  $('maxDepth').textContent = `${maxDepth.toFixed(3)} м`;
}

function updateStats(single, averaged) {
  $('kmax').textContent = averaged.kMax;
  $('delay').textContent = `${(averaged.delayTime * 1000).toFixed(3)} мс`;
  $('singleDepth').textContent = `${single.depth.toFixed(3)} м`;
  $('avgDepth').textContent = `${averaged.depth.toFixed(3)} м`;
}

function drawAll() {
  drawLineChart($('signalChart'), [
    { values: state.lastSingleSignal, dashed: true, color: '#6b7280' },
    { values: state.lastAveragedSignal, color: '#2563eb' }
  ], {
    decimals: 2,
    xLabels: state.lastSingleSignal.map((_, index) => index),
    legend: [
      { label: 'Один запит', dashed: true, color: '#6b7280' },
      { label: 'Усереднення L=4', color: '#2563eb' }
    ]
  });

  drawLineChart($('correlationChart'), [
    { values: state.lastSingleCorrelation, dashed: true, color: '#6b7280' },
    { values: state.lastAveragedCorrelation, color: '#2563eb' }
  ], {
    decimals: 2,
    xLabels: state.lastAveragedCorrelation.map((_, index) => index),
    markerIndexes: [
      { index: state.lastSingle.kMax, color: '#6b7280' },
      { index: state.lastAveraged.kMax, color: '#dc2626' }
    ],
    legend: [
      { label: 'Один запит', dashed: true, color: '#6b7280' },
      { label: 'Усереднення L=4', color: '#2563eb' }
    ]
  });

  drawLineChart($('depthChart'), [
    { values: state.singleDepths, dashed: true, color: '#6b7280' },
    { values: state.averageDepths, color: '#2563eb' }
  ], {
    decimals: 2,
    xLabels: state.averageDepths.map((_, index) => index),
    legend: [
      { label: 'Одиночне вимірювання', dashed: true, color: '#6b7280' },
      { label: 'Усереднення L=4', color: '#2563eb' }
    ]
  });
}

async function measureStep(step) {
  const singleSignal = await getSensor(step);
  showMaxDepth(singleSignal.length);

  const measurements = [singleSignal];
  for (let i = 1; i < 4; i++) measurements.push(await getSensor(step));

  const averagedSignal = averageSignals(measurements);
  const singleCorrelation = crossCorrelate(singleSignal, state.pulse);
  const averagedCorrelation = crossCorrelate(averagedSignal, state.pulse);
  const single = calculateDepth(singleCorrelation);
  const averaged = calculateDepth(averagedCorrelation);

  state.singleDepths[step] = single.depth;
  state.averageDepths[step] = averaged.depth;
  state.lastSingleSignal = singleSignal;
  state.lastAveragedSignal = averagedSignal;
  state.lastSingleCorrelation = singleCorrelation;
  state.lastAveragedCorrelation = averagedCorrelation;
  state.lastSingle = single;
  state.lastAveraged = averaged;

  updateStats(single, averaged);
  drawAll();
}

async function handleSingleMeasure() {
  try {
    const step = Number($('step').value);
    setStatus('Отримання даних…');
    await measureStep(step);
    setStatus(`Крок ${step} оброблено`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function handleScan() {
  if (state.scanning) return;

  state.scanning = true;
  $('scanButton').disabled = true;
  $('measureButton').disabled = true;
  $('stopButton').disabled = false;
  state.singleDepths = [];
  state.averageDepths = [];

  try {
    const totalSteps = Number(state.config.total_steps);
    for (let step = 0; step < totalSteps && state.scanning; step++) {
      $('step').value = step;
      setStatus(`Сканування: ${step + 1}/${totalSteps}`);
      await measureStep(step);
    }
    setStatus(state.scanning ? 'Сканування завершено' : 'Сканування зупинено');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.scanning = false;
    $('scanButton').disabled = false;
    $('measureButton').disabled = false;
    $('stopButton').disabled = true;
  }
}

$('measureButton').addEventListener('click', handleSingleMeasure);
$('scanButton').addEventListener('click', handleScan);
$('stopButton').addEventListener('click', () => { state.scanning = false; });

window.addEventListener('resize', () => {
  if (state.pulse.length) {
    drawLineChart($('pulseChart'), [{ values: state.pulse, color: '#7c3aed' }], {
      decimals: 2,
      xLabels: state.pulse.map((_, index) => index)
    });
  }
  if (state.lastSingleSignal) drawAll();
});

(async function init() {
  try {
    setStatus('Завантаження конфігурації…');
    await loadConfiguration();
    setStatus('Готово');
  } catch (error) {
    setStatus(error.message, true);
  }
})();
