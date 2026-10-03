(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let api, revision = -1;
  const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  // Each preview is a script-free, sandboxed 1920×1080 rendering.
  function resize() {
    ['current', 'next'].forEach(name => { $(name + 'Preview').style.transform = `scale(${$(name + 'Box').clientWidth / 1920})`; });
  }
  function disconnected() {
    $('connection').textContent = 'Audience window disconnected. Reopen presenter mode from the deck.';
    document.querySelectorAll('button').forEach(b => { b.disabled = true; });
  }
  function update() {
    try {
      if (!window.opener || window.opener.closed || window.opener.deck !== api || api.disconnected) { disconnected(); return; }
      const state = api.snapshot(revision);
      $('title').textContent = state.title;
      document.title = state.title + ' — Presenter';
      $('counter').textContent = state.counter;
      $('elapsed').textContent = time(state.elapsed);
      $('slideElapsed').textContent = time(state.slideElapsed);
      $('target').textContent = time(state.target * 1000);
      $('slideTarget').textContent = time(state.seconds * 1000);
      $('elapsed').classList.toggle('over', state.target > 0 && state.elapsed > state.target * 1000);
      $('slideElapsed').classList.toggle('over', state.seconds > 0 && state.slideElapsed > state.seconds * 1000);
      $('timer').textContent = state.running ? 'Pause timer' : state.elapsed ? 'Resume timer' : 'Start timer';
      $('prev').disabled = state.first; $('next').disabled = state.last;
      $('appendix').disabled = !state.hasAppendix;
      $('appendix').textContent = state.appendix ? 'Return' : 'Appendix';
      if (state.revision !== revision) {
        $('notes').textContent = state.notes;
        $('notes').scrollTop = 0;
        $('currentPreview').srcdoc = state.currentHTML;
        $('nextPreview').srcdoc = state.nextHTML;
        $('nextPreview').hidden = !state.nextHTML;
        $('endLabel').hidden = !!state.nextHTML;
        revision = state.revision;
      }
      resize();
    } catch { disconnected(); }
  }
  try { api = window.opener.deck.connect(window); } catch { disconnected(); return; }
  $('prev').onclick = () => { api.step(-1); update(); };
  $('next').onclick = () => { api.step(1); update(); };
  $('appendix').onclick = () => { api.appendix(); update(); };
  $('timer').onclick = () => { api.timer('toggle'); update(); };
  $('reset').onclick = () => { api.timer('reset'); update(); };
  addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === ' ' && event.target.closest('button')) return;
    if (['arrowright', 'arrowdown', 'pagedown', ' '].includes(key)) { event.preventDefault(); api.step(1); }
    else if (['arrowleft', 'arrowup', 'pageup'].includes(key)) { event.preventDefault(); api.step(-1); }
    else if (key === 'a') { event.preventDefault(); api.appendix(); }
    else if (key === 'home') { event.preventDefault(); api.show(api.main[0]); }
    else if (key === 'end') { event.preventDefault(); api.show(api.group.at(-1)); }
    update();
  });
  addEventListener('resize', resize);
  update(); setInterval(update, 200);
})();
