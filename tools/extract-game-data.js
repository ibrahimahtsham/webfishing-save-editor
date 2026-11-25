/*
 * Developer tool: rebuilds js/data/items.js, js/data/cosmetics.js and assets/game/
 * from an installed copy of WEBFISHING. It only reads the game file.
 *
 *   node tools/extract-game-data.js "C:/Program Files (x86)/Steam/steamapps/common/WEBFISHING/webfishing.exe"
 *
 * Not needed to use the editor.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXE = process.argv[2] || 'C:/Program Files (x86)/Steam/steamapps/common/WEBFISHING/webfishing.exe';
const IMG_DIR = path.join(ROOT, 'assets', 'game');

/* ---------- the resource pack appended to the game executable ---------- */
function openPack(file) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const read = (offset, length) => { const b = Buffer.alloc(length); fs.readSync(fd, b, 0, length, offset); return b; };
  const trailer = read(size - 12, 12);
  if (trailer.toString('latin1', 8) !== 'GDPC') throw new Error('No Godot pack found in ' + file);
  const base = size - 12 - Number(trailer.readBigUInt64LE(0));
  let p = base + 4 + 16 + 64;
  const count = read(p, 4).readUInt32LE(0); p += 4;
  const dir = read(p, Math.min(4e6, size - p));
  const files = new Map();
  for (let i = 0, q = 0; i < count; i++) {
    const len = dir.readUInt32LE(q); q += 4;
    const name = dir.toString('utf8', q, q + len).replace(/\0+$/, ''); q += len;
    files.set(name, { offset: Number(dir.readBigUInt64LE(q)), size: Number(dir.readBigUInt64LE(q + 8)) });
    q += 32;
  }
  return { files, read: (name) => { const f = files.get(name); return f ? read(f.offset, f.size) : null; } };
}
const pack = openPack(EXE);

/* ---------- Godot text resources ---------- */
function parseResource(text) {
  const ext = {}, sub = {}, props = {};
  for (const m of text.matchAll(/\[ext_resource path="([^"]+)" type="([^"]+)" id=(\d+)\]/g)) ext[m[3]] = m[1];
  for (const block of text.split(/\n(?=\[(?:sub_resource|resource))/)) {
    const head = block.match(/^\[(sub_resource|resource)([^\]]*)\]/);
    if (!head) continue;
    const target = head[1] === 'resource' ? props : (sub[(head[2].match(/id=(\d+)/) || [])[1]] = {});
    for (const m of block.matchAll(/^([\w/]+) = ("(?:[^"\\]|\\.)*"|\[[^\]]*\]|.+)$/gm)) target[m[1]] = m[2].trim();
  }
  return { ext, sub, props };
}
const str = (v, d = '') => v == null ? d : v.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n');
const num = (v, d) => v == null ? d : Number(v);
const bool = (v, d = false) => v == null ? d : v === 'true';
function color(v) {
  const m = v && v.match(/Color\(([^)]+)\)/);
  if (!m) return null;
  const hex = m[1].split(',').slice(0, 3).map(x => Math.round(Math.min(1, Number(x)) * 255).toString(16).padStart(2, '0')).join('');
  return hex === 'ffffff' ? null : '#' + hex;
}

