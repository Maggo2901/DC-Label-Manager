import * as XLSX from 'xlsx';
import { TEMPLATE_VERSION } from './hardeningConfig';

export function generateExcelTemplate() {
  // Alle möglichen Felder — universelles Template für alle Layout-Typen.
  // Nicht benötigte Felder werden beim Import still ignoriert.
  const headers = [
    'aSideBase', 'aSidePort',
    'bSideBase', 'bSidePort',
    'rackA', 'ruA',
    'rackB', 'ruB',
    'lineId', 'notes', 'quantity',
    'TemplateVersion'
  ];

  const exampleRow = {
    aSideBase: 'Router-01',
    aSidePort: 'eth0/1',
    bSideBase: 'PatchPanel-A',
    bSidePort: 'Port-24',
    rackA: '042',
    ruA: '12',
    rackB: '043',
    ruB: '01',
    lineId: 'L-1001',
    notes: 'Uplink',
    quantity: 1,
    TemplateVersion: TEMPLATE_VERSION
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });

  // Spaltenbreiten
  const wscols = [
    { wch: 20 }, // aSideBase
    { wch: 10 }, // aSidePort
    { wch: 20 }, // bSideBase
    { wch: 10 }, // bSidePort
    { wch: 10 }, // rackA
    { wch:  8 }, // ruA
    { wch: 10 }, // rackB
    { wch:  8 }, // ruB
    { wch: 15 }, // lineId
    { wch: 20 }, // notes
    { wch:  8 }, // quantity
  ];
  ws['!cols'] = wscols;

  // Workbook erstellen
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CableLabels');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });

  return blob;
}

