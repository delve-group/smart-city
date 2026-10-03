(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = JSON.parse($('deckConfig').textContent);
  const slides = [...document.querySelectorAll('#deckStage > .slide')];
  const editable = [...document.querySelectorAll('[data-key]')];
  const storageKey = `html-deck:${config.id}:${config.revision}:${location.pathname}`;

  function sanitize(markup) {
    const input = document.createElement('template');
    const out = document.createElement('div');
    input.innerHTML = String(markup);
    function copy(from, to) {
      for (const node of from.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) { to.append(document.createTextNode(node.textContent)); continue; }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)) continue;
        if (['BR', 'EM', 'STRONG', 'SPAN', 'SMALL'].includes(node.tagName)) {
          const safe = document.createElement(node.tagName);
          // Classes are presentation-only; event handlers and arbitrary attributes never survive.
          if (/^[a-zA-Z0-9_ -]+$/.test(node.getAttribute('class') || '')) safe.className = node.className;
          copy(node, safe); to.append(safe);
        } else {
          if (['DIV', 'P'].includes(node.tagName) && to.lastChild && to.lastChild.nodeName !== 'BR') to.append(document.createElement('br'));
          copy(node, to);
        }
      }
    }
    copy(input.content, out);
    return out.innerHTML;
  }
  let statusTimeout;
  function announce(text) {
    $('status').textContent = text;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => { $('status').textContent = ''; }, 7000);
  }
  function saveLocal() {
    try { localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(editable.map(n => [n.dataset.key, sanitize(n.innerHTML)])))); }
    catch { announce('Local storage is unavailable. Download HTML to keep your edits.'); }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    editable.forEach(n => { if (typeof saved?.[n.dataset.key] === 'string') n.innerHTML = sanitize(saved[n.dataset.key]); });
  } catch { /* Editing and download also work without local storage. */ }

  class Deck {
    constructor() {
      this.config = config;
      this.slides = slides;
      this.main = slides.flatMap((s, i) => s.dataset.kind !== 'appendix' ? [i] : []);
      this.backup = slides.flatMap((s, i) => s.dataset.kind === 'appendix' ? [i] : []);
      this.current = this.main[0]; this.lastMain = this.current;
      this.editing = false; this.presenterWindow = null; this.disconnected = false;
      this.running = false; this.elapsed = 0; this.slideElapsed = 0; this.lastTick = performance.now();
      this.revision = 0;
      this.fit(); this.show(this.hashIndex()); this.bind(); this.controls();
      setInterval(() => this.tick(), 200);
    }
    get inAppendix() { return slides[this.current].dataset.kind === 'appendix'; }
    get group() { return this.inAppendix ? this.backup : this.main; }
    fit() {
      const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
      $('deckStage').style.transform = `translate(${(innerWidth - 1920 * scale) / 2}px,${(innerHeight - 1080 * scale) / 2}px) scale(${scale})`;
    }
    hashIndex() {
      const match = location.hash.match(/^#slide-(\d+)$/);
      return match ? Number(match[1]) - 1 : this.main[0];
    }
    show(index) {
      if (!Number.isFinite(index)) index = this.main[0];
      index = Math.max(0, Math.min(Math.trunc(index), slides.length - 1));
      this.tick();
      if (index !== this.current) this.slideElapsed = 0;
      this.current = index;
      if (!this.inAppendix) this.lastMain = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
        slide.inert = i !== index;
      });
      const position = this.group.indexOf(index);
      $('counter').textContent = `${this.inAppendix ? 'A ' : ''}${position + 1} / ${this.group.length}`;
      $('prev').disabled = position === 0;
      $('next').disabled = position === this.group.length - 1;
      $('appendix').disabled = !this.backup.length;
      $('appendix').textContent = this.inAppendix ? 'Return' : 'Appendix';
      $('appendix').setAttribute('aria-pressed', String(this.inAppendix));
      try { history.replaceState(null, '', `#slide-${index + 1}`); } catch { /* file:// browser restriction */ }
      this.revision++;
    }
    step(delta) { this.show(this.group[Math.max(0, Math.min(this.group.indexOf(this.current) + delta, this.group.length - 1))]); }
    appendix() { if (this.backup.length) this.show(this.inAppendix ? this.lastMain : this.backup[0]); }
    tick() {
      const now = performance.now();
      if (this.running) { const delta = now - this.lastTick; this.elapsed += delta; this.slideElapsed += delta; }
      this.lastTick = now;
    }
    timer(action) {
      this.tick();
      if (action === 'reset') { this.elapsed = 0; this.slideElapsed = 0; this.running = false; }
      else this.running = !this.running;
    }
    preview(index) {
      if (index === undefined) return '';
      const clone = slides[index].cloneNode(true);
      clone.classList.add('active'); clone.removeAttribute('inert'); clone.removeAttribute('aria-hidden');
      clone.querySelectorAll('[contenteditable]').forEach(n => { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); });
      return '<!doctype html><html lang="' + config.lang + '"><head><meta charset="utf-8"><style>' + $('deckStyles').textContent + '</style></head><body><main id="deckStage">' + clone.outerHTML + '</main></body></html>';
    }
    snapshot(lastRevision) {
      this.tick();
      const position = this.group.indexOf(this.current);
      const note = config.notes[slides[this.current].id];
      const result = {
        revision: this.revision, title: config.title, counter: $('counter').textContent,
        elapsed: this.elapsed, slideElapsed: this.slideElapsed, running: this.running,
        seconds: note.seconds, target: this.main.reduce((sum, i) => sum + config.notes[slides[i].id].seconds, 0),
        first: position === 0, last: position === this.group.length - 1, appendix: this.inAppendix,
        hasAppendix: this.backup.length, disconnected: this.disconnected
      };
      if (lastRevision !== this.revision) Object.assign(result, {
        notes: note.text, currentHTML: this.preview(this.current), nextHTML: this.preview(this.group[position + 1])
      });
      return result;
    }
    present() {
      if (this.presenterWindow && !this.presenterWindow.closed) { this.presenterWindow.focus(); return; }
      this.presenterWindow = window.open('', `presenter-${config.id}`, 'popup,width=1280,height=860');
      if (!this.presenterWindow) { announce('Allow popups for this page, then press P again to open the speaker window.'); return; }
      this.presenterWindow.document.open();
      this.presenterWindow.document.write(JSON.parse($('presenterTemplate').textContent));
      this.presenterWindow.document.close();
      this.presenterWindow.focus();
    }
    connect(popup) {
      if (popup !== this.presenterWindow) throw new Error('Unknown presenter window');
      return this;
    }
    controls() {
      document.body.classList.add('controls-visible');
      $('controlsToggle').setAttribute('aria-expanded', 'true');
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = setTimeout(() => {
        if (this.editing || $('controls').contains(document.activeElement)) return;
        document.body.classList.remove('controls-visible');
        $('controlsToggle').setAttribute('aria-expanded', 'false');
      }, 2300);
    }
    async fullscreen() {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
      catch { announce('Fullscreen is unavailable here. Use the browser fullscreen command.'); }
    }
    edit(force) {
      const next = force ?? !this.editing;
      if (!next && document.activeElement?.isContentEditable) document.activeElement.blur();
      this.editing = next;
      document.body.classList.toggle('editing', next);
      $('edit').setAttribute('aria-pressed', String(next));
      $('edit').textContent = next ? 'Done' : 'Edit';
      editable.forEach(n => {
        if (next) { n.contentEditable = 'true'; n.spellcheck = false; }
        else { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); n.innerHTML = sanitize(n.innerHTML); }
      });
      saveLocal(); this.revision++; this.controls();
    }
    export() {
      if (this.editing) this.edit(false);
      saveLocal();
      const clone = document.documentElement.cloneNode(true);
      const newConfig = {...config, revision: `${config.revision}-${Date.now()}`};
      clone.querySelector('#deckConfig').textContent = JSON.stringify(newConfig).replace(/</g, '\\u003c');
      clone.querySelector('body').classList.remove('editing', 'controls-visible');
      clone.querySelector('#deckStage').removeAttribute('style');
      clone.querySelector('#status').textContent = '';
      clone.querySelector('#helpDialog').removeAttribute('open');
      clone.querySelectorAll('[data-key]').forEach(n => { n.innerHTML = sanitize(n.innerHTML); n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); });
      clone.querySelectorAll('.slide').forEach((s, i) => { s.classList.toggle('active', i === this.main[0]); s.inert = i !== this.main[0]; s.setAttribute('aria-hidden', String(i !== this.main[0])); });
      const url = URL.createObjectURL(new Blob(['<!doctype html>\n', clone.outerHTML], {type:'text/html;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = config.id + '.html'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    key(event) {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 's') { event.preventDefault(); this.export(); return; }
      if (key === 'escape' && this.editing) { this.edit(false); return; }
      if (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey || $('helpDialog').open) return;
      if (key === ' ' && event.target.closest('button,a,summary')) return;
      const actions = {
        arrowright: () => this.step(1), arrowdown: () => this.step(1), pagedown: () => this.step(1), ' ': () => this.step(1),
        arrowleft: () => this.step(-1), arrowup: () => this.step(-1), pageup: () => this.step(-1),
        home: () => this.show(this.main[0]), end: () => this.show(this.group.at(-1)),
        p: () => this.present(), a: () => this.appendix(), f: () => this.fullscreen(), e: () => this.edit()
      };
      if (actions[key]) { event.preventDefault(); actions[key](); }
    }
    bind() {
      const click = (id, fn) => $(id).addEventListener('click', fn);
      click('prev', () => this.step(-1)); click('next', () => this.step(1));
      click('presenter', () => this.present()); click('appendix', () => this.appendix());
      click('fullscreen', () => this.fullscreen()); click('edit', () => this.edit());
      click('save', () => this.export()); click('help', () => $('helpDialog').showModal());
      click('controlsToggle', () => this.controls());
      $('controls').addEventListener('click', event => {
        if (event.detail > 0) event.target.closest('button')?.blur();
        this.controls();
      });
      addEventListener('keydown', e => this.key(e));
      addEventListener('resize', () => this.fit());
      addEventListener('hashchange', () => this.show(this.hashIndex()));
      addEventListener('pointermove', () => this.controls(), {passive:true});
      document.addEventListener('focusin', () => this.controls());
      addEventListener('beforeunload', () => { this.disconnected = true; });
      let touch = null;
      $('deckStage').addEventListener('touchstart', e => {
        this.controls();
        touch = !this.editing && e.touches.length === 1 && !e.target.closest('a,button,input,[contenteditable]') ? [e.touches[0].clientX, e.touches[0].clientY] : null;
      }, {passive:true});
      $('deckStage').addEventListener('touchend', e => {
        if (!touch) return;
        const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) this.step(dx < 0 ? 1 : -1);
        touch = null;
      }, {passive:true});
      $('deckStage').addEventListener('touchcancel', () => { touch = null; }, {passive:true});
      editable.forEach(node => {
        node.addEventListener('input', () => { saveLocal(); this.revision++; });
        node.addEventListener('blur', () => { if (this.editing) { node.innerHTML = sanitize(node.innerHTML); saveLocal(); this.revision++; } });
        for (const type of ['paste', 'drop']) node.addEventListener(type, event => {
          if (!this.editing) return;
          event.preventDefault();
          const text = (event.clipboardData || event.dataTransfer)?.getData('text/plain') || '';
          const selection = getSelection();
          if (!selection?.rangeCount) return;
          const range = selection.getRangeAt(0);
          if (!node.contains(range.commonAncestorContainer)) return;
          range.deleteContents();
          const fragment = document.createDocumentFragment();
          text.split(/\r?\n/).forEach((line, i) => { if (i) fragment.append(document.createElement('br')); fragment.append(document.createTextNode(line)); });
          const last = fragment.lastChild; range.insertNode(fragment);
          if (last) range.setStartAfter(last);
          range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
          saveLocal(); this.revision++;
        });
      });
    }
  }
  window.deck = new Deck();
})();
