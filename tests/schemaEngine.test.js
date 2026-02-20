import { describe, it, expect } from 'vitest';
import { resolveText, computeQrPayload, computeLayout } from '../shared/labelSchemas/schemaEngine.js';

/* ─── resolveText() ──────────────────────────────────────────────────── */

describe('resolveText', () => {
  it('returns staticText verbatim', () => {
    expect(resolveText({}, { staticText: '<->' })).toBe('<->');
  });

  it('stringifies numeric staticText', () => {
    expect(resolveText({}, { staticText: 42 })).toBe('42');
  });

  it('resolves single key from row', () => {
    expect(resolveText({ aSide: 'Switch-A' }, { key: 'aSide' })).toBe('Switch-A');
  });

  it('returns empty string for missing key', () => {
    expect(resolveText({}, { key: 'aSide' })).toBe('');
  });

  it('applies prefix to single key', () => {
    expect(resolveText({ portA: '1/0/1' }, { key: 'portA', prefix: 'Port ' })).toBe('Port 1/0/1');
  });

  it('applies prefix even when value is empty (non-conditional)', () => {
    expect(resolveText({}, { key: 'portA', prefix: 'Port ' })).toBe('Port ');
  });

  it('skips conditional element when value is empty', () => {
    const text = resolveText({}, { key: 'portA', conditional: true });
    expect(text).toBe('');
  });

  it('returns prefixed value for non-empty conditional', () => {
    const text = resolveText({ portA: '3' }, { key: 'portA', prefix: 'Port ', conditional: true });
    expect(text).toBe('Port 3');
  });

  it('resolves first non-empty resolveKey', () => {
    const row = { serial: '', lineId: 'L-42' };
    const el = { resolveKeys: ['additionalText', 'serial', 'lineId'] };
    expect(resolveText(row, el)).toBe('L-42');
  });

  it('applies prefix with resolveKeys', () => {
    const row = { serial: 'SN-100' };
    const el = { resolveKeys: ['serial'], prefix: 'SN: ' };
    expect(resolveText(row, el)).toBe('SN: SN-100');
  });

  it('returns empty string when all resolveKeys empty', () => {
    const row = { serial: '', lineId: '' };
    const el = { resolveKeys: ['additionalText', 'serial', 'lineId'] };
    expect(resolveText(row, el)).toBe('');
  });

  it('trims whitespace from row values', () => {
    expect(resolveText({ aSide: '  Switch-A  ' }, { key: 'aSide' })).toBe('Switch-A');
  });

  it('handles null and undefined row values', () => {
    expect(resolveText({ aSide: null }, { key: 'aSide' })).toBe('');
    expect(resolveText({ aSide: undefined }, { key: 'aSide' })).toBe('');
  });
});

/* ─── computeQrPayload() ─────────────────────────────────────────────── */

describe('computeQrPayload', () => {
  const qrDef = {
    sizeMm: 21,
    payloadFields: [
      { resolveKeys: ['additionalText', 'serial', 'lineId'] },
      { key: 'aSide', prefix: 'Device A: ' },
      { key: 'portA', prefix: 'Port A: ' },
      { key: 'zSide', prefix: 'Device B: ' },
      { key: 'portB', prefix: 'Port B: ' },
    ],
  };

  it('builds multi-line payload from full row', () => {
    const row = {
      additionalText: 'DC-01',
      aSide: 'Switch-A',
      portA: '1/0/1',
      zSide: 'Switch-B',
      portB: '1/0/2',
    };
    const payload = computeQrPayload(qrDef, row);
    expect(payload).toBe('DC-01\nDevice A: Switch-A\nPort A: 1/0/1\nDevice B: Switch-B\nPort B: 1/0/2');
  });

  it('omits empty fields from payload', () => {
    const row = { aSide: 'Switch-A', zSide: 'Switch-B' };
    const payload = computeQrPayload(qrDef, row);
    expect(payload).toBe('Device A: Switch-A\nDevice B: Switch-B');
  });

  it('uses resolveKeys fallback for first field', () => {
    const row = { serial: 'SN-999', aSide: 'A', zSide: 'B' };
    const payload = computeQrPayload(qrDef, row);
    expect(payload).toBe('SN-999\nDevice A: A\nDevice B: B');
  });

  it('returns empty string for completely empty row', () => {
    expect(computeQrPayload(qrDef, {})).toBe('');
  });
});
