import * as XLSX from 'xlsx';
import { MAX_ROW_COUNT, TEMPLATE_VERSION, CELL_LIMITS } from './hardeningConfig';

/**
 * Validates a single row against the schema and constraints
 */
function validateRow(row, rowIndex) {
  const missing = [];
  
  // Check required fields (using mapped keys)
  if (!row.aSide && row.aSide !== 0) missing.push('aSideBase');
  if (!row.portA && row.portA !== 0) missing.push('aSidePort');
  if (!row.zSide && row.zSide !== 0) missing.push('bSideBase');
  if (!row.portB && row.portB !== 0) missing.push('bSidePort');

  if (missing.length > 0) {
    return {
      row: rowIndex + 1,
      message: `Missing required fields: ${missing.join(', ')}`,
      type: 'MISSING_FIELDS'
    };
  }

  // Length Guards
  if (row.aSide.length > CELL_LIMITS.aSide) return { row: rowIndex + 1, message: `aSideBase too long (max ${CELL_LIMITS.aSide})`, type: 'INVALID_LENGTH', value: row.aSide };
  if (row.portA.length > CELL_LIMITS.portA) return { row: rowIndex + 1, message: `aSidePort too long (max ${CELL_LIMITS.portA})`, type: 'INVALID_LENGTH', value: row.portA };
  if (row.zSide.length > CELL_LIMITS.zSide) return { row: rowIndex + 1, message: `bSideBase too long (max ${CELL_LIMITS.zSide})`, type: 'INVALID_LENGTH', value: row.zSide };
  if (row.portB.length > CELL_LIMITS.portB) return { row: rowIndex + 1, message: `bSidePort too long (max ${CELL_LIMITS.portB})`, type: 'INVALID_LENGTH', value: row.portB };
  if (row.serial.length > CELL_LIMITS.serial) return { row: rowIndex + 1, message: `lineId too long (max ${CELL_LIMITS.serial})`, type: 'INVALID_LENGTH', value: row.serial };
  if (row.additionalText.length > CELL_LIMITS.additionalText) return { row: rowIndex + 1, message: `notes too long (max ${CELL_LIMITS.additionalText})`, type: 'INVALID_LENGTH', value: row.additionalText };

  // Quantity validation
  if (row.quantity && (isNaN(row.quantity) || row.quantity < 1)) {
    return {
      row: rowIndex + 1,
      message: `Invalid quantity: ${row.quantity}`,
      type: 'INVALID_VALUE',
      value: row.quantity
    };
  }

  return null;
}

/**
 * Validates Template Version from a specific cell or metadata
 * For now, we assume simple header check or a specific "TemplateVersion" cell if strictly required.
 * Implementation: Check if "TemplateVersion" key exists in first row or metadata.
 * 
 * NOTE: SheetJS json conversion might not capture "TemplateVersion" if it's in a header row 
 * that isn't the first row, or if it's a hidden sheet.
 * Simplest Robust Approach: Check for a specialized "metadata" sheet OR 
 * enforce that the downloaded template has a specific comment or cell.
 * 
 * Revision: We will check if the 'TemplateVersion' column exists in headers
 * OR just enforce strictly the required columns.
 */
function validateTemplateStructure(row0) {
    // If strict versioning is required, we'd check row0['TemplateVersion'] === TEMPLATE_VERSION
    // For now, let's stick to required columns which is a strong enough structure check.
    const required = ['aSideBase', 'aSidePort', 'bSideBase', 'bSidePort'];
    const keys = Object.keys(row0 || {});
    const missing = required.filter(k => !keys.includes(k));
    
    // Also check for Version marker if present in our template
    // if (row0['TemplateVersion'] && row0['TemplateVersion'] !== TEMPLATE_VERSION) ...
    
    return missing;
}

/**
 * Parses an uploaded Excel file using chunked processing on main thread
 * @param {File} file 
 * @param {Function} onProgress (percent) => void
 * @returns {Promise<{validRows: Array, invalidRows: Array, errors: Array}>}
 */
export async function parseExcelFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        
        // 1. Read Workbook (Synchronous, but usually fast enough for <10MB)
        // For extremely large files, we'd need a stream reader, but XLSX read is monolithic.
        // We rely on File Size Guard (10MB) to prevent browser freeze here.
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Assume first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // 2. Convert to JSON - this can be heavy, so we rely on Size Guard.
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        if (rawRows.length === 0) {
            resolve({ validRows: [], invalidRows: [], errors: [{ row: 0, message: "File is empty", type: "EMPTY_FILE" }] });
            return;
        }

        // 3. Row Count Guard
        if (rawRows.length > MAX_ROW_COUNT) {
             reject(new Error(`Too many rows. Maximum allowed is ${MAX_ROW_COUNT}. File has ${rawRows.length}.`));
             return;
        }

        // 4. Template Structure / Version Check
        // We look for 'TemplateVersion' in the first row if our template generator puts it there,
        // OR we just validate headers of the first row.
        const firstRow = rawRows[0];
        if (firstRow['TemplateVersion'] && String(firstRow['TemplateVersion']) !== TEMPLATE_VERSION) {
             reject(new Error(`Template version mismatch. Expected ${TEMPLATE_VERSION}, found ${firstRow['TemplateVersion']}. Please download the latest template.`));
             return;
        }
        
        // Check missing headers
        const missingHeaders = validateTemplateStructure(firstRow);
        if (missingHeaders.length > 0) {
             reject(new Error(`Invalid Template. Missing required columns: ${missingHeaders.join(', ')}`));
             return;
        }

        const validRows = [];
        const invalidRows = [];
        const errors = [];
        
        const total = rawRows.length;
        const CHUNK_SIZE = 100; // Process 100 rows per tick

        // 5. Chunked Processing
        let i = 0;
        
        const processChunk = () => {
             const end = Math.min(i + CHUNK_SIZE, total);
             
             for (let j = i; j < end; j++) {
                 const row = rawRows[j];
                 
                 // Normalize values and map to internal model
                 const item = {
                    aSide: String(row.aSideBase || '').trim(),
                    portA: String(row.aSidePort || '').trim(),
                    zSide: String(row.bSideBase || '').trim(),
                    portB: String(row.bSidePort || '').trim(),
                    serial: String(row.lineId || '').trim(),
                    lineId: String(row.lineId || '').trim(),
                    lineName: String(row.lineId || '').trim(),
                    additionalText: String(row.notes || '').trim(),
                    quantity: row.quantity ? parseInt(row.quantity, 10) : 1
                };

                // Skip completely empty rows
                if (!item.aSide && !item.portA && !item.zSide && !item.portB) {
                    continue;
                }

                const error = validateRow(item, j);
                if (error) {
                    errors.push(error);
                    invalidRows.push({ ...item, _row: j + 2, _error: error.message }); // +2 because 0-index + header
                } else {
                    if (item.quantity > 1) {
                         // Expand logic (limit expansion to prevent memory explosion?)
                         // Limit total expansion? 
                         // For now, trust the Row Guard on input, but check total output?
                         for (let k = 0; k < item.quantity; k++) {
                              validRows.push({ ...item, quantity: 1, _expanded: true, _originalRow: j + 2 });
                         }
                    } else {
                        validRows.push({ ...item, _row: j + 2 });
                    }
                }
             }
             
             i = end;
             
             // Report Progress
             if (onProgress) onProgress((i / total) * 100);

             if (i < total) {
                 // Schedule next chunk
                 setTimeout(processChunk, 0);
             } else {
                 // Done
                 resolve({ validRows, invalidRows, errors });
             }
        };

        // Start processing
        setTimeout(processChunk, 0);

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
