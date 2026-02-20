import { Cable, LibraryBig, Truck, Clock3, History, Tags } from 'lucide-react';
import CableLabelsModule from '../modules/cable/CableLabelsModule';
import TemplateLibraryModule from '../modules/template-library/TemplateLibraryModule';
import LogisticsModule from '../modules/logistics/LogisticsModule';
import ToolsTimeModule from '../modules/tools/time/ToolsTimeModule';
import PrintHistoryModule from '../modules/history/PrintHistoryModule'; // Import new module
import PtouchLabelBuilderModule from '../modules/PtouchLabelBuilder/PtouchLabelBuilderModule';

const MODULES = [
  {
    id: 'history', // Put History first or last? Based on frequency. Maybe last or near tools.
    path: '/history',
    label: 'Print History',
    icon: History,
    component: PrintHistoryModule,
    fullscreen: false,
    location: 'header'
  },
  {
    id: 'cable',
    path: '/cable',
    label: 'Cable Label Print',
    icon: Cable,
    component: CableLabelsModule,
    fullscreen: false,
    location: 'sidebar'
  },
  {
    id: 'ptouch',
    path: '/ptouch',
    label: 'P-Touch Label Builder',
    icon: Tags,
    component: PtouchLabelBuilderModule,
    fullscreen: true,
    location: 'sidebar'
  },
  {
    id: 'templates',
    path: '/templates',
    label: 'Template Library',
    icon: LibraryBig,
    component: TemplateLibraryModule,
    fullscreen: true,
    location: 'sidebar'
  },
  {
    id: 'logistics',
    path: '/logistics',
    label: 'Logistics',
    icon: Truck,
    component: LogisticsModule,
    fullscreen: false,
    location: 'sidebar'
  },
  {
    id: 'tools-time',
    path: '/tools/time',
    label: 'Time Converter',
    icon: Clock3,
    component: ToolsTimeModule,
    fullscreen: true,
    location: 'header'
  }
];

function getDefaultModule() {
  return MODULES[0];
}

function getModuleById(moduleId) {
  return MODULES.find((item) => item.id === moduleId) || null;
}

function getModuleByPath(path) {
  return MODULES.find((item) => item.path === path) || null;
}

function normalizeHashPath(hashValue) {
  const raw = String(hashValue || '').replace(/^#/, '').trim();
  if (!raw) {
    return getDefaultModule().path;
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

function getModuleLabelByMode(mode) {
    if (mode === 'single') return 'Cable Label Print'; // Map single mode to module label
    const m = MODULES.find(mod => mod.id === mode);
    return m ? m.label : mode.toUpperCase();
}

export {
  MODULES,
  getDefaultModule,
  getModuleById,
  getModuleByPath,
  normalizeHashPath,
  getModuleLabelByMode
};
