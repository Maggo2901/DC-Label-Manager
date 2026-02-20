import * as XLSX from 'xlsx';
import { TEMPLATE_VERSION } from './hardeningConfig';

export function generateExcelTemplate() {
  // Define headers and example data
  const headers = [
    'aSideBase', 'aSidePort', 
    'bSideBase', 'bSidePort', 
    'lineId', 'notes', 'quantity',
    'TemplateVersion' // Hidden or explicit version column
  ];

  const exampleRow = {
    aSideBase: 'Router-01',
    aSidePort: 'eth0/1',
    bSideBase: 'PatchPanel-A',
    bSidePort: 'Port-24',
    lineId: 'L-1001',
    notes: 'Uplink',
    quantity: 1,
    TemplateVersion: TEMPLATE_VERSION
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });

  // Set column widths
  const wscols = [
    { wch: 20 }, // aSideBase
    { wch: 10 }, // aSidePort
    { wch: 20 }, // bSideBase
    { wch: 10 }, // bSidePort
    { wch: 15 }, // lineId
    { wch: 20 }, // notes
    { wch: 8 }   // quantity
  ];
  ws['!cols'] = wscols;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CableLabels");

  // Write to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
  return blob;
}
