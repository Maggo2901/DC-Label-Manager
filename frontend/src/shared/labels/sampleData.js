export const GLOBAL_SAMPLE_CONTEXT = {
  siteCode: 'DC-FRA1',
  rackId: 'RACK-FRA1-12',
  aSideDevice: 'FRA1-LEAF-01',
  zSideDevice: 'FRA1-SPINE-01',
  deviceName: 'FRA1-EDGE-SWITCH',
  requestedBy: 'Network Operations',
  orderNumber: 'WO-240216-17'
};

export const CABLE_SAMPLE_CONFIG = {
  layoutSlug: 'layout-a',
  aSideDevice: GLOBAL_SAMPLE_CONTEXT.aSideDevice,
  zSideDevice: GLOBAL_SAMPLE_CONTEXT.zSideDevice,
  quantity: '24',
  portAStart: '1',
  portBStart: '1',
  portStep: '1',
  serialPrefix: 'FRA1-',
  serialSuffix: '-A',
  padLength: '3',
  linePrefix: 'LINE-'
};

export const TEMPLATE_SAMPLE_FORM = {
  templateId: 'maintenance',
  location: `${GLOBAL_SAMPLE_CONTEXT.siteCode} / ${GLOBAL_SAMPLE_CONTEXT.rackId}`,
  requestedBy: GLOBAL_SAMPLE_CONTEXT.requestedBy,
  note: 'Temporary recabling for line migration window.'
};

export const TEMPLATE_PREVIEW_STYLE = {
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance',
    subtitle: 'Scheduled maintenance in progress',
    accentColor: '#f59e0b',
    textColor: '#111827'
  },
  'do-not-touch': {
    id: 'do-not-touch',
    name: 'Do Not Touch',
    subtitle: 'Authorized personnel only',
    accentColor: '#dc2626',
    textColor: '#111827'
  },
  'temporary-install': {
    id: 'temporary-install',
    name: 'Temporary Install',
    subtitle: 'Temporary deployment - review required',
    accentColor: '#2563eb',
    textColor: '#111827'
  }
};
