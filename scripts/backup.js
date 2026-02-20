#!/usr/bin/env node

/**
 * DC Label Platform — Backup Script
 *
 * Creates a timestamped backup archive containing:
 *   - SQLite database (safe hot backup via .backup() API)
 *   - Uploaded document templates
 *
 * Usage:
 *   node scripts/backup.js              # backs up to ./backups/
 *   node scripts/backup.js /mnt/nas     # backs up to /mnt/nas/
 *
 * Works both on the host and inside the Docker container.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const STORAGE_DIR = path.resolve(__dirname, '..', 'backend', 'storage');
const DB_PATH = path.join(STORAGE_DIR, 'app.db');
const DOC_TEMPLATES_DIR = path.join(STORAGE_DIR, 'doc-templates');
const DEFAULT_BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function backupDatabase(targetDir) {
  const dbBackupPath = path.join(targetDir, 'app.db');

  // Use SQLite's .backup command for a safe hot backup
  // This works even if the server is running (WAL mode)
  try {
    const Database = require('better-sqlite3');
    const source = new Database(DB_PATH, { readonly: true });
    source.backup(dbBackupPath)
      .then(() => {
        source.close();
        console.log(`  ✓ Database backed up: ${dbBackupPath}`);
      })
      .catch((err) => {
        source.close();
        // Fallback: simple file copy
        console.warn(`  ⚠ Async backup failed (${err.message}), using file copy fallback`);
        fs.copyFileSync(DB_PATH, dbBackupPath);
        console.log(`  ✓ Database copied: ${dbBackupPath}`);
      });
    return true;
  } catch {
    // better-sqlite3 not available — fallback to file copy
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, dbBackupPath);
      console.log(`  ✓ Database copied (fallback): ${dbBackupPath}`);
      return true;
    }
    console.warn('  ✗ No database file found — skipping');
    return false;
  }
}

function backupDocTemplates(targetDir) {
  const destDir = path.join(targetDir, 'doc-templates');

  if (!fs.existsSync(DOC_TEMPLATES_DIR)) {
    console.log('  – No doc-templates directory — skipping');
    return;
  }

  copyDirRecursive(DOC_TEMPLATES_DIR, destDir);
  console.log(`  ✓ Doc templates backed up: ${destDir}`);
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createArchive(sourceDir, archivePath) {
  try {
    execSync(`tar -czf "${archivePath}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`, {
      stdio: 'pipe',
    });
    console.log(`  ✓ Archive created: ${archivePath}`);
    // Remove uncompressed staging directory
    fs.rmSync(sourceDir, { recursive: true, force: true });
    return true;
  } catch {
    console.warn('  ⚠ tar not available — keeping uncompressed backup');
    return false;
  }
}

/* ─── Main ───────────────────────────────────────────────────────────── */

function main() {
  const backupRoot = process.argv[2] || DEFAULT_BACKUP_DIR;
  const ts = timestamp();
  const backupName = `dc-label-backup_${ts}`;
  const stagingDir = path.join(backupRoot, backupName);

  console.log(`DC Label Platform — Backup`);
  console.log(`  Target: ${backupRoot}`);
  console.log(`  Timestamp: ${ts}`);
  console.log('');

  ensureDir(stagingDir);

  backupDatabase(stagingDir);
  backupDocTemplates(stagingDir);

  // Try to compress into tar.gz
  const archivePath = path.join(backupRoot, `${backupName}.tar.gz`);
  createArchive(stagingDir, archivePath);

  console.log('');
  console.log('Backup complete.');
}

main();
