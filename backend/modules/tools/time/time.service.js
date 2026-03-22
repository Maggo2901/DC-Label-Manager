const TZ_ABBR = {
  UTC: 'UTC',
  GMT: 'UTC',
  CET: 'Europe/Berlin',
  CEST: 'Europe/Berlin',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles'
};

const NAIVE_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2})(?::(\d{2})(?::(\d{2}))?)?)?$/;

function normalizeTimeZone(value, fallback = 'UTC') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  return TZ_ABBR[upper] || raw;
}

function ensureTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function hasExplicitZone(value) {
  const input = String(value || '').trim();
  return /(?:Z|[+-]\d{2}:?\d{2}|\b(?:UTC|GMT|CET|CEST|EST|EDT|PST|PDT)\b)$/i.test(input);
}

function parseOffsetMinutes(offsetText) {
  if (!offsetText || offsetText === 'GMT' || offsetText === 'UTC') return 0;
  const match = offsetText.match(/([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const hour = Number(match[2] || 0);
  const minute = Number(match[3] || 0);
  return sign * (hour * 60 + minute);
}

function getOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName');
  return parseOffsetMinutes(String(offsetPart?.value || '').replace(/^UTC/, 'GMT'));
}

function parseNaiveDateInTimeZone(input, timeZone) {
  const match = String(input || '').trim().match(NAIVE_DATE_REGEX);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);

  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  let candidate = baseUtc;
  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getOffsetMinutes(new Date(candidate), timeZone);
    const next = baseUtc - offsetMinutes * 60_000;
    if (Math.abs(next - candidate) < 1_000) {
      candidate = next;
      break;
    }
    candidate = next;
  }

  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInTimeZoneIso(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const offsetMinutes = getOffsetMinutes(date, timeZone);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offHour = String(Math.floor(abs / 60)).padStart(2, '0');
  const offMin = String(abs % 60).padStart(2, '0');

  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}${sign}${offHour}:${offMin}`;
}

const { ValidationError } = require('../../../app/http/errors');

function parseTimestampToDate(timestamp, sourceTz) {
  const raw = String(timestamp || '').trim();
  if (!raw) {
    throw new ValidationError('timestamp is required', [{ path: ['timestamp'], message: 'Required' }]);
  }

  if (/^\d+$/.test(raw)) {
    const epoch = Number(raw);
    return new Date(epoch * 1000);
  }

  if (!hasExplicitZone(raw)) {
    const parsedNaive = parseNaiveDateInTimeZone(raw, sourceTz);
    if (parsedNaive) {
      return parsedNaive;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('Unable to parse timestamp', [{ path: ['timestamp'], message: 'Invalid format' }]);
  }

  return parsed;
}

function convertTimestamp({ timestamp, sourceTz, targetTz }) {
  const normalizedSource = normalizeTimeZone(sourceTz, 'UTC');
  const normalizedTarget = normalizeTimeZone(targetTz, 'Europe/Berlin');

  if (!ensureTimeZone(normalizedSource)) {
    throw new ValidationError(`Invalid source timezone: ${normalizedSource}`, [{ path: ['sourceTz'], message: 'Invalid timezone' }]);
  }
  if (!ensureTimeZone(normalizedTarget)) {
    throw new ValidationError(`Invalid target timezone: ${normalizedTarget}`, [{ path: ['targetTz'], message: 'Invalid timezone' }]);
  }

  const date = parseTimestampToDate(timestamp, normalizedSource);

  const sourceIso = hasExplicitZone(timestamp)
    ? date.toISOString()
    : formatInTimeZoneIso(date, normalizedSource);

  const targetIso = formatInTimeZoneIso(date, normalizedTarget);

  return {
    sourceIso,
    targetIso,
    sourceTz: normalizedSource,
    targetTz: normalizedTarget
  };
}

module.exports = {
  normalizeTimeZone,
  convertTimestamp
};
