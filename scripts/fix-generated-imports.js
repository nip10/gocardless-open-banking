#!/usr/bin/env node
/**
 * Fix generated imports to include .js extensions
 *
 * The @hey-api/openapi-ts generator doesn't add .js extensions,
 * but we need them for ESM with verbatimModuleSyntax
 */
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generatedDir = join(__dirname, '../src/types/generated');

function getAllTsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Get all .ts files recursively
const files = getAllTsFiles(generatedDir);

let count = 0;
for (const filePath of files) {
  let content = readFileSync(filePath, 'utf-8');

  // Add .js extensions to relative imports
  let modified = content.replace(/from '(\.\/.+?)'/g, (match, p1) => {
    // Already has .js extension
    if (p1.endsWith('.js')) return match;

    // Add .js extension
    return `from '${p1}.js'`;
  });

  // Special fix for directory imports (e.g., './client' -> './client/index.js')
  modified = modified.replace(/from '\.\/client\.js'/g, "from './client/index.js'");
  modified = modified.replace(/from '\.\/core\.js'/g, "from './core/index.js'");

  if (content !== modified) {
    writeFileSync(filePath, modified);
    count++;
  }
}

console.log(`✅ Fixed generated import extensions in ${count} files`);

// Delete the generated SDK file since we don't use it
const sdkGenPath = join(generatedDir, 'sdk.gen.ts');
try {
  unlinkSync(sdkGenPath);
  console.log(`✅ Removed unused sdk.gen.ts`);
} catch (error) {
  // File might not exist, which is fine
  if (error.code !== 'ENOENT') {
    console.warn(`⚠️  Could not remove sdk.gen.ts:`, error.message);
  }
}

// Remove SDK exports from index.ts
const indexPath = join(generatedDir, 'index.ts');
try {
  let indexContent = readFileSync(indexPath, 'utf-8');
  // Remove any line that exports from sdk.gen (handles both export * and export { ... })
  indexContent = indexContent.replace(/export .+ from '\.\/sdk\.gen\.js';\n?/g, '');
  writeFileSync(indexPath, indexContent);
  console.log(`✅ Removed sdk.gen export from index.ts`);
} catch (error) {
  console.warn(`⚠️  Could not update index.ts:`, error.message);
}
