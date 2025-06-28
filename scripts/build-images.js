#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BREAKPOINTS = [320, 640, 1024];

async function processImage(inputPath, filename) {
  const name = path.parse(filename).name;
  const image = sharp(inputPath);
  const { width } = await image.metadata();

  console.log(`Processing ${filename} (${width}px)`);

  const sizes = [width, ...BREAKPOINTS.filter((bp) => bp < width)];

  for (const size of sizes) {
    const suffix = size === width ? 'original' : size;
    const outputPath = `static/images/${name}-${suffix}.webp`;

    await image
      .resize(size, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    console.log(`  → ${name}-${suffix}.webp`);
  }
}

async function buildImages() {
  if (!fs.existsSync('static/images')) fs.mkdirSync('static/images', { recursive: true });
  if (!fs.existsSync('static/image-src')) {
    fs.mkdirSync('static/image-src', { recursive: true });
    console.log('Created static/image-src/ - add your images there');
    return;
  }

  const files = fs
    .readdirSync('static/image-src')
    .filter((f) => /\.(jpg|jpeg|png|webp|tiff?)$/i.test(f));

  if (files.length === 0) {
    console.log('No images found in static/image-src/');
    return;
  }

  for (const file of files) {
    await processImage(`static/image-src/${file}`, file);
  }

  console.log(`\n✅ Processed ${files.length} images`);
}

buildImages().catch(console.error);
