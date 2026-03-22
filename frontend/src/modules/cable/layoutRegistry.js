import { CABLE_BASE_LAYOUT_LABEL } from '../../shared/labels/layoutDimensions';

const CABLE_LAYOUT_REGISTRY = {
  'layout-a': {
    slug: 'layout-a',
    label: 'Layout A',
    page: CABLE_BASE_LAYOUT_LABEL,
    printer: 'BradyPrinter i7100',
    stock: 'Brady B427',
    zones: {
      printTotalMm: 50.8,
      printHalfMm: 25.4,
      laminateMm: 50.8
    },
    previewColumns: [
      { key: 'aSide', label: 'A-Side' },
      { key: 'portA', label: 'Port A' },
      { key: 'zSide', label: 'Z-Side' },
      { key: 'portB', label: 'Port B' },
      { key: 'lineId', label: 'Line ID' }
    ]
  },
  'layout-a-qr': {
    slug: 'layout-a-qr',
    label: 'Standard Cable Label + QR',
    page: CABLE_BASE_LAYOUT_LABEL,
    printer: 'BradyPrinter i7100',
    stock: 'Brady B427',
    zones: {
      printTotalMm: 50.8,
      printHalfMm: 25.4,
      laminateMm: 50.8
    },
    previewColumns: [
      { key: 'aSide', label: 'A-Side' },
      { key: 'portA', label: 'Port A' },
      { key: 'zSide', label: 'Z-Side' },
      { key: 'portB', label: 'Port B' },
      { key: 'lineId', label: 'Line ID' }
    ]
  },
  'layout-a-rack': {
    slug: 'layout-a-rack',
    label: 'Standard Cable Label + Rack/RU',
    page: CABLE_BASE_LAYOUT_LABEL,
    printer: 'BradyPrinter i7100',
    stock: 'Brady B427',
    zones: {
      printTotalMm: 50.8,
      printHalfMm: 25.4,
      laminateMm: 50.8
    },
    previewColumns: [
      { key: 'aSide',  label: 'Device A' },
      { key: 'portA',  label: 'Port A' },
      { key: 'rackA',  label: 'Rack A' },
      { key: 'ruA',    label: 'RU A' },
      { key: 'zSide',  label: 'Device B' },
      { key: 'portB',  label: 'Port B' },
      { key: 'rackB',  label: 'Rack B' },
      { key: 'ruB',    label: 'RU B' }
    ]
  },
  'layout-b': {
    slug: 'layout-b',
    label: 'Layout B',
    page: CABLE_BASE_LAYOUT_LABEL,
    previewColumns: [
      { key: 'aSide', label: 'A-Side' },
      { key: 'zSide', label: 'Z-Side' },
      { key: 'lineId', label: 'Line ID' }
    ]
  },
  'layout-c': {
    slug: 'layout-c',
    label: 'Layout C',
    page: CABLE_BASE_LAYOUT_LABEL,
    previewColumns: [
      { key: 'lineName', label: 'Line Name' },
      { key: 'aSide', label: 'A-Side' },
      { key: 'zSide', label: 'Z-Side' }
    ]
  }
};


function getLayoutDefinition(layoutSlug) {
  return CABLE_LAYOUT_REGISTRY[layoutSlug] || null;
}

export {
  CABLE_LAYOUT_REGISTRY,
  getLayoutDefinition
};
