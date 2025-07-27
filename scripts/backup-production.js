#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

config({ path: join(projectRoot, '.env'), quiet: true });

const backupsDir = process.env.BACKUP_DIR || join(projectRoot, 'backups');
if (!existsSync(backupsDir)) {
  mkdirSync(backupsDir, { recursive: true });
}

if (!process.env.CONNECTION_STRING) {
  console.error('CONNECTION_STRING environment variable is not set.');
  console.error('Please add CONNECTION_STRING to your .env file.');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
const rolesFile = join(backupsDir, `backup-${timestamp}-roles.sql`);
const schemaFile = join(backupsDir, `backup-${timestamp}-schema.sql`);
const dataFile = join(backupsDir, `backup-${timestamp}-data.sql`);

try {
  console.log('Creating production database backup...');
  console.log(`Backup location: ${backupsDir}`);

  execSync(
    `supabase db dump --db-url "${process.env.CONNECTION_STRING}" -f "${rolesFile}" --role-only`,
    {
      stdio: 'pipe',
      cwd: projectRoot,
    }
  );

  execSync(`supabase db dump --db-url "${process.env.CONNECTION_STRING}" -f "${schemaFile}"`, {
    stdio: 'pipe',
    cwd: projectRoot,
  });

  execSync(
    `supabase db dump --db-url "${process.env.CONNECTION_STRING}" -f "${dataFile}" --use-copy --data-only`,
    {
      stdio: 'pipe',
      cwd: projectRoot,
    }
  );

  console.log('Production backup completed successfully!');
} catch (error) {
  console.error('Backup failed:', error.message);
  process.exit(1);
}
