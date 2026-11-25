'use strict';
const $ = (s, r = document) => r.querySelector(s);
const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'open', 'hidden', 'indeterminate', 'readOnly', 'min', 'max', 'step']);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  addKids(el, kids);
  return el;
}

/* Append children, skipping null and false, flattening lists. */
function addKids(el, ...kids) {
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) addKids(el, ...c);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
/* Replace all children. */
function put(el, ...kids) { el.replaceChildren(); return addKids(el, ...kids); }
