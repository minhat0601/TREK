import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isSupabaseEnabled, uploadFile, downloadFile } from './supabaseStorage';

const DB_BUCKET = 'trek-backups';
const DB_FILE = 'travel.db';
let lastHash = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDbPath(): string {
  return process.env.TREK_DB_FILE || path.join(__dirname, '../../data/travel.db');
}

function fileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

// ---------------------------------------------------------------------------
// Sync: upload DB to Supabase if changed
// ---------------------------------------------------------------------------

export async function syncDbToSupabase(): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return false;

  const currentHash = fileHash(dbPath);
  if (currentHash === lastHash) return false; // no changes

  const buffer = fs.readFileSync(dbPath);
  await uploadFile(DB_BUCKET, DB_FILE, buffer, 'application/x-sqlite3');
  lastHash = currentHash;
  console.log(`[DB-Sync] Database synced to Supabase (${(buffer.length / 1024).toFixed(0)} KB)`);
  return true;
}

// ---------------------------------------------------------------------------
// Restore: download DB from Supabase on fresh container start
// ---------------------------------------------------------------------------

export async function restoreDbFromSupabase(): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;
  const dbPath = getDbPath();

  // Only restore if local DB doesn't exist (fresh container start)
  if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) {
    console.log('[DB-Sync] Local database exists, skipping restore');
    lastHash = fileHash(dbPath);
    return false;
  }

  try {
    const buffer = await downloadFile(DB_BUCKET, DB_FILE);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbPath, buffer);
    lastHash = fileHash(dbPath);
    console.log(`[DB-Sync] Database restored from Supabase (${(buffer.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch {
    console.log('[DB-Sync] No backup found in Supabase, starting fresh');
    return false;
  }
}
