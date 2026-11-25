'use strict';
/* Opening files. A file is stored in the vault before it can be edited. */

function classify(root) {
  if (root.m.has('inventory') && root.m.has('journal')) return 'save';
  if (root.m.has('player_options')) return 'general';
  return null;
}
function readSaveFile(name, u8) {
  const { root, tail, headerOk } = parseFile(u8);
  const kind = classify(root);
  if (!kind) throw new Error('it is not a save slot or a settings file');
  const slot = name.match(/slot_(\d+)/);
  return {
    kind, name, u8, root, tail, orig: clone(root), headerOk,
    lossless: headerOk && sameBytes(serializeFile(root, tail), u8),
    slot: slot ? slot[1] : null, isBackup: /\.backup$/i.test(name), vaultId: null, vaultError: '', savedRev: -1
  };
}
function loadSample() {
  const f = readSaveFile('sample', serializeFile(freshRoot(), null));
  S.files.save = Object.assign(f, { sample: true });
}
async function storeOriginal(f) {
  try {
    const rec = await Vault.add({ name: f.name, kind: f.kind, slot: f.slot, bytes: f.u8, reason: 'opened', summary: summarize(f.kind, f.orig) });
    f.vaultId = rec.id;
    f.backedUp = rec.downloaded;
    f.knownEdit = rec.reason === 'edited';
  } catch (e) {
    f.vaultError = e.message || String(e);
  }
}

async function loadFiles(list) {
  const read = [];
  for (const file of list) {
    try {
      read.push(readSaveFile(file.name, new Uint8Array(await file.arrayBuffer())));
    } catch (e) {
      console.error(e);
      toast('Could not open ' + file.name + ': ' + e.message, 'bad');
    }
  }
  if (!read.length) return;
  for (const f of read) await storeOriginal(f);
  Vault.persist();
  /* prefer a real save over its .backup twin when both were dropped */
  const saves = read.filter(f => f.kind === 'save').sort((a, b) => a.isBackup - b.isBackup || String(a.slot).localeCompare(String(b.slot)));
  const general = read.find(f => f.kind === 'general');
  const openAll = (save) => {
    for (const f of [save, general]) if (f) confirmReplace(f.kind, () => openFile(f));
  };
  const distinct = saves.filter((f, i) => saves.findIndex(x => sameBytes(x.u8, f.u8)) === i);
  if (distinct.length > 1) {
    const m = modal('Which save do you want to edit?', [
      h('p', null, 'All of them are stored in Backups. You edit one at a time.'),
      h('div', { class: 'picklist' }, distinct.map(f => h('button', { class: 'pick px', type: 'button', onclick: () => { m.close(); openAll(f); } },
        Doll(summarize('save', f.root).outfit, { small: true }),
        h('span', { class: 'grow' }, h('b', null, slotLabel(f.slot) + (f.isBackup ? ' (game backup file)' : '')), h('span', { class: 'muted small block' }, saveLine(summarize('save', f.root)))))))
    ]);
  } else openAll(distinct[0]);
}
function saveLine(s) { return 'Rank ' + fmtNum(s.level) + ', $' + fmtNum(s.money) + ', ' + plural(s.fish, 'fish', 'fish') + ' caught, ' + plural(s.items, 'item'); }

function confirmReplace(kind, go) {
  if (!unsaved(kind)) return go();
  confirmBox('Replace the open file?', 'You have edits in ' + S.files[kind].name + ' that you have not saved. They will be lost.', 'Discard edits and open', go, true);
}
function openFile(f) {
  S.files[f.kind] = f;
  if (f.kind === 'save' && (S.view === 'home' || S.mode === 'simple')) S.view = 'progress';
  dropHistory(f.kind);
  S.rev++;
  diffCache = null;
  if (f.kind === 'save') {
    S.inv.sel.clear(); S.inv.open = null; S.jr.open = null; S.compare = null;
    if (viewFile(S.view) === 'general' && !S.files.general) S.view = 'progress';
  } else if (isSample()) S.view = 'settings';
  render();
  if (!f.lossless) toast('This file cannot be rewritten exactly, so saving is turned off for it.', 'bad');
  else if (f.vaultError) toast('Opened, but this browser could not keep a copy. Download a backup first.', 'bad');
  else toast('Opened ' + f.name + '. A copy is in Backups.');
}
function closeFile(fk) {
  const f = S.files[fk];
  const go = () => {
    S.files[fk] = null;
    dropHistory(fk);
    diffCache = null;
    S.rev++;
    if (fk === 'save') { loadSample(); S.inv.sel.clear(); S.inv.open = null; S.jr.open = null; S.compare = null; S.view = 'home'; }
    else if (S.view === 'settings') S.view = isSample() ? 'home' : 'progress';
    render();
  };
  if (unsaved(fk)) confirmBox('Close ' + f.name + '?', 'You have edits that you have not saved. They will be lost.', 'Discard edits and close', go, true);
  else go();
}
function viewFile(v) { return v === 'settings' ? 'general' : 'save'; }
function outName(kind, slot) { return kind === 'general' ? 'webfishing_general_data.sav' : 'webfishing_save_slot_' + slot + '.sav'; }
async function openFromVault(id) {
  const rec = await Vault.find(id);
  if (!rec) return toast('That backup is no longer here.', 'bad');
  const f = readSaveFile(rec.name, rec.bytes);
  if (f.slot == null) f.slot = rec.slot;
  await storeOriginal(f);
  confirmReplace(f.kind, () => openFile(f));
}
