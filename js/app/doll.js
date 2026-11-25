'use strict';
/* Outfit preview. The body is an original drawing; the face, hats and accessories use the
   game's own pictures, and every colour is the one the game uses. */

function shade(hex, k) {
  const c = [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))));
  return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
}
function Doll(eq, { small = false } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, ...kids) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    n.append(...kids.filter(Boolean));
    return n;
  };
  const path = (d, fill, extra = {}) => el('path', { d, fill, ...extra });
  const cos = (id) => (isCosmetic(id) ? GAME_COSMETICS[id] : null);
  const pic = (file, x, y, w, hgt, tint, extra = {}) => {
    if (!file) return null;
    const n = el('image', { href: imgPath(file), x, y, width: w, height: hgt, preserveAspectRatio: 'xMidYMid meet', ...extra });
    if (tint) n.style.filter = tintFilter(tint);
    return n;
  };
  eq = eq || {};
  const worn = (slot) => cos(eq[slot]);
  const acc = [].concat(eq.accessory || []).filter(isCosmetic);
  const has = (re) => acc.find(id => re.test(id));
  const fur = (worn('primary_color') && worn('primary_color').color) || '#ffffff';
  const fur2 = (worn('secondary_color') && worn('secondary_color').color) || fur;
  const dog = eq.species === 'species_dog';
  const line = { stroke: '#101c31', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  const pattern = eq.pattern || 'pattern_none';
  const svg = el('svg', { viewBox: '0 -22 240 332', class: 'doll' + (small ? ' small' : ''), role: 'img', 'aria-label': 'Preview of your character' });

  addKids(svg, el('ellipse', { cx: 120, cy: 298, rx: 62, ry: 8, fill: '#101c31', opacity: .18 }));

  /* tail */
  const tails = {
    tail_cat: 'M152 250 C196 258 206 216 192 190 C188 182 200 176 206 186 C224 220 206 280 150 268 Z',
    tail_fox: 'M150 246 C190 236 206 196 198 168 C234 198 222 270 150 270 Z',
    tail_dog_fluffy: 'M150 242 C176 232 178 198 200 190 C232 182 232 226 208 228 C216 250 186 276 150 268 Z',
    tail_dog_short: 'M150 240 C168 226 182 214 190 212 C192 230 182 252 152 260 Z',
    tail_dog_thin: 'M150 250 C186 250 198 214 204 180 C210 176 214 182 212 188 C208 226 194 266 150 262 Z'
  };
  if (tails[eq.tail]) addKids(svg, path(tails[eq.tail], fur, line));

  /* legs and feet */
  const boots = has(/rain_boots|accessory_shoes/);
  for (const s of [-1, 1]) {
    const x = 120 + s * 22;
    addKids(svg, el('rect', { x: x - 15, y: 236, width: 30, height: 56, rx: 14, fill: pattern === 'pattern_tux' ? fur2 : fur, ...line }));
    if (worn('legs') && eq.legs !== 'legs_none') {
      const short = /short/.test(eq.legs);
      addKids(svg, path('M' + (x - 17) + ' 232 H' + (x + 17) + ' V' + (short ? 264 : 284) + ' H' + (x - 17) + ' Z', worn('legs').color || '#ffffff', line));
    }
    if (boots) {
      const tall = /rain/.test(boots);
      addKids(svg, path('M' + (x - 17) + ' ' + (tall ? 264 : 278) + ' H' + (x + 15) + ' V294 Q' + (x + 15) + ' 297 ' + (x + 12) + ' 297 H' + (x - 20) + ' Q' + (x - 23) + ' 286 ' + (x - 17) + ' 284 Z', cos(boots).color || '#ffffff', line));
    }
  }

  /* arms (behind the shirt body) */
  const under = worn('undershirt'), over = worn('overshirt');
  const hasUnder = under && eq.undershirt !== 'shirt_none', hasOver = over && eq.overshirt !== 'overshirt_none';
  const sleeveOver = hasOver && /sweatshirt|flannel|labcoat|trench/.test(eq.overshirt);
  const gloves = has(/gloves/);
  for (const s of [-1, 1]) {
    const arm = (f, y2) => path('M' + (120 + s * 30) + ' 182 Q' + (120 + s * 66) + ' 190 ' + (120 + s * 62) + ' ' + y2, 'none', { stroke: f, 'stroke-width': 22, 'stroke-linecap': 'round' });
    addKids(svg, arm('#101c31', 246), path('M' + (120 + s * 30) + ' 182 Q' + (120 + s * 66) + ' 190 ' + (120 + s * 62) + ' 246', 'none', { stroke: fur, 'stroke-width': 17, 'stroke-linecap': 'round' }));
    if (gloves || pattern === 'pattern_tux') addKids(svg, el('circle', { cx: 120 + s * 62, cy: 244, r: 9.5, fill: gloves ? cos(gloves).color || '#101c31' : fur2 }));
    const sleeve = sleeveOver ? [over.color || '#ffffff', 232] : hasUnder && !/tanktop/.test(eq.undershirt) ? [under.color || '#ffffff', 208] : null;
    if (sleeve) addKids(svg, path('M' + (120 + s * 32) + ' 183 Q' + (120 + s * (sleeve[1] > 220 ? 66 : 54)) + ' 190 ' + (120 + s * (sleeve[1] > 220 ? 63 : 60)) + ' ' + sleeve[1], 'none', { stroke: sleeve[0], 'stroke-width': 20 }));
  }

  /* body */
  const body = 'M84 176 C88 164 152 164 156 176 C164 208 162 244 154 256 C140 266 100 266 86 256 C78 244 76 208 84 176 Z';
  addKids(svg, path(body, fur, line));
  if (pattern === 'pattern_tux' || pattern === 'pattern_collie') addKids(svg, path('M104 170 H136 C146 200 142 240 120 252 C98 240 94 200 104 170 Z', fur2));
  if (pattern === 'pattern_spotted') for (const [x, y, r] of [[98, 200, 9], [142, 218, 11], [112, 240, 8], [134, 190, 6]]) addKids(svg, el('circle', { cx: x, cy: y, r, fill: fur2 }));
  if (pattern === 'pattern_calico') addKids(svg, path('M86 186 C104 184 112 204 98 220 C90 226 82 220 81 212 Z', fur2), path('M152 226 C138 222 128 240 140 254 L154 254 C160 246 160 234 152 226 Z', fur2));
  if (hasUnder) {
    const c = under.color || '#ffffff';
    addKids(svg, path(/tanktop/.test(eq.undershirt) ? 'M98 168 L106 182 H134 L142 168 L152 174 C160 206 159 232 157 246 H83 C81 232 80 206 88 174 Z' : 'M86 174 C92 164 148 164 154 174 C162 206 160 232 158 246 H82 C80 232 78 206 86 174 Z', c, line));
    if (/graphic/.test(eq.undershirt)) addKids(svg, pic(under.icon, 92, 178, 56, 56, under.color));
  }
  if (hasOver) {
    const c = over.color || '#ffffff', id = eq.overshirt;
    if (/overall/.test(id)) addKids(svg, path('M96 204 H144 V236 H158 C160 250 156 260 150 262 H90 C84 260 80 250 82 236 H96 Z', c, line), path('M98 206 L92 172 M142 206 L148 172', 'none', { stroke: c, 'stroke-width': 8 }), el('rect', { x: 108, y: 212, width: 24, height: 16, rx: 2, fill: shade(c, .8) }));
    else if (/open|labcoat|vest|trench/.test(id)) {
      for (const s of [-1, 1]) addKids(svg, path('M' + (120 + s * 8) + ' 168 L' + (120 + s * 36) + ' 174 C' + (120 + s * 44) + ' 210 ' + (120 + s * 42) + ' 240 ' + (120 + s * 39) + ' ' + (/labcoat|trench/.test(id) ? 268 : 250) + ' H' + (120 + s * 14) + ' Z', c, line));
    } else {
      addKids(svg, path('M84 174 C92 162 148 162 156 174 C164 206 162 236 159 252 H81 C78 236 76 206 84 174 Z', c, line));
      if (/closed/.test(id)) addKids(svg, path('M120 168 V250', 'none', { stroke: shade(c, .7), 'stroke-width': 2 }), path('M84 196 H156 M82 222 H158 M102 168 V250 M138 168 V250', 'none', { stroke: shade(c, .75), 'stroke-width': 5, opacity: .7 }));
    }
  }

  /* head */
  const head = dog
    ? 'M70 104 C58 70 62 30 76 20 C90 26 98 44 104 56 Q120 50 136 56 C142 44 150 26 164 20 C178 30 182 70 170 104 C186 140 160 168 120 168 C80 168 54 140 70 104 Z'
    : 'M62 112 C56 80 58 46 68 34 C82 38 94 50 102 60 Q120 54 138 60 C146 50 158 38 172 34 C182 46 184 80 178 112 C186 148 156 168 120 168 C84 168 54 148 62 112 Z';
  addKids(svg, path(head, fur, line));
  addKids(svg, path('M76 46 C86 52 90 62 92 72 L74 78 C72 66 73 54 76 46 Z', fur2), path('M164 46 C154 52 150 62 148 72 L166 78 C168 66 167 54 164 46 Z', fur2));
  if (pattern === 'pattern_collie') addKids(svg, path('M108 58 H132 C138 92 150 112 160 134 C150 160 138 166 120 166 C102 166 90 160 80 134 C90 112 102 92 108 58 Z', fur2));
  if (pattern === 'pattern_tux') addKids(svg, path('M120 100 C140 112 164 122 160 142 C150 162 138 166 120 166 C102 166 90 162 80 142 C76 122 100 112 120 100 Z', fur2));
  if (pattern === 'pattern_spotted') for (const [x, y, r] of [[82, 88, 9], [160, 98, 7], [146, 72, 6]]) addKids(svg, el('circle', { cx: x, cy: y, r, fill: fur2 }));
  if (pattern === 'pattern_calico') addKids(svg, path('M140 60 C150 50 160 42 170 37 C180 52 182 80 176 106 C160 108 142 92 140 60 Z', fur2));

  /* face */
  const eye = worn('eye'), nose = worn('nose'), mouth = worn('mouth');
  if (eye) {
    addKids(svg, pic(eye.icon, 70, 84, 42, 42));
    const other = eye.altEye || eye.icon;
    addKids(svg, pic(other, 128, 84, 42, 42, null, eye.noMirror ? {} : { transform: 'translate(298 0) scale(-1 1)' }));
  }
  if (mouth) addKids(svg, pic(mouth.icon, 80, 122, 80, 46));
  if (nose) addKids(svg, pic(nose.icon, 92, 98, 56, 56));

  /* accessories with a fixed place */
  const place = [
    [/collar/, () => null],
    [/shades/, (c) => path('M66 92 H114 V104 Q112 122 92 122 Q70 122 68 104 Z M126 92 H174 L172 104 Q170 122 148 122 Q128 122 126 104 Z M114 95 H126', c.color || '#101c31', line)],
    [/glasses_round/, (c) => path('M69 105 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M127 105 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M113 102 H127', 'none', { stroke: c.color || '#101c31', 'stroke-width': 4 })],
    [/glasses/, (c) => path('M67 90 H113 V122 H67 Z M127 90 H173 V122 H127 Z M113 100 H127', 'none', { stroke: c.color || '#101c31', 'stroke-width': 4, 'stroke-linejoin': 'round' })],
    [/monocle/, (c) => path('M127 105 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M168 118 Q178 140 164 160', 'none', { stroke: c.color || '#e69d00', 'stroke-width': 4 })],
    [/eyepatch/, (c) => path('M60 70 L180 96 M128 88 H172 Q176 124 150 126 Q124 124 128 88 Z', c.color || '#101c31', { ...line, stroke: c.color || '#101c31', 'stroke-width': 4 })],
    [/bandaid/, (c) => pic(c.icon, 136, 118, 34, 34, c.color)],
    [/accessory_cig$/, (c) => pic(c.icon, 128, 140, 40, 40, c.color)],
    [/antlers/, (c) => pic(c.icon, 56, -44, 128, 128, c.color)],
    [/hook/, (c) => pic(c.icon, 162, 232, 40, 40, c.color)],
    [/ring$/, (c) => pic(c.icon, 46, 236, 22, 22, c.color)],
    [/watch/, (c) => pic(c.icon, 166, 222, 32, 32, c.color)],
    [/sword/, (c) => pic(c.icon, 18, 188, 62, 62, c.color)]
  ];
  const collar = has(/collar/);
  if (collar) {
    addKids(svg, path('M88 166 Q120 184 152 166', 'none', { stroke: cos(collar).color || '#ac0029', 'stroke-width': 8, 'stroke-linecap': 'round' }));
    if (/bell/.test(collar)) addKids(svg, el('circle', { cx: 120, cy: 182, r: 7, fill: '#e69d00', ...line }));
  }
  for (const id of acc) {
    const p = place.find(([re]) => re.test(id)), c = cos(id);
    const n = p && p[1](c);
    if (n) addKids(svg, n);
  }
  const hat = worn('hat');
  if (hat && hat.icon) addKids(svg, pic(hat.icon, 54, -40, 132, 132, hat.color));
  acc.filter(id => /particles/.test(id)).forEach((id, i) => {
    const c = cos(id);
    addKids(svg, pic(c.icon, [0, 178, 4][i % 3], [60, 110, 180][i % 3], 60, 60, c.color), pic(c.icon, [182, 2, 180][i % 3], [40, 200, 30][i % 3], 44, 44, c.color));
  });
  return svg;
}

function equippedOf(root) { return summarize('save', root).outfit; }
function titleText(eq) { const c = eq && isCosmetic(eq.title) ? GAME_COSMETICS[eq.title] : null; return c ? c.title || '' : ''; }
