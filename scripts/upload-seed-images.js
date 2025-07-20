#!/usr/bin/env node

/**
 * Upload seed images to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config();

// Use environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadImage(filename) {
  try {
    const imagePath = resolve(__dirname, '../static/seed-images', filename);
    const imageBuffer = readFileSync(imagePath);

    console.log(`Uploading ${filename}...`);

    const { data, error } = await supabase.storage
      .from('public-figure-images')
      .upload(filename, imageBuffer, {
        contentType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw error;
    }

    console.log(`Successfully uploaded ${filename}`);
    return data;
  } catch (error) {
    console.error(`Error uploading ${filename}:`, error);
    return null;
  }
}

async function main() {
  console.log('Starting seed image upload...');

  // List of images to upload
  const images = ['whitney-cummings.png', 'adam-savage.jpg'];

  const results = await Promise.all(images.map(uploadImage));

  const successful = results.filter(Boolean).length;
  console.log(`\nUpload completed: ${successful}/${images.length} images uploaded successfully`);

  if (successful < images.length) {
    process.exit(1);
  }
}

main().catch(console.error);
