import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabase: SupabaseClient | null = null;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function isSupabaseEnabled(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient {
  if (!supabase) {
    if (!isSupabaseEnabled()) throw new Error('Supabase is not configured');
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return supabase;
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

export async function uploadFile(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getClient();
  const { error } = await client.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  const client = getClient();
  await client.storage.from(bucket).remove([filePath]);
}

export async function downloadFile(bucket: string, filePath: string): Promise<Buffer> {
  const client = getClient();
  const { data, error } = await client.storage.from(bucket).download(filePath);
  if (error) throw new Error(`Supabase download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export function getPublicUrl(bucket: string, filePath: string): string {
  const client = getClient();
  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Higher-level helpers
// ---------------------------------------------------------------------------

/**
 * Save an uploaded file to Supabase Storage (if enabled).
 * Works with both memory buffers and files already saved to disk.
 * Returns true if saved to Supabase.
 */
export async function saveUploadedFile(
  subdir: string,
  filename: string,
  fileBuffer: Buffer | null,
  contentType: string,
  localPath?: string,
): Promise<boolean> {
  if (!isSupabaseEnabled()) return false;

  let buffer = fileBuffer;
  if (!buffer && localPath) {
    if (fs.existsSync(localPath)) buffer = fs.readFileSync(localPath);
  }
  if (!buffer) return false;

  await uploadFile('trek-uploads', `${subdir}/${filename}`, buffer, contentType);
  return true;
}
