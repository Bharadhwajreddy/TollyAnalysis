/**
 * Small square portraits (public/heroes/thumb/<slug>.jpg, 176 px) for avatars, the opening
 * animation and the hero wall, so those never download the full-size photos.
 * Run after scripts/fetch-hero-photos.ts:  npm run photos:thumbs
 */
import { mkdirSync, readdirSync, statSync } from "node:fs";
import sharp from "sharp";

const DIR = "public/heroes";
mkdirSync(`${DIR}/thumb`, { recursive: true });
let count = 0;
let bytes = 0;
for (const f of readdirSync(DIR)) {
  if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
  const out = `${DIR}/thumb/${f.replace(/\.\w+$/, ".jpg")}`;
  const m = await sharp(`${DIR}/${f}`).metadata();
  const side = Math.min(m.width ?? 0, m.height ?? 0);
  // Faces sit in the upper part of a portrait: crop a square starting 18% down, as the avatars do.
  const top = Math.max(0, Math.min((m.height ?? side) - side, Math.round(((m.height ?? side) - side) * 0.18)));
  const left = Math.round(((m.width ?? side) - side) / 2);
  await sharp(`${DIR}/${f}`).extract({ left, top, width: side, height: side }).resize(176, 176).jpeg({ quality: 72, mozjpeg: true }).toFile(out);
  count++;
  bytes += statSync(out).size;
}
console.log(`${count} thumbnails, ${Math.round(bytes / 1024)} KB`);
