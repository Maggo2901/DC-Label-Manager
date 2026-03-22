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

/* ─── computedKey — Rack/RU-Auflösung ────────────────────────────────── */

describe('resolveText — computedKey rackRuA / rackRuB', () => {
  it('kombiniert rack + ru zu R{rack}/RU{ru}', () => {
    const el = { computedKey: 'rackRuA', conditional: true };
    expect(resolveText({ rackA: '042', ruA: '12' }, el)).toBe('R042/RU12');
  });

  it('gibt nur R{rack} zurück wenn ru fehlt', () => {
    const el = { computedKey: 'rackRuA', conditional: true };
    expect(resolveText({ rackA: '042' }, el)).toBe('R042');
  });

  it('gibt nur RU{ru} zurück wenn rack fehlt', () => {
    const el = { computedKey: 'rackRuA', conditional: true };
    expect(resolveText({ ruA: '05' }, el)).toBe('RU05');
  });

  it('gibt leeren String zurück wenn beide fehlen', () => {
    const el = { computedKey: 'rackRuA', conditional: true };
    expect(resolveText({}, el)).toBe('');
  });

  it('löst rackRuB korrekt auf', () => {
    const el = { computedKey: 'rackRuB', conditional: true };
    expect(resolveText({ rackB: '099', ruB: '03' }, el)).toBe('R099/RU03');
  });

  it('trimmt Leerzeichen aus Rack- und RU-Werten', () => {
    const el = { computedKey: 'rackRuA', conditional: true };
    expect(resolveText({ rackA: ' 001 ', ruA: ' 4 ' }, el)).toBe('R001/RU4');
  });
});

/* ─── Layout A-Rack — computeLayout ─────────────────────────────────── */

import { LAYOUT_A_RACK } from '../shared/labelSchemas/cableSchemas.js';

describe('Layout A-Rack — Standard Cable + Rack/RU', () => {
  const fullRow = {
    aSide: 'CORE-SW-01',
    portA: '25',
    rackA: '042',
    ruA: '12',
    zSide: 'ACCESS-SW-05',
    portB: '3',
    rackB: '043',
    ruB: '01',
  };

  it('erzeugt korrekte Seitenabmessungen', () => {
    const { page } = computeLayout(LAYOUT_A_RACK, fullRow);
    expect(page.widthMm).toBe(38.1);
    expect(page.heightMm).toBe(101.6);
  });

  it('enthält den Laminate-Hintergrund', () => {
    const { background } = computeLayout(LAYOUT_A_RACK, fullRow);
    expect(background.length).toBeGreaterThan(0);
    expect(background[0].yMm).toBe(50.8);
  });

  it('rendert Rack/RU Zeile A als R042/RU12', () => {
    const { instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    const rackInstr = instructions.find(i => i.id === 'rackRuA');
    expect(rackInstr).toBeDefined();
    expect(rackInstr.text).toBe('R042/RU12');
  });

  it('rendert Rack/RU Zeile B als R043/RU01', () => {
    const { instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    const rackInstr = instructions.find(i => i.id === 'rackRuB');
    expect(rackInstr).toBeDefined();
    expect(rackInstr.text).toBe('R043/RU01');
  });

  it('rendert Port A mit P-Prefix', () => {
    const { instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    const portInstr = instructions.find(i => i.id === 'portA');
    expect(portInstr).toBeDefined();
    expect(portInstr.text).toBe('P25');
  });

  it('rendert Port B mit P-Prefix', () => {
    const { instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    const portInstr = instructions.find(i => i.id === 'portB');
    expect(portInstr).toBeDefined();
    expect(portInstr.text).toBe('P3');
  });

  it('überspringt Rack/RU-Zeile wenn beide Felder fehlen', () => {
    const row = { aSide: 'SW-01', portA: '1', zSide: 'SW-02', portB: '2' };
    const { instructions } = computeLayout(LAYOUT_A_RACK, row);
    const rackA = instructions.find(i => i.id === 'rackRuA');
    const rackB = instructions.find(i => i.id === 'rackRuB');
    expect(rackA).toBeUndefined();
    expect(rackB).toBeUndefined();
  });

  it('behält Device A und B', () => {
    const { instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    const aSide = instructions.find(i => i.id === 'aSide');
    const zSide = instructions.find(i => i.id === 'zSide');
    expect(aSide?.text).toBe('CORE-SW-01');
    expect(zSide?.text).toBe('ACCESS-SW-05');
  });

  it('enthält Trennlinie zwischen den Segmenten', () => {
    const { instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    const divider = instructions.find(i => i.type === 'divider');
    expect(divider).toBeDefined();
    expect(divider.yMm).toBe(25.4);
  });

  it('alle Koordinaten liegen innerhalb der Seitenabmessungen', () => {
    const { page, instructions } = computeLayout(LAYOUT_A_RACK, fullRow);
    for (const instr of instructions) {
      if (instr.xMm !== undefined) expect(instr.xMm).toBeGreaterThanOrEqual(0);
      if (instr.yMm !== undefined) {
        expect(instr.yMm).toBeGreaterThanOrEqual(0);
        expect(instr.yMm).toBeLessThan(page.heightMm);
      }
    }
  });

  it('läuft stabil mit leerem Datensatz durch', () => {
    expect(() => computeLayout(LAYOUT_A_RACK, {})).not.toThrow();
  });
});
