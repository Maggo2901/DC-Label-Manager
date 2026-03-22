import { describe, it, expect } from 'vitest';
import { computeLayout } from '../shared/labelSchemas/schemaEngine.js';
import {
  LAYOUT_A,
  LAYOUT_A_QR,
  LAYOUT_B,
  LAYOUT_C,
  CABLE_PAGE,
  SEGMENT_HEIGHT_MM,
} from '../shared/labelSchemas/cableSchemas.js';

/* ─── Shared test data ───────────────────────────────────────────────── */

const FULL_ROW = {
  additionalText: 'DC-01',
  aSide: 'Switch-A',
  portA: '1/0/1',
  zSide: 'Switch-B',
  portB: '1/0/2',
  lineName: 'Line-1',
  lineId: 'LID-7',
  serial: 'SN-100',
};

const MINIMAL_ROW = {
  aSide: 'A',
  zSide: 'B',
};

const EMPTY_ROW = {};

/* ─── Helper assertions ──────────────────────────────────────────────── */

function assertPageDimensions(result) {
  expect(result.page).toEqual(CABLE_PAGE);
  expect(result.page.widthMm).toBe(38.1);
  expect(result.page.heightMm).toBe(101.6);
}

function assertAllInstructionsBounded(result) {
  for (const inst of result.instructions) {
    expect(inst.yMm).toBeGreaterThanOrEqual(0);
    if (inst.type === 'text') {
      expect(inst.xMm).toBeGreaterThanOrEqual(0);
      expect(inst.xMm + inst.widthMm).toBeLessThanOrEqual(result.page.widthMm + 0.01);
    }
    if (inst.type === 'qr') {
      expect(inst.xMm).toBeGreaterThanOrEqual(0);
    }
    if (inst.type === 'divider') {
      expect(inst.widthMm).toBe(result.page.widthMm);
    }
  }
}

function assertUniqueIds(result) {
  const textIds = result.instructions
    .filter((i) => i.type === 'text')
    .map((i) => i.id);
  expect(new Set(textIds).size).toBe(textIds.length);
}

/* ═══ Layout A — Standard Cable ═══════════════════════════════════════ */

describe('Layout A — Standard Cable', () => {
  it('produces correct page dimensions', () => {
    assertPageDimensions(computeLayout(LAYOUT_A, FULL_ROW));
  });

  it('contains background laminate region', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    expect(result.background).toHaveLength(1);
    expect(result.background[0].yMm).toBe(50.8);
  });

  it('produces instructions for full row', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    const types = result.instructions.map((i) => i.type);

    // Two blocks + one divider
    expect(types.filter((t) => t === 'divider')).toHaveLength(1);
    expect(types.filter((t) => t === 'text').length).toBeGreaterThanOrEqual(10);
  });

  it('renders additionalText with resolveKeys', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    const addlTexts = result.instructions.filter((i) => i.id === 'additionalText');
    expect(addlTexts.length).toBeGreaterThanOrEqual(1);
    expect(addlTexts[0].text).toBe('DC-01');
  });

  it('skips conditional elements when empty', () => {
    const result = computeLayout(LAYOUT_A, MINIMAL_ROW);
    const addlTexts = result.instructions.filter((i) => i.id === 'additionalText');
    expect(addlTexts).toHaveLength(0);

    const ports = result.instructions.filter((i) => i.id === 'portA' || i.id === 'portB');
    expect(ports).toHaveLength(0);
  });

  it('renders arrow as static text', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    const arrows = result.instructions.filter((i) => i.id === 'arrow');
    expect(arrows.length).toBeGreaterThanOrEqual(1);
    expect(arrows[0].text).toBe('<->');
  });

  it('positions divider at segment boundary', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    const dividers = result.instructions.filter((i) => i.type === 'divider');
    expect(dividers[0].yMm).toBe(SEGMENT_HEIGHT_MM);
  });

  it('keeps all coordinates within page bounds', () => {
    assertAllInstructionsBounded(computeLayout(LAYOUT_A, FULL_ROW));
  });

  it('produces consistent instruction count for same input', () => {
    const a = computeLayout(LAYOUT_A, FULL_ROW);
    const b = computeLayout(LAYOUT_A, FULL_ROW);
    expect(a.instructions.length).toBe(b.instructions.length);
  });

  it('handles empty row without crashing', () => {
    const result = computeLayout(LAYOUT_A, EMPTY_ROW);
    expect(result.instructions.length).toBeGreaterThanOrEqual(1);
  });
});

/* ═══ Layout A-QR — Standard + QR ════════════════════════════════════ */

