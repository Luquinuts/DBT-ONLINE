import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, parse } from 'path';
import { cpus } from 'os';

const ROOT = join(import.meta.dirname, '..', 'frontend', 'public', 'images');

const JOBS = [
  {
    name: 'characters-full-image',
    dir: join(ROOT, 'characters-full-image'),
    width: 600,
    quality: 80,
  },
  {
    name: 'icons/characters',
    dir: join(ROOT, 'icons', 'characters'),
    width: 120,
    quality: 75,
  },
  {
    name: 'characters (card)',
    dir: join(ROOT, 'characters'),
    width: 300,
    quality: 80,
  },
  {
    name: 'battlefields',
    dir: join(ROOT, 'battlefields'),
    width: 900,
    quality: 85,
  },
];

async function convertOne(filePath, outPath, width, quality) {
  try {
    await sharp(filePath)
      .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toFile(outPath);
    const oldSize = (await import('fs')).statSync(filePath).size;
    const newSize = (await import('fs')).statSync(outPath).size;
    const pct = ((1 - newSize / oldSize) * 100).toFixed(1);
    return { file: parse(filePath).base, oldSize, newSize, pct };
  } catch (err) {
    return { file: parse(filePath).base, error: err.message };
  }
}

async function main() {
  const results = [];
  for (const job of JOBS) {
    console.log(`\n📁 ${job.name} (${job.dir} → ${job.width}px, q${job.quality})`);
    const files = (await readdir(job.dir)).filter(f => f.endsWith('.png'));
    console.log(`   ${files.length} PNGs found`);

    const tasks = files.map(file => {
      const filePath = join(job.dir, file);
      const outName = parse(file).name + '.webp';
      const outPath = join(job.dir, outName);
      return convertOne(filePath, outPath, job.width, job.quality);
    });

    // Run in parallel (up to CPU cores)
    const batch = [];
    const concurrency = cpus().length;
    for (let i = 0; i < tasks.length; i += concurrency) {
      batch.push(...(await Promise.all(tasks.slice(i, i + concurrency))));
    }
    results.push(...batch);

    // Print summary
    for (const r of batch) {
      if (r.error) {
        console.log(`   ❌ ${r.file}: ${r.error}`);
      } else {
        const oldMb = (r.oldSize / 1024 / 1024).toFixed(1);
        const newMb = (r.newSize / 1024 / 1024).toFixed(1);
        console.log(`   ✅ ${r.file}: ${oldMb}MB → ${newMb}MB (${r.pct}% reduction)`);
      }
    }
  }

  // Totals
  const totalOld = results.reduce((s, r) => s + (r.oldSize || 0), 0);
  const totalNew = results.reduce((s, r) => s + (r.newSize || 0), 0);
  const totalPct = ((1 - totalNew / totalOld) * 100).toFixed(1);
  const oldMb = (totalOld / 1024 / 1024).toFixed(0);
  const newMb = (totalNew / 1024 / 1024).toFixed(0);
  console.log(`\n═══════════════════════════════════`);
  console.log(`📊 TOTAL: ${oldMb}MB → ${newMb}MB (${totalPct}% reduction)`);
  console.log(`═══════════════════════════════════`);
}

main().catch(console.error);
