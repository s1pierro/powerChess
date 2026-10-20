// ctx-reglages.js — onglet « Réglages » : affichage (plein écran), langue (I18N), application (installation, état, version).

class ReglagesContext extends Context {
  build(el) {
    el.appendChild(mkWaveHeader(uiSvg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>')));
    this.list = document.createElement('div');
    this.list.style.paddingBottom = '1.5em';
    el.appendChild(this.list);
    this.refresh();
    if (window.PWA) PWA.on(() => { if (this.el.classList.contains('ctx-active')) this.refresh(); });
  }

  onShow() { if (this.built) this.refresh(); }

  // coche = true : ligne d'un choix, marquée d'une coche si active (au lieu du chevron)
  _row(icon, label, sub, onTap, coche) {
    const row = document.createElement('div');
    row.className = 'ui-row';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.innerHTML = uiSvg(icon);
    const t = document.createElement('span');
    t.append(label);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
    row.appendChild(t);
    if (coche !== undefined) {
      if (coche) row.insertAdjacentHTML('beforeend', uiSvg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'ui-chev'));
      row.setAttribute('role', 'radio');
      row.setAttribute('aria-checked', String(!!coche));
    } else if (onTap) row.insertAdjacentHTML('beforeend', uiSvg('<path d="M9 5l7 7-7 7"/>', 'ui-chev'));
    if (onTap) {
      row.addEventListener('click', onTap);
      row.addEventListener('keydown', ev => { if (ev.key === 'Enter') onTap(); });
    }
    return row;
  }

  _group(title, rows) {
    const g = document.createDocumentFragment();
    const h = document.createElement('div');
    h.className = 'ui-h';
    h.textContent = title;
    const box = document.createElement('div');
    box.className = 'ui-list';
    rows.filter(Boolean).forEach(r => box.appendChild(r));
    g.append(h, box);
    return g;
  }

  refresh() {
    const groups = [];
    if (window.PWA && PWA.fullscreenSupported()) {
      groups.push(this._group(tr('rg.affichage'), [
        this._row('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', tr('rg.pleinEcran'),
          tr(PWA.isFullscreen() ? 'rg.peActif' : 'rg.peInactif'), () => PWA.toggleFullscreen())
      ]));
    }
    // Langue : automatique (celle de l'appareil) ou imposée ; un choix recharge l'application
    const globe = '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5z"/>';
    const choisir = code => { if (code !== I18N.choix) I18N.choisir(code); };
    const langues = [this._row(globe, tr('rg.auto'), tr('rg.autoSous', { nom: I18N.langues[I18N.appareil].nom }),
      () => choisir(null), I18N.choix === null)];
    for (const code in I18N.langues) {
      langues.push(this._row('<path d="M4 6h9M8.5 4v2c0 4-2 7-4.5 8.5M6.5 10c1 2.2 3 3.8 5.5 4.5M12.5 20l4-9 4 9M14 17h5"/>',
        I18N.langues[code].nom, null, () => choisir(code), I18N.choix === code));
    }
    groups.push(this._group(tr('rg.langue'), langues));
    const mode = window.PWA ? PWA.displayMode() : 'browser';
    groups.push(this._group(tr('rg.application'), [
      this._row('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', tr('rg.installation'),
        tr(mode === 'browser' ? 'rg.navigateur' : 'rg.installee') + (window.PWA && PWA.updateReady() ? tr('rg.majDispo') : '') + tr('rg.reinit'),
        () => { if (window.PWA) PWA.openPanel(); }),
      this._row('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>', tr('app.nomComplet'), tr('rg.version', { v: APP.version }), null)
    ]));
    this.list.replaceChildren(...groups);
  }
}

window.ReglagesContext = ReglagesContext;