describe('Layout A-QR — Standard Cable + QR', () => {
  it('produces correct page dimensions', () => {
    assertPageDimensions(computeLayout(LAYOUT_A_QR, FULL_ROW));
  });

  it('contains one QR instruction', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    const qrs = result.instructions.filter((i) => i.type === 'qr');
    expect(qrs).toHaveLength(1);
  });

  it('QR payload contains all non-empty fields', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    const qr = result.instructions.find((i) => i.type === 'qr');
    expect(qr.payload).toContain('DC-01');
    expect(qr.payload).toContain('Device A: Switch-A');
    expect(qr.payload).toContain('Port A: 1/0/1');
    expect(qr.payload).toContain('Device B: Switch-B');
    expect(qr.payload).toContain('Port B: 1/0/2');
  });

  it('QR code is centered horizontally', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    const qr = result.instructions.find((i) => i.type === 'qr');
    const expectedX = (CABLE_PAGE.widthMm - qr.sizeMm) / 2;
    expect(qr.xMm).toBeCloseTo(expectedX, 2);
  });

  it('QR code is positioned in second segment', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    const qr = result.instructions.find((i) => i.type === 'qr');
    expect(qr.yMm).toBeGreaterThanOrEqual(SEGMENT_HEIGHT_MM);
  });

  it('QR sizeMm is 21mm', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    const qr = result.instructions.find((i) => i.type === 'qr');
    expect(qr.sizeMm).toBe(21);
  });

  it('has divider between text block and QR', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    const dividers = result.instructions.filter((i) => i.type === 'divider');
    expect(dividers).toHaveLength(1);
    expect(dividers[0].yMm).toBe(SEGMENT_HEIGHT_MM);
  });

  it('provides empty QR payload for empty row', () => {
    const result = computeLayout(LAYOUT_A_QR, EMPTY_ROW);
    const qr = result.instructions.find((i) => i.type === 'qr');
    expect(qr.payload).toBe('');
  });
});

/* ═══ Layout B — Compact ═════════════════════════════════════════════ */

describe('Layout B — Compact Cable', () => {
  it('produces correct page dimensions', () => {
    assertPageDimensions(computeLayout(LAYOUT_B, FULL_ROW));
  });

  it('has no background', () => {
    const result = computeLayout(LAYOUT_B, FULL_ROW);
    expect(result.background).toHaveLength(0);
  });

  it('produces exactly 6 text instructions (3 per block × 2 blocks)', () => {
    const result = computeLayout(LAYOUT_B, FULL_ROW);
    const texts = result.instructions.filter((i) => i.type === 'text');
    expect(texts).toHaveLength(6);
  });

  it('uses centered positioning', () => {
    const result = computeLayout(LAYOUT_B, FULL_ROW);
    const texts = result.instructions.filter((i) => i.type === 'text');
    // In centered layout, all elements share the same widthMm
    const uniqueWidths = new Set(texts.map((t) => t.widthMm));
    expect(uniqueWidths.size).toBe(1);
  });

  it('second block starts at segment boundary', () => {
    const result = computeLayout(LAYOUT_B, FULL_ROW);
    const texts = result.instructions.filter((i) => i.type === 'text');
    // First 3 instructions in segment 0 (y < SEGMENT_HEIGHT_MM)
    // Last 3 instructions in segment 1 (y >= SEGMENT_HEIGHT_MM)
    const secondBlock = texts.slice(3);
    for (const t of secondBlock) {
      expect(t.yMm).toBeGreaterThanOrEqual(SEGMENT_HEIGHT_MM);
    }
  });

  it('has no dividers', () => {
    const result = computeLayout(LAYOUT_B, FULL_ROW);
    const dividers = result.instructions.filter((i) => i.type === 'divider');
    expect(dividers).toHaveLength(0);
  });

  it('handles empty row', () => {
    const result = computeLayout(LAYOUT_B, EMPTY_ROW);
    expect(result.instructions).toHaveLength(6);
  });
});

/* ═══ Layout C — Grid (2×2) ══════════════════════════════════════════ */

describe('Layout C — Grid Cable (2×2)', () => {
  it('produces correct page dimensions', () => {
    assertPageDimensions(computeLayout(LAYOUT_C, FULL_ROW));
  });

  it('has no background', () => {
    const result = computeLayout(LAYOUT_C, FULL_ROW);
    expect(result.background).toHaveLength(0);
  });

  it('produces 12 text instructions (3 elements × 4 cells)', () => {
    const result = computeLayout(LAYOUT_C, FULL_ROW);
    const texts = result.instructions.filter((i) => i.type === 'text');
    expect(texts).toHaveLength(12);
  });

  it('generates unique IDs for each grid cell', () => {
    const result = computeLayout(LAYOUT_C, FULL_ROW);
    assertUniqueIds(result);
  });

  it('grid cell IDs encode row and column', () => {
    const result = computeLayout(LAYOUT_C, FULL_ROW);
    const ids = result.instructions.map((i) => i.id);
    expect(ids).toContain('lineName_r0c0');
    expect(ids).toContain('lineName_r1c1');
    expect(ids).toContain('zSide_r1c0');
  });

  it('grid cells cover the full page width', () => {
    const result = computeLayout(LAYOUT_C, FULL_ROW);
    const texts = result.instructions.filter((i) => i.type === 'text');
    const xPositions = [...new Set(texts.map((t) => t.xMm))];
    // Should have positions in two columns
    expect(xPositions.length).toBeGreaterThanOrEqual(2);
  });

  it('all coordinates are within page bounds', () => {
    assertAllInstructionsBounded(computeLayout(LAYOUT_C, FULL_ROW));
  });

  it('handles empty row', () => {
    const result = computeLayout(LAYOUT_C, EMPTY_ROW);
    expect(result.instructions).toHaveLength(12);
  });
});

