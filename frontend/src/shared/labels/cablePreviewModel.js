import { CABLE_SAMPLE_CONFIG } from './sampleData';

function parseIntOrFallback(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveText(value, fallback) {
  const trimmed = String(value ?? '').trim();
  return trimmed || fallback;
}

export function resolveCableConfig(raw = {}, strict = false) {
  const sample = CABLE_SAMPLE_CONFIG;
  
  if (strict) {
    return {
      layoutSlug: resolveText(raw.layoutSlug, 'layout-a'), // Layout always needs a default or UI breaks
      aSideDevice: String(raw.aSideDevice ?? '').trim(),
      zSideDevice: String(raw.zSideDevice ?? '').trim(),
      quantity: String(parseIntOrFallback(raw.quantity, 1)), // Quantity needs at least 1
      portAStart: String(raw.portAStart ?? '').trim(), // Allow empty
      portBStart: String(raw.portBStart ?? '').trim(), // Allow empty
      portStep: String(parseIntOrFallback(raw.portStep, 1)), // Step needs to be at least 1
      serialPrefix: String(raw.serialPrefix ?? '').trim(),
      serialSuffix: String(raw.serialSuffix ?? '').trim(),
      padLength: String(parseIntOrFallback(raw.padLength, 0)), // Allow 0 padding
      linePrefix: String(raw.linePrefix ?? '').trim()
    };
  }

  return {
    layoutSlug: resolveText(raw.layoutSlug, sample.layoutSlug),
    aSideDevice: resolveText(raw.aSideDevice, sample.aSideDevice),
    zSideDevice: resolveText(raw.zSideDevice, sample.zSideDevice),
    quantity: resolveText(raw.quantity, sample.quantity),
    portAStart: String(parseIntOrFallback(raw.portAStart, Number(sample.portAStart))),
    portBStart: String(parseIntOrFallback(raw.portBStart, Number(sample.portBStart))),
    portStep: String(parseIntOrFallback(raw.portStep, Number(sample.portStep))),
    serialPrefix: resolveText(raw.serialPrefix, sample.serialPrefix),
    serialSuffix: resolveText(raw.serialSuffix, sample.serialSuffix),
    padLength: String(Math.max(1, Math.min(8, parseIntOrFallback(raw.padLength, Number(sample.padLength))))),
    linePrefix: resolveText(raw.linePrefix, sample.linePrefix)
  };
}

export function buildCableFirstRow(layoutSlug, raw = {}) {
  const config = resolveCableConfig({ ...raw, layoutSlug });

  // FIX: Single mode raw input support
  if (raw.rawInput) {
    const serial = String(raw.serialPrefix || ''); // In single mode, prefix usually acts as the full identifier
    const lineId = String(raw.linePrefix || '');
    const aSide = String(raw.aSideDevice || '');
    const zSide = String(raw.zSideDevice || '');
    const portA = String(raw.portAStart || '');
    const portB = String(raw.portBStart || '');

    return {
      aSide, zSide, portA, portB, serial, lineId,
      // For compatible rendering if layout expects specific fields
      lineName: lineId
    };
  }

  const padLength = Number(config.padLength);
  const portAStart = Number(config.portAStart);
  const portBStart = Number(config.portBStart);

  const serialSuffix = String(1).padStart(padLength, '0');
  const serial = `${config.serialPrefix}${serialSuffix}${config.serialSuffix}`;
  const lineId = `${config.linePrefix}${serialSuffix}`;
  const portA = String(portAStart);
  const portB = String(portBStart);

  if (config.layoutSlug === 'layout-a') {
    return {
      aSide: `${config.aSideDevice} ${serialSuffix}`,
      portA,
      zSide: `${config.zSideDevice} ${serialSuffix}`,
      portB,
      serial,
      lineId
    };
  }

  if (config.layoutSlug === 'layout-b') {
    return {
      aSide: `${config.aSideDevice} ${portA}`,
      zSide: `${config.zSideDevice} ${portB}`,
      serial,
      lineId
    };
  }

  return {
    lineName: lineId,
    aSide: `${config.aSideDevice} ${portA}`,
    zSide: `${config.zSideDevice} ${portB}`,
    serial,
    lineId
  };
}
