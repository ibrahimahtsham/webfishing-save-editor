'use strict';
/* Backups: every file opened or written, kept byte for byte. */
function BackupsView() {
  const host = h('div', null, h('p', { class: 'muted' }, 'Looking…'));
  let recs = [];
  const draw = async () => {
    try { recs = await Vault.list(); } catch (e) {
      put(host, h('p', { class: 'note' }, 'This browser cannot keep backups here (' + e.message + '). Download a backup before you save anything.'));
      return;
    }
    if (!recs.length) { put(host, h('p', { class: 'empty' }, 'No backups yet. Open a save and a copy appears here.')); return; }
    put(host, h('div', { class: 'vault' }, recs.map(row)));
  };
  const row = (r) => h('article', { class: 'vrow px' },
    r.kind === 'save' ? Doll(r.summary.outfit, { small: true }) : h('span', { class: 'vicon', 'aria-hidden': 'true' }, '⚙'),
    h('div', { class: 'grow' },
      h('div', { class: 'row wrap' }, h('b', null, r.kind === 'general' ? 'Game settings' : slotLabel(r.slot)), h('span', { class: 'tag ' + r.reason }, r.reason === 'edited' ? 'Edited here' : 'Original'), r.downloaded ? h('span', { class: 'tag good' }, 'Downloaded') : null),
      h('div', { class: 'small' }, r.kind === 'save' ? saveLine(r.summary) : fmtBytes(r.size)),
      h('div', { class: 'muted small' }, whenText(r.added) + ', ' + r.name),
      h('input', { type: 'text', class: 'notebox', value: r.note || '', placeholder: 'Add a note', 'aria-label': 'Note', maxlength: 80, onchange: (e) => Vault.patch(r.id, { note: e.target.value }) })),
    h('div', { class: 'vacts' },
      button('Download', async () => { saveBlob(r.bytes, backupName(r)); await Vault.patch(r.id, { downloaded: true }); const f = S.files[r.kind]; if (f && f.vaultId === r.id) f.backedUp = true; toast('Backup downloaded.'); draw(); }, 'small primary'),
      button('Open', () => openFromVault(r.id), 'small'),
      button('Delete', () => confirmBox('Delete this backup?', r.downloaded ? 'It is removed from this browser. The copy you downloaded stays on your computer.' : 'You have not downloaded this one. Deleting it here cannot be undone.', 'Delete', async () => { await Vault.remove(r.id); draw(); }, true), 'small danger')));
  draw();
  const all = () => {
    if (!recs.length) return toast('There is nothing to download yet.');
    const used = new Map();
    const files = recs.map(r => { let n = backupName(r); const c = used.get(n) || 0; used.set(n, c + 1); if (c) n = n.replace('.sav', ' (' + (c + 1) + ').sav'); return { name: n, bytes: r.bytes, date: new Date(r.added) }; });
    saveBlob(makeZip(files), 'webfishing backups ' + stamp() + '.zip', 'application/zip');
    recs.forEach(r => Vault.patch(r.id, { downloaded: true }));
    toast('Downloaded ' + plural(files.length, 'backup') + '.');
    setTimeout(draw, 300);
  };
  return h('div', { class: 'page' }, pageHead('Backups', 'A copy of every file you open or save. Nothing here is removed unless you delete it.', inSimple() ? button('Back', () => go('progress')) : null, button('Download all (.zip)', all, 'primary')),
    h('details', { class: 'help px' }, h('summary', null, 'How to put a backup back'),
      h('ol', null, h('li', null, 'Close WEBFISHING.'), h('li', null, 'Download the backup here.'),
        h('li', null, 'Rename it to the name the game uses, such as ', h('code', null, 'webfishing_save_slot_0.sav'), ' for Save Slot 1.'), h('li', null, 'Move it into the game folder and choose “Replace”.')),
      pathRow(), h('p', { class: 'muted small' }, 'The game’s own .backup file is not an older copy. It is rewritten every time the game saves.')),
    host,
    h('p', { class: 'muted small' }, 'These live in this browser. Clearing site data, or a private window, removes them, so download the ones you care about.'));
}