/* ---------- textures ---------- */
const savedImages = new Map();
function saveImage(resPath) {
  if (!resPath) return null;
  if (savedImages.has(resPath)) return savedImages.get(resPath);
  const imp = pack.read(resPath + '.import');
  let out = null;
  if (imp) {
    const stex = (imp.toString('utf8').match(/path="([^"]+\.stex)"/) || [])[1];
    const data = stex && pack.read(stex);
    const at = data ? data.indexOf('RIFF') : -1;
    if (at >= 0) {
      out = path.basename(resPath, path.extname(resPath)) + '.webp';
      fs.writeFileSync(path.join(IMG_DIR, out), data.subarray(at, at + data.readUInt32LE(at + 4) + 8));
    }
  }
  if (!out) console.warn('no image for', resPath);
  savedImages.set(resPath, out);
  return out;
}
function textureRef(value, res) {
  if (!value) return null;
  let m = value.match(/ExtResource\(\s*(\d+)\s*\)/);
  if (m) {
    const target = res.ext[m[1]];
    if (/\.png$/i.test(target)) return saveImage(target);
    const nested = /\.tres$/.test(target) && pack.read(target);
    if (!nested) return null;
    const r = parseResource(nested.toString('utf8'));
    return textureRef(r.props['frame_0/texture'] || r.props.atlas, r);
  }
  m = value.match(/SubResource\(\s*(\d+)\s*\)/);
  return m && res.sub[m[1]] ? textureRef(res.sub[m[1]]['frame_0/texture'] || res.sub[m[1]].atlas, res) : null;
}
const textureList = (value, res) => [...(value || '').matchAll(/ExtResource\(\s*\d+\s*\)/g)].map(m => textureRef(m[0], res));

/* ---------- walk every resource ---------- */
fs.mkdirSync(IMG_DIR, { recursive: true });
const items = {}, cosmetics = {};
for (const name of [...pack.files.keys()].sort()) {
  const m = name.match(/^res:\/\/Resources\/([^/]+)\/([^/]+)\.tres$/);
  if (!m) continue;
  const text = pack.read(name).toString('utf8');
  const res = parseResource(text), p = res.props, group = m[1], id = m[2];
  if (/item_resource\.gd/.test(text)) {
    const it = {
      name: str(p.item_name), desc: str(p.item_description), category: str(p.category, 'none'), group,
      icon: textureRef(p.icon, res), table: str(p.loot_table, 'none'), tier: num(p.tier, 0), avg: num(p.average_size, 75),
      weight: num(p.loot_weight, 1), sell: num(p.sell_value, 5), worth: bool(p.generate_worth, true), usesSize: bool(p.uses_size)
    };
    if (bool(p.unobtainable)) it.unobtainable = true;
    if (bool(p.item_is_hidden)) it.hidden = true;
    if (bool(p.stackable)) it.stack = num(p.max_stacks, 99);
    if (!bool(p.can_be_sold, true)) it.noSell = true;
    if (bool(p.unrenamable)) it.noRename = true;
    items[id] = it;
  } else if (/cosmetic_resource\.gd/.test(text)) {
    const c = { name: str(p.name), desc: str(p.desc), category: str(p.category), icon: textureRef(p.icon, res), color: color(p.main_color) };
    if (str(p.title)) c.title = str(p.title);
    const alt = textureRef(p.alt_eye, res);
    if (alt) c.altEye = alt;
    if (!bool(p.mirror_face, true)) c.noMirror = true;
    if (bool(p.chest_reward)) c.chest = true;
    const pattern = textureList(p.body_pattern, res);
    if (pattern.length) c.pattern = pattern;
    cosmetics[id] = c;
  }
}
/* the favorite heart, and pictures used by the gear page */
saveImage('res://Assets/Textures/UI/item_star.png');
for (let i = 1; i <= 25; i++) {
  const res = 'res://Assets/Textures/UI/bait_icons' + i + '.png';
  if (pack.files.has(res + '.import')) saveImage(res);
}

const banner = '/* Generated by tools/extract-game-data.js from the installed game. Do not edit by hand. */\n';
const dump = (name, obj) => banner + 'const ' + name + ' = {\n' +
  Object.entries(obj).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n};\n' +
  "if (typeof module !== 'undefined') module.exports = " + name + ';\n';
fs.writeFileSync(path.join(ROOT, 'js/data/items.js'), dump('GAME_ITEMS', items));
fs.writeFileSync(path.join(ROOT, 'js/data/cosmetics.js'), dump('GAME_COSMETICS', cosmetics));
console.log(Object.keys(items).length, 'items,', Object.keys(cosmetics).length, 'cosmetics,', [...savedImages.values()].filter(Boolean).length, 'images');
