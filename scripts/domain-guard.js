const fs = require('fs');
const path = require('path');

const FORBIDDEN_FILENAMES = [
  /^serial\.controller\./,
  /^serial\.routes\./,
  /^serial\.service\./,
  /^serial\.pdf\./
];

const FORBIDDEN_CONTENT_PATTERNS = [
  { pattern: /['"]\.\.\/modules\/serial['"]/, message: 'Import from modules/serial' }, // e.g., require('../modules/serial')
  { pattern: /from ['"]\.\.\/modules\/serial['"]/, message: 'Import from modules/serial' },
  { pattern: /\/api\/serial/, message: 'API route /api/serial' },
  { pattern: /modules\/serial/, message: 'Path string modules/serial' }
];

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.idea',
  '.vscode'
];

let violations = [];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (IGNORED_DIRS.includes(file)) continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Check if directory name is 'serial' in a modules context
      if (file === 'serial' && (dir.endsWith('/modules') || dir.endsWith('\\modules'))) {
         violations.push({
             file: fullPath,
             message: 'Forbidden directory name: modules/serial'
         });
      }
      scanDirectory(fullPath);
    } else {
      // 1. Check Filename
      for (const forbidden of FORBIDDEN_FILENAMES) {
          if (forbidden.test(file)) {
              violations.push({
                  file: fullPath,
                  message: `Forbidden filename matching ${forbidden}`
              });
          }
      }

      // 2. Check Content
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const { pattern, message } of FORBIDDEN_CONTENT_PATTERNS) {
            if (pattern.test(content)) {
                // Double check for false positives if needed, but these patterns are structural
                violations.push({
                    file: fullPath,
                    message: `Forbidden content pattern: ${message}`
                });
            }
        }
      } catch (err) {
          console.error(`Error reading ${fullPath}:`, err.message);
      }
    }
  }
}

console.log('--- Starting Domain Guard Scan ---');
scanDirectory(path.resolve(__dirname, '../backend'));
scanDirectory(path.resolve(__dirname, '../frontend'));

if (violations.length > 0) {
    console.error('\n!!! DOMAIN GUARD VIOLATION DETECTED !!!');
    console.error('legacy "serial" domain references found.\n');
    violations.forEach(v => {
        console.error(`[${v.message}] ${v.file}`);
    });
    console.error('\nRefactoring required to clean "cable" domain.');
    process.exit(1);
} else {
    console.log('\n--- Domain Guard Passed: No legacy "serial" references found. ---');
    process.exit(0);
}
