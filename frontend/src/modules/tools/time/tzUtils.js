const FRANKFURT_TZ = 'Europe/Berlin';

const FALLBACK_TIMEZONES = [
  'UTC',
  'GMT',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg'
];

function isValidTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getAllTimeZones() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      const zones = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(zones) && zones.length > 0) {
        return zones;
      }
    } catch {
      // fallback below
    }
  }

  return FALLBACK_TIMEZONES;
}

function parseOffsetToMinutes(offsetText) {
  if (!offsetText || offsetText === 'GMT' || offsetText === 'UTC') return 0;
  const match = String(offsetText).match(/([+-])(\d{1,2})(?::?(\d{2}))?$/);
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
  const zonePart = parts.find((item) => item.type === 'timeZoneName');
  return parseOffsetToMinutes(String(zonePart?.value || '').replace(/^UTC/, 'GMT'));
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins === 0 ? `${sign}${hours}` : `${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

function formatClock(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function getDstActive(date, timeZone) {
  const jan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 12, 0, 0));
  const jul = new Date(Date.UTC(date.getUTCFullYear(), 6, 1, 12, 0, 0));
  const janOffset = getOffsetMinutes(jan, timeZone);
  const julOffset = getOffsetMinutes(jul, timeZone);
  const nowOffset = getOffsetMinutes(date, timeZone);

  if (janOffset === julOffset) return false;
  const standardOffset = Math.min(janOffset, julOffset);
  return nowOffset !== standardOffset;
}

function describeDifferenceToFrankfurt(selectedOffsetMinutes, frankfurtOffsetMinutes) {
  const diffHours = (frankfurtOffsetMinutes - selectedOffsetMinutes) / 60;
  if (diffHours === 0) {
    return {
      compact: '(0h)',
      verbose: '0 hours (same offset)'
    };
  }

  const abs = Math.abs(diffHours);
  const amount = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);

  if (diffHours > 0) {
    return {
      compact: `(-${amount}h)`,
      verbose: `+${amount} hour${abs === 1 ? '' : 's'} (Frankfurt ahead)`
    };
  }

  return {
    compact: `(+${amount}h)`,
    verbose: `-${amount} hour${abs === 1 ? '' : 's'} (Selected ahead)`
  };
}

export {
  FRANKFURT_TZ,
  getAllTimeZones,
  isValidTimeZone,
  getOffsetMinutes,
  formatOffset,
  formatClock,
  getDstActive,
  describeDifferenceToFrankfurt
};
