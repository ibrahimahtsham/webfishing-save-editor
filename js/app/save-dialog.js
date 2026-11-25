'use strict';
/* Writing a file. The backup of the original has to be downloaded, or skipped on purpose, first. */

const GAME_DIR = '%AppData%\\Godot\\app_userdata\\webfishing_2_newver';
function copyPath() {
  const fail = () => toast('Select the path and press Ctrl+C');
  try { navigator.clipboard.writeText(GAME_DIR).then(() => toast('Folder path copied'), fail); } catch (_) { fail(); }
}
function pathRow() { return h('div', { class: 'where px' }, h('code', { class: 'path' }, GAME_DIR), button('Copy path', copyPath, 'small')); }

async function downloadBackup(f) {
  const rec = { kind: f.kind, slot: f.slot, added: Date.now() };
  saveBlob(f.u8, backupName(rec));
  f.backedUp = true;
  f.skipBackup = false;
  if (f.vaultId) await Vault.patch(f.vaultId, { downloaded: true }).catch(() => {});
  toast('Backup downloaded. Keep it somewhere safe.');
}

function saveDialog(fk) {
  const f = S.files[fk];
  if (!f) return;
  if (f.sample) return toast('This is the sample game, so there is nothing to save. Open your own save first.', 'bad');
  const { issues, bytes } = checkSave(f);
  const stops = issues.filter(i => i.level === 'stop'), warns = issues.filter(i => i.level === 'warn');
  let closed = false, slot = f.slot;
  const body = h('div', { class: 'savesteps' });
  const draw = () => {
    const ready = !stops.length && (f.backedUp || f.skipBackup) && closed && (fk === 'general' || slot != null);
    const step = (done, title, ...kids) => h('section', { class: 'sstep' + (done ? ' done' : '') }, h('span', { class: 'tick', 'aria-hidden': 'true' }, done ? '✓' : ''), h('div', { class: 'grow' }, h('h3', null, title), kids));
    put(body, 
      step(!stops.length, stops.length ? 'This file is not safe to save' : 'Safety check passed',
        stops.map(i => h('p', { class: 'issue stop' }, i.text)),
        warns.length ? h('details', { open: warns.length < 4 }, h('summary', null, plural(warns.length, 'thing') + ' to know'), warns.map(i => h('p', { class: 'issue warn' }, i.text))) : stops.length ? null : h('p', { class: 'muted small' }, 'The finished file was written, read back and compared.')),
      f.skipBackup && !f.backedUp
        ? step(true, 'Backup download skipped',
          h('p', { class: f.vaultError ? 'issue warn' : 'muted small' }, f.vaultError ? 'This browser could not keep a copy either (' + f.vaultError + '), so there will be no backup at all.' : 'The original is still kept in Backups in this browser.'),
          button('Download it after all', () => downloadBackup(f).then(draw), 'small'))
        : step(f.backedUp, f.backedUp ? 'Backup downloaded' : 'Download a backup of your original',
          h('p', { class: 'muted small' }, f.vaultError ? 'This browser could not keep its own copy (' + f.vaultError + '), so this download is the only backup.' : 'The original is also kept in Backups in this browser, but browsers can be cleared. A file on your computer cannot.'),
          h('div', { class: 'row wrap' }, button(f.backedUp ? 'Download it again' : 'Download backup', () => downloadBackup(f).then(draw), f.backedUp ? 'small' : 'primary'),
            f.backedUp ? null : button('Skip the backup', () => { f.skipBackup = true; draw(); }, 'ghost'))),
      step(closed, 'Close the game', checkbox('WEBFISHING is fully closed. If it is open, it will overwrite the edited file.', closed, v => { closed = v; draw(); })),
      fk === 'save' ? step(slot != null, 'Save into', h('select', { 'aria-label': 'Save slot', onchange: e => { slot = e.target.value === '' ? null : e.target.value; draw(); } },
        f.slot == null ? h('option', { value: '', selected: slot == null }, 'Choose a slot') : null,
        [0, 1, 2, 3].map(i => h('option', { value: i, selected: String(slot) === String(i) }, slotLabel(i) + (String(f.slot) === String(i) ? ' (the one you opened)' : '')))),
        slot != null && f.slot != null && String(slot) !== String(f.slot) ? h('p', { class: 'issue warn' }, 'This is a different slot. Whatever is in ' + slotLabel(slot) + ' will be replaced, and the backup above is not of that slot.') : null) : null,
      step(false, 'Put it in place',
        h('p', { class: 'small' }, 'Download the file, then move it into this folder and choose “Replace”. The name must be exactly ', h('b', null, fk === 'general' || slot != null ? outName(fk, slot) : 'webfishing_save_slot_#.sav'), '. If your browser adds “(1)”, remove it.'),
        pathRow(),
        h('div', { class: 'row end' }, button('Cancel', () => m.close(), 'ghost'),
          button('Download edited file', () => finish(), 'primary', { disabled: !ready }))),
      ready || stops.length ? '' : h('p', { class: 'muted small right' }, 'Finish the steps above to turn this on.'));
  };
  const finish = async () => {
    saveBlob(bytes, outName(fk, slot));
    f.savedRev = S.rev;
    try { const rec = await Vault.add({ name: outName(fk, slot), kind: fk, slot, bytes, reason: 'edited', summary: summarize(fk, f.root) }); await Vault.patch(rec.id, { downloaded: true }); } catch (_) { /* the original is what matters */ }
    m.close();
    renderChrome();
    toast('Saved ' + outName(fk, slot) + '. Move it into the game folder.');
  };
  const m = modal(fk === 'save' ? 'Save your edited game' : 'Save your edited settings', body, { wide: true });
  draw();
}
