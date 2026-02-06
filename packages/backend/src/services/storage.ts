import { logger } from '@/config/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// STORAGE SERVICE
// Handles file storage for Vault
// Replace with S3, GCS, or other cloud storage as needed
// ============================================

const STORAGE_BASE_PATH = process.env.STORAGE_PATH || './uploads';

/**
 * Upload a file to storage
 */
export async function uploadFileToStorage(storagePath: string, file: File): Promise<void> {
  const fullPath = path.join(STORAGE_BASE_PATH, storagePath);
  const dir = path.dirname(fullPath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Convert File to Buffer and write
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(fullPath, buffer);

  logger.info({ storagePath }, 'File uploaded to storage');
}

/**
 * Delete a file from storage
 */
export async function deleteFileFromStorage(storagePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_BASE_PATH, storagePath);

  try {
    await fs.unlink(fullPath);
    logger.info({ storagePath }, 'File deleted from storage');
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get a file from storage
 */
export async function getFileFromStorage(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_BASE_PATH, storagePath);
  return fs.readFile(fullPath);
}

/**
 * Check if a file exists in storage
 */
export async function fileExistsInStorage(storagePath: string): Promise<boolean> {
  const fullPath = path.join(STORAGE_BASE_PATH, storagePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
