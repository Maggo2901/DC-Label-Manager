const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure storage directory exists
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const dbPath = path.join(storageDir, 'app.db');
const db = new Database(dbPath, { 
    // verbose: console.log 
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
// Enforce foreign key constraints
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS draft_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON string
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, mode)
  );

  CREATE TABLE IF NOT EXISTS print_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    payload TEXT NOT NULL,
    total_labels INTEGER NOT NULL,
    printed_until INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    display_name TEXT,
    title TEXT,
    ip_address TEXT,
    user_agent TEXT,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    display_name TEXT,
    action TEXT NOT NULL,
    reference_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS label_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_type TEXT NOT NULL DEFAULT 'cable', 
    name TEXT NOT NULL,
    layout_key TEXT NOT NULL, -- New field for Registry Key
    page_config TEXT NOT NULL, -- JSON
    data_schema TEXT NOT NULL, -- JSON
    render_config TEXT, -- JSON (Nullable)
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS document_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    category TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// MIGRATION: Add new columns if missing
try { db.exec(`ALTER TABLE label_templates ADD COLUMN layout_key TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE label_templates ADD COLUMN page_config TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE label_templates ADD COLUMN data_schema TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE label_templates ADD COLUMN render_config TEXT`); } catch (e) {}

// MIGRATION: Drop legacy 'config' column if it exists (SQLite 3.35+)
// If this fails (older SQLite), we must ensure we populate it during inserts if it has NOT NULL constraint.
// Or we can alter the table by recreating it, but that's complex for a simple script.
// Let's try to drop it.
try { 
    db.exec(`ALTER TABLE label_templates DROP COLUMN config`); 
    console.log('Migrated label_templates: dropped legacy config column');
} catch (e) {
    // If drop fails, we might still have the column. 
    // We can't easily remove NOT NULL constraint in SQLIte without recreation.
    // So we will just handle it in the seed logic if needed, or ignore if it's already gone.
}

// Seed default templates for New Label Engine
console.log('Checking for missing default templates...');
const defaults = [
  {
    module_type: 'cable',
    name: 'Standard Cable Label',
    layout_key: 'layout-a',
    is_default: 1,
    page_config: JSON.stringify({ widthMm: 38.1, heightMm: 101.6 }),
    render_config: null,
    data_schema: JSON.stringify({
      fields: [
        { key: 'aSide', label: 'A-Side Device', type: 'text', required: true },
        { key: 'portA', label: 'Port A', type: 'text' },
        { key: 'zSide', label: 'Z-Side Device', type: 'text', required: true },
        { key: 'portB', label: 'Port B', type: 'text' },
        { key: 'serial', label: 'Line ID', type: 'text' },
        { key: 'additionalText', label: 'Note', type: 'text' }
      ]
    })
  },
  {
    module_type: 'cable',
    name: 'Standard Cable Label + QR',
    layout_key: 'layout-a-qr',
    is_default: 0,
    page_config: JSON.stringify({ widthMm: 38.1, heightMm: 101.6 }),
    render_config: null,
    data_schema: JSON.stringify({
      fields: [
        { key: 'aSide', label: 'A-Side Device', type: 'text', required: true },
        { key: 'portA', label: 'Port A', type: 'text' },
        { key: 'zSide', label: 'Z-Side Device', type: 'text', required: true },
        { key: 'portB', label: 'Port B', type: 'text' },
        { key: 'serial', label: 'Line ID', type: 'text' },
        { key: 'additionalText', label: 'Note', type: 'text' }
      ]
    })
  },
  {
     module_type: 'cable',
     name: 'Compact Cable Label',
     layout_key: 'layout-b',
     is_default: 0,
     page_config: JSON.stringify({ widthMm: 38.1, heightMm: 101.6 }),
     render_config: null,
     data_schema: JSON.stringify({
       fields: [
         { key: 'aSide', label: 'A-Side Device', type: 'text', required: true },
         { key: 'zSide', label: 'Z-Side Device', type: 'text', required: true },
         { key: 'serial', label: 'Line ID', type: 'text' }
       ]
     })
  }
];

// Check if 'config' column still exists to decide insert strategy
let hasConfigColumn = false;
try {
    const tableInfo = db.prepare("PRAGMA table_info(label_templates)").all();
    hasConfigColumn = tableInfo.some(col => col.name === 'config');
} catch (e) {}

// Clean up legitimate legacy rows that might have null layout_key
try {
    db.exec(`DELETE FROM label_templates WHERE layout_key IS NULL OR layout_key = ''`);
} catch (e) {}

const checkStmt = db.prepare('SELECT id FROM label_templates WHERE module_type = ? AND layout_key = ?');

// Construct INSERT based on schema
let insertSql = 'INSERT INTO label_templates (module_type, name, layout_key, page_config, data_schema, render_config, is_default';
let paramsSql = 'VALUES (?, ?, ?, ?, ?, ?, ?';

if (hasConfigColumn) {
    insertSql += ', config';
    paramsSql += ', ?';
}
insertSql += ') ' + paramsSql + ')';

const insertStmt = db.prepare(insertSql);

const transaction = db.transaction(() => {
    // Ensure only one default per module exists (reset defaults if we are seeding)
    // Actually, we should trust our seed data to be correct.
    
    for (const def of defaults) {
        // We use layout_key as unique constraint essentially for seeding
        const existing = checkStmt.get(def.module_type, def.layout_key);
        if (!existing) {
            console.log(`Seeding template: ${def.name}`);
            const args = [
                def.module_type, 
                def.name, 
                def.layout_key, 
                def.page_config, 
                def.data_schema, 
                def.render_config ? JSON.stringify(def.render_config) : null,
                def.is_default
            ];
            
            if (hasConfigColumn) {
                args.push(def.page_config); // Use page_config as dummy config
            }
            insertStmt.run(...args);
        } else {
             // Optional: Update existing default to ensure schema match
             // db.prepare('UPDATE label_templates SET page_config=?, data_schema=?, render_config=? WHERE id=?') ...
        }
    }
});

transaction();


// MIGRATION: Attempt to add columns if they don't exist (idempotent-ish via catch or PRAGMA)
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN display_name TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN title TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN ip_address TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN user_agent TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE print_jobs ADD COLUMN completed_at DATETIME`); } catch (e) {}
try { 
    db.exec(`ALTER TABLE print_jobs ADD COLUMN module_key TEXT`); 
    // Backfill: If module_key is null, set it to 'cable' (migrated from serial)
    db.exec(`UPDATE print_jobs SET module_key = 'cable' WHERE module_key IS NULL OR module_key = 'serial'`);
    
    // MIGRATION: Refactor 'serial' mode to 'batch'
    db.exec(`UPDATE print_jobs SET mode = 'batch' WHERE mode = 'serial'`);
} catch (e) {}

console.log('Database initialized at:', dbPath);

module.exports = db;
