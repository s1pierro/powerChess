// pwa.js — installation PWA, service worker, état de l'application, réinitialisation, plein écran.
// Textes traduits par tr() (i18n.js, chargé avant).
// Expose window.PWA et remplit l'écran d'accueil (#overlay) : état de l'application, puis
//   « Démarrer en plein écran » / « Démarrer dans le navigateur » (ou « Démarrer » une fois installée),
//   « Mettre à jour l'application » quand une nouvelle version attend, « Installer l'application » si proposé,
//   et la réinitialisation (double appui pour confirmer).
// PWA.openPanel() rouvre ce panneau depuis l'application (Réglages › Installation et état).
(function () {
  'use strict';

  const APP = self.APP || { name: 'App', prefix: 'app', version: '' };
  const OK = 'ok', WARN = 'warn', KO = 'ko';
  const PWA = {
    reg: null,            // ServiceWorkerRegistration
    deferred: null,       // événement beforeinstallprompt
    installedEvt: false,
    swError: null,
    _userUpdate: false,
    _started: false,
    _listeners: [],
    rows: [],             // lignes d'état supplémentaires : PWA.addRow(async () => ({ k, v, s }))

    on(fn) { this._listeners.push(fn); },
    _emit() { this._listeners.forEach(f => { try { f(); } catch (e) {} }); },
    addRow(fn) { this.rows.push(fn); this._refresh(); },

    // ---- État ---------------------------------------------------------
    displayMode() {
      const mm = q => window.matchMedia && window.matchMedia(q).matches;
      if (navigator.standalone) return 'standalone';
      if (mm('(display-mode: fullscreen)')) return 'fullscreen';
      if (mm('(display-mode: standalone)')) return 'standalone';
      if (mm('(display-mode: minimal-ui)')) return 'minimal-ui';
      return 'browser';
    },
    isInstalled() { return this.displayMode() !== 'browser'; },
    isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
    canInstall() { return !!this.deferred; },
    updateReady() { return !!(this.reg && this.reg.waiting && navigator.serviceWorker.controller); },
    fullscreenSupported() { return !!(document.fullscreenEnabled && document.documentElement.requestFullscreen); },
    isFullscreen() { return !!document.fullscreenElement; },

    swState() {
      if (!('serviceWorker' in navigator)) return { t: tr(window.isSecureContext ? 'pwa.sw.nonPris' : 'pwa.sw.https'), s: KO };
      if (this.swError) return { t: tr('pwa.sw.erreur'), s: KO };
      if (!this.reg) return { t: tr('pwa.sw.enregistrement'), s: WARN };
      const w = this.reg.active || this.reg.waiting || this.reg.installing;
      if (!w) return { t: tr('pwa.sw.inactif'), s: WARN };
      if (this.reg.installing && !this.reg.active) return { t: tr('pwa.sw.installation'), s: WARN };
      if (w.state === 'activated') return navigator.serviceWorker.controller ? { t: tr('pwa.sw.actif'), s: OK } : { t: tr('pwa.sw.actifProchain'), s: WARN };
      return { t: w.state, s: WARN };
    },

    // Cache hors ligne de cette application (« <prefix>-<version> »), bibliothèques exclues
    async cacheInfo() {
      if (!('caches' in window)) return { name: null, n: 0 };
      try {
        const names = (await caches.keys()).filter(k => k.indexOf(APP.prefix + '-') === 0 && k !== APP.prefix + '-libs');
        if (!names.length) return { name: null, n: 0 };
        const name = names.sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).pop();   // v10 après v9
        const n = (await (await caches.open(name)).keys()).length;
        return { name, n };
      } catch (e) { return { name: null, n: 0 }; }
    },

    localSize() {
      let n = 0;
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (e) {}
      return n;
    },

    async storage() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const e = await navigator.storage.estimate();
          return { usage: e.usage || 0, quota: e.quota || 0 };
        }
      } catch (e) {}
      return null;
    },

    fmt(b) {
      if (b < 1024) return I18N.nombre(b) + ' ' + tr('unite.o');
      if (b < 1048576) return I18N.nombre(b / 1024, 1) + ' ' + tr('unite.ko');
      if (b < 1073741824) return I18N.nombre(b / 1048576, 1) + ' ' + tr('unite.mo');
      return I18N.nombre(b / 1073741824, 1) + ' ' + tr('unite.go');
    },

    // ---- Actions ------------------------------------------------------
    async install() {
      if (!this.deferred) return false;
      const ev = this.deferred;
      this.deferred = null;
      ev.prompt();
      try { await ev.userChoice; } catch (e) {}
      this._emit();
      return true;
    },

    applyUpdate() {
      if (!this.updateReady()) return;
      this._userUpdate = true;
      this.reg.waiting.postMessage('SKIP_WAITING');
    },

    // wipe=false : supprime service worker + caches (données conservées) ; wipe=true : efface aussi les données locales
    async reset(wipe) {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter(k => k.indexOf(APP.prefix + '-') === 0).map(k => caches.delete(k)));
        }
        if (wipe) {
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}   // localStorage : clés de l'appli seulement (storage-ns.js)
        }
      } finally {
        location.reload();
      }
    },

    async enterFullscreen() {
      try { if (!document.fullscreenElement && this.fullscreenSupported()) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); }
      catch (e) { console.warn('Plein écran non autorisé :', e); }
      this._emit();
    },

    async toggleFullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await this.enterFullscreen();
      } catch (e) { console.warn('Plein écran non autorisé :', e); }
      this._emit();
    },

    // ---- Service worker -----------------------------------------------
    register() {
      if (!('serviceWorker' in navigator)) { this._emit(); return; }
      // updateViaCache 'none' : la version est lue dans app.config.js (importé par le service worker) ;
      // sans cette option, le navigateur peut vérifier ce fichier dans son cache HTTP et rater la mise à jour.
      navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' }).then(reg => {
        this.reg = reg;
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          if (w) w.addEventListener('statechange', () => this._emit());
          this._emit();
        });
        const w = reg.installing || reg.waiting || reg.active;
        if (w) w.addEventListener('statechange', () => this._emit());
        reg.update().catch(() => {});
        this._emit();
      }).catch(err => { this.swError = err; console.error('Service Worker :', err); this._emit(); });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this._userUpdate) location.reload(); else this._emit();
      });
    },

    // ---- Écran d'accueil / état --------------------------------------
    _el(tag, cls, text) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    },

    // Ferme l'écran d'accueil (fondu) ; fullscreen=true : passe d'abord en plein écran (geste utilisateur requis)
    start(fullscreen) {
      if (fullscreen) this.enterFullscreen();
      this._started = true;
      const ov = document.getElementById('overlay');
      if (ov) ov.classList.add('fade-out');
      this._emit();
    },

    async render() {
      const ov = document.getElementById('overlay');
      if (!ov) return;
      const info = await this.cacheInfo();
      const stor = await this.storage();
      const sw = this.swState();
      const mode = this.displayMode();

      const panel = this._el('div', 'pw-panel');
      const logo = this._el('img', 'pw-logo');
      logo.src = 'icons/icon-256x256.png';
      logo.alt = '';
      panel.append(logo, this._el('h1', 'pw-title', APP.name));
      panel.appendChild(this._el('p', 'pw-tag', tr('app.slogan')));
      panel.appendChild(this._el('p', 'pw-ver', tr('pwa.version', { v: info.name ? info.name.slice(APP.prefix.length + 1) : (APP.version || '—') })));

      const card = this._el('div', 'pw-card');
      const row = (k, v, s) => {
        const r = this._el('div', 'pw-row');
        r.append(this._el('span', 'pw-dot' + (s ? ' ' + s : '')), this._el('span', 'pw-k', k), this._el('span', 'pw-v', v));
        card.appendChild(r);
      };
      const modeTxt = tr('pwa.mode.' + mode);
      row(tr('pwa.k.application'), modeTxt, mode === 'browser' ? (this.canInstall() ? WARN : null) : OK);
      row(tr('pwa.k.sw'), sw.t, sw.s);
      row(tr('pwa.k.horsLigne'), info.n ? tr('pwa.pret', { n: info.n }) : tr('pwa.indisponible'), info.n ? OK : WARN);
      row(tr('pwa.k.connexion'), tr(navigator.onLine ? 'pwa.enLigne' : 'pwa.horsLigne'), navigator.onLine ? OK : WARN);
      row(tr('pwa.k.donnees'), this.fmt(this.localSize()));
      if (stor && stor.quota) row(tr('pwa.k.stockage'), this.fmt(stor.usage) + ' / ' + this.fmt(stor.quota));
      if (this.fullscreenSupported()) row(tr('pwa.k.pleinEcran'), tr(this.isFullscreen() ? 'pwa.actif' : 'pwa.inactif'), this.isFullscreen() ? OK : null);
      for (const fn of this.rows) { try { const r = await fn(); if (r) row(r.k, r.v, r.s); } catch (e) {} }
      if (this.updateReady()) row(tr('pwa.k.maj'), tr('pwa.disponible'), WARN);
      panel.appendChild(card);

      if (!this.isInstalled() && !this.canInstall()) {
        const hint = this.isIOS()
          ? tr('pwa.aide.ios')
          : tr(window.isSecureContext ? 'pwa.aide.menu' : 'pwa.aide.https');
        panel.appendChild(this._el('p', 'pw-hint', hint));
      }

      const btn = (label, cls, fn, parent) => {
        const b = this._el('button', 'pw-btn' + (cls ? ' ' + cls : ''), label);
        b.type = 'button';
        b.addEventListener('click', fn);
        (parent || panel).appendChild(b);
        return b;
      };
      // Lancement : installée → « Démarrer » ; dans le navigateur → plein écran en secours, ou navigateur seul
      const fsFallback = mode === 'browser' && this.fullscreenSupported() && !this.isFullscreen();
      if (this._started) btn(tr('pwa.fermer'), '', () => this.start(false));
      else if (fsFallback) {
        btn(tr('pwa.demarrerPE'), '', () => this.start(true));
        btn(tr('pwa.demarrerNav'), 'sec', () => this.start(false));
      } else btn(tr('pwa.demarrer'), '', () => this.start(false));
      if (this.updateReady()) btn(tr('pwa.maj'), 'hot', () => this.applyUpdate());
      if (this.canInstall()) btn(tr('pwa.installer'), 'sec', () => this.install());
      if (this._started && mode === 'browser' && this.fullscreenSupported()) {
        btn(tr(this.isFullscreen() ? 'pwa.quitterPE' : 'pwa.passerPE'), 'sec', () => this.toggleFullscreen());
      }

      panel.appendChild(this._el('div', 'pw-sep', tr('pwa.reinit')));
      this._armBtn(btn(tr('pwa.reinitApp'), 'sec', () => {}), tr('pwa.reinitApp'), tr('pwa.reinitConf'), () => this.reset(false));
      this._armBtn(btn(tr('pwa.effacer'), 'danger', () => {}), tr('pwa.effacer'), tr('pwa.effacerConf'), () => this.reset(true));
      panel.appendChild(this._el('p', 'pw-hint', tr('pwa.reinitAide')));

      ov.replaceChildren(panel);
    },

    // Double appui : le 1er arme le bouton (4 s), le 2nd exécute
    _armBtn(b, normal, armedLabel, fn) {
      let t = null;
      const fresh = b.cloneNode(true);
      b.replaceWith(fresh);
      fresh.addEventListener('click', () => {
        if (!fresh.classList.contains('armed')) {
          fresh.classList.add('armed');
          fresh.textContent = armedLabel;
          clearTimeout(t);
          t = setTimeout(() => { fresh.classList.remove('armed'); fresh.textContent = normal; }, 4000);
          return;
        }
        clearTimeout(t);
        fn();
      });
    },

    // Rouvre le panneau (Réglages › Installation et état)
    async openPanel() {
      const ov = document.getElementById('overlay');
      if (!ov) return;
      this.reg && this.reg.update().catch(() => {});
      await this.render();
      ov.classList.remove('fade-out');
    },

    _refresh() {
      const ov = document.getElementById('overlay');
      if (ov && !ov.classList.contains('fade-out')) this.render();
    }
  };

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PWA.deferred = e; PWA._emit(); });
  window.addEventListener('appinstalled', () => { PWA.deferred = null; PWA.installedEvt = true; PWA._emit(); });
  window.addEventListener('online', () => PWA._emit());
  window.addEventListener('offline', () => PWA._emit());
  document.addEventListener('fullscreenchange', () => PWA._emit());
  PWA.on(() => PWA._refresh());

  window.PWA = PWA;
  PWA.render();
  PWA.register();
})();