/* ═══ Cross-layout invariants ════════════════════════════════════════ */

describe('Cross-layout invariants', () => {
  const layouts = [
    ['layout-a', LAYOUT_A],
    ['layout-a-qr', LAYOUT_A_QR],
    ['layout-b', LAYOUT_B],
    ['layout-c', LAYOUT_C],
  ];

  for (const [name, schema] of layouts) {
    it(`${name}: all instructions have valid type`, () => {
      const result = computeLayout(schema, FULL_ROW);
      for (const inst of result.instructions) {
        expect(['text', 'divider', 'qr']).toContain(inst.type);
      }
    });

    it(`${name}: all text instructions have required fields`, () => {
      const result = computeLayout(schema, FULL_ROW);
      for (const inst of result.instructions.filter((i) => i.type === 'text')) {
        expect(inst).toHaveProperty('id');
        expect(inst).toHaveProperty('text');
        expect(inst).toHaveProperty('xMm');
        expect(inst).toHaveProperty('yMm');
        expect(inst).toHaveProperty('widthMm');
        expect(inst).toHaveProperty('fontSizePt');
        expect(inst).toHaveProperty('fontWeight');
        expect(inst).toHaveProperty('align');
      }
    });

    it(`${name}: stable output for identical input`, () => {
      const a = computeLayout(schema, FULL_ROW);
      const b = computeLayout(schema, FULL_ROW);
      expect(a).toEqual(b);
    });

    it(`${name}: handles null/undefined row gracefully`, () => {
      expect(() => computeLayout(schema, null)).not.toThrow();
      expect(() => computeLayout(schema, undefined)).not.toThrow();
    });
  }

  it('page override replaces schema page', () => {
    const override = { widthMm: 50, heightMm: 120 };
    const result = computeLayout(LAYOUT_A, FULL_ROW, override);
    expect(result.page).toEqual(override);
  });
});

/* ═══ Edge cases ═════════════════════════════════════════════════════ */

describe('Edge cases', () => {
  it('very long text does not affect coordinates', () => {
    const longRow = {
      ...FULL_ROW,
      aSide: 'A'.repeat(200),
      zSide: 'Z'.repeat(200),
    };
    const normal = computeLayout(LAYOUT_A, FULL_ROW);
    const long = computeLayout(LAYOUT_A, longRow);

    // Same number of instructions, same positions
    expect(long.instructions.length).toBe(normal.instructions.length);
    for (let i = 0; i < normal.instructions.length; i++) {
      expect(long.instructions[i].xMm).toBe(normal.instructions[i].xMm);
      expect(long.instructions[i].yMm).toBe(normal.instructions[i].yMm);
    }
  });

  it('special characters in text pass through', () => {
    const row = { aSide: 'Ärger & Ölfilter <>"\'', zSide: '端末B' };
    const result = computeLayout(LAYOUT_A, row);
    const aSide = result.instructions.find((i) => i.id === 'aSide');
    expect(aSide.text).toBe('Ärger & Ölfilter <>"\'');
  });

  it('additionalText falls back through resolveKeys chain', () => {
    // no additionalText, no serial, has lineId
    const row = { aSide: 'A', zSide: 'B', lineId: 'FALLBACK' };
    const result = computeLayout(LAYOUT_A, row);
    const addl = result.instructions.find((i) => i.id === 'additionalText');
    expect(addl.text).toBe('FALLBACK');
  });

  it('decorator metadata is preserved on flow elements', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    const addl = result.instructions.find((i) => i.id === 'additionalText');
    expect(addl.decorator).toBe('dividerLine');
    expect(addl.decoratorColor).toBe('#000000');
    expect(addl.decoratorThicknessMm).toBe(0.3);
    expect(addl.decoratorGapMm).toBe(1.0);
  });
});

/* ═══ Snapshot — layout drift detection ══════════════════════════════ */

describe('Layout drift detection (snapshots)', () => {
  it('Layout A full row snapshot', () => {
    const result = computeLayout(LAYOUT_A, FULL_ROW);
    expect(result).toMatchSnapshot();
  });

  it('Layout A-QR full row snapshot', () => {
    const result = computeLayout(LAYOUT_A_QR, FULL_ROW);
    expect(result).toMatchSnapshot();
  });

  it('Layout B full row snapshot', () => {
    const result = computeLayout(LAYOUT_B, FULL_ROW);
    expect(result).toMatchSnapshot();
  });

  it('Layout C full row snapshot', () => {
    const result = computeLayout(LAYOUT_C, FULL_ROW);
    expect(result).toMatchSnapshot();
  });

  it('Layout A minimal row snapshot', () => {
    const result = computeLayout(LAYOUT_A, MINIMAL_ROW);
    expect(result).toMatchSnapshot();
  });

  it('Layout A-QR minimal row snapshot', () => {
    const result = computeLayout(LAYOUT_A_QR, MINIMAL_ROW);
    expect(result).toMatchSnapshot();
  });
});
