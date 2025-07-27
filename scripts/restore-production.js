#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { config } from 'dotenv';

config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const backupsDir = process.env.BACKUP_DIR || join(projectRoot, 'backups');

function askQuestion(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

const backupFile = process.argv[2];

async function main() {
  try {
    let selectedBackup;

    if (backupFile) {
      const fullPath = backupFile.startsWith('/') ? backupFile : join(projectRoot, backupFile);
      if (!existsSync(fullPath)) {
        console.error(`Backup file not found: ${fullPath}`);
        process.exit(1);
      }
      selectedBackup = fullPath;
    } else {
      if (!existsSync(backupsDir)) {
        console.error('No backups directory found. Run backup first.');
        process.exit(1);
      }

      const backupSets = new Map();
      readdirSync(backupsDir)
        .filter((file) => file.endsWith('.sql'))
        .forEach((file) => {
          const match = file.match(/^backup-(.+)-(roles|schema|data)\.sql$/);
          if (match) {
            const [, timestamp, type] = match;
            if (!backupSets.has(timestamp)) {
              const stats = statSync(join(backupsDir, file));
              backupSets.set(timestamp, {
                timestamp,
                date: stats.mtime.toISOString().split('T')[0],
                time: stats.mtime.toTimeString().split(' ')[0],
                files: {},
              });
            }
            backupSets.get(timestamp).files[type] = join(backupsDir, file);
          }
        });

      const backups = Array.from(backupSets.values())
        .filter((backup) => backup.files.roles && backup.files.schema && backup.files.data)
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

      if (backups.length === 0) {
        console.error('No backup files found in backups directory.');
        process.exit(1);
      }

      console.log('\nAvailable backups:');
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.timestamp} (${backup.date} ${backup.time})`);
      });

      const choice = await askQuestion('\nSelect backup number (or press Enter for most recent): ');
      const selectedIndex = choice ? parseInt(choice) - 1 : 0;

      if (selectedIndex < 0 || selectedIndex >= backups.length) {
        console.error('Invalid selection.');
        process.exit(1);
      }

      selectedBackup = backups[selectedIndex];
    }

    console.log(`\nRestoring production database from: ${selectedBackup.timestamp}`);

    const cleanupSql = `
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      
      -- Also clean up any Supabase system tables that might have conflicting data
      DELETE FROM auth.audit_log_entries WHERE true;
      DELETE FROM auth.flow_state WHERE true;
      DELETE FROM auth.saml_providers WHERE true;
      DELETE FROM auth.saml_relay_states WHERE true;
      DELETE FROM auth.sso_providers WHERE true;
      DELETE FROM auth.sso_domains WHERE true;
      DELETE FROM auth.users WHERE true;
      DELETE FROM auth.sessions WHERE true;
      DELETE FROM auth.refresh_tokens WHERE true;
      DELETE FROM auth.identities WHERE true;
      
      -- Clean up storage schema tables
      DELETE FROM storage.objects WHERE true;
      DELETE FROM storage.buckets WHERE true;
    `;

    execSync(`psql --command "${cleanupSql}" --dbname "${process.env.CONNECTION_STRING}"`, {
      stdio: 'pipe',
      cwd: projectRoot,
    });

    execSync(
      `psql --single-transaction --variable ON_ERROR_STOP=1 --file "${selectedBackup.files.roles}" --file "${selectedBackup.files.schema}" --command 'SET session_replication_role = replica' --file "${selectedBackup.files.data}" --dbname "${process.env.CONNECTION_STRING}"`,
      {
        stdio: 'pipe',
        cwd: projectRoot,
      }
    );

    const refreshCache = `NOTIFY pgrst, 'reload schema';`;

    execSync(`psql --command "${refreshCache}" --dbname "${process.env.CONNECTION_STRING}"`, {
      stdio: 'pipe',
      cwd: projectRoot,
    });

    console.log('\nProduction database restored successfully!');
  } catch (error) {
    console.error('\nRestore failed:', error.message);
    process.exit(1);
  }
}

main();
