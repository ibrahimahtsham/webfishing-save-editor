'use strict';
/* Start-up: file picking, drag and drop, shortcuts, theme. */
(function boot() {
  const picker = $('#picker');
  picker.addEventListener('change', () => { if (picker.files.length) loadFiles([...picker.files]); picker.value = ''; });

  const veil = $('#veil');
  let depth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { depth++; veil.classList.add('on'); } });
  window.addEventListener('dragleave', (e) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) veil.classList.remove('on'); } });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    depth = 0;
    veil.classList.remove('on');
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer.files.length) loadFiles([...e.dataTransfer.files]);
  });

  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
    if (ctrl && key === 's') {
      e.preventDefault();
      if ($('.overlay')) return;
      if (isSample() && S.view !== 'settings') return toast('Open your own save first.');
      const fk = S.view === 'settings' && S.files.general ? 'general' : 'save';
      if (S.files[fk] && isDirty(fk)) saveDialog(fk); else toast('No edits to save yet.');
      return;
    }
    if ($('.overlay')) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !['checkbox', 'radio'].includes(e.target.type);
    if (typing) return;
    if (ctrl && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (ctrl && key === 'y') { e.preventDefault(); redo(); }
    else if (e.key === '/') { const s = $('.search'); if (s) { e.preventDefault(); s.focus(); } }
  });
  window.addEventListener('beforeunload', (e) => { if (unsaved('save') || unsaved('general')) { e.preventDefault(); e.returnValue = ''; } });

  const theme = prefs.get('theme', '');
  if (theme) document.documentElement.dataset.theme = theme;
  $('#theme').addEventListener('click', () => {
    const now = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = now === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    prefs.set('theme', next);
  });
  loadSample();
  render();
})();
