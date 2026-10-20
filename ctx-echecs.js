// ctx-echecs.js — onglet « PowerChess » (identifiant interne « echecs ») : une partie à deux joueurs sur le même téléphone.
// Pièces : plusieurs jeux au choix (EC_JEUX : modèles d'echiquierJS en OBJ, jeu « Facettes » en STL), chargés par
// Modeles.charger() ; thèmes de couleurs du plateau et des pièces (EC_THEMES). Bouton « Apparence » pour choisir.
// Sons : ceux d'echiquierJS (sons/echecs/*.ogg), joués par moteur.sons en réponse aux événements du jeu :
//   echecs:coup (coup joué, mv de chess.js) · echecs:pose (la pièce arrive sur sa case) · echecs:echec ·
//   echecs:fin ({ mat, gagnant }) · echecs:annulation · echecs:nouvelle
// Règles : chess.js (lib/chess.js, licence BSD, la bibliothèque déjà utilisée par echiquierJS).
// Textes : tr('ec.…') (i18n.js).
//
// Rendu « cel-shading » avec three.js : éclairage en 4 paliers (MeshToonMaterial), contour de silhouette par
// coque inversée (Modeles.contour), ombres portées par le soleil sur le plateau et sur les pièces voisines.
// Rendu à la demande (moteur.continu = false) : rien n'est redessiné tant que rien ne bouge.
//
// Contrôle des cases (bouton ⚔) : faisceaux d'énergie sur les cases vides contrôlées, épée sur les pièces
// attaquées, bouclier sur les pièces défendues (voir EchecsControle).
//
// Toucher une pièce du camp au trait, puis une case marquée · Glisser : tourner · Pincer : zoom ·
// Double appui hors du plateau : vue du joueur au trait.

const EC_FICHIERS = 'abcdefgh';
const EC_PIECES = { p: 'pion', r: 'tour', n: 'cavalier', b: 'fou', q: 'dame', k: 'roi' };
// Jeux de pièces : fichiers dans modeles/echecs/ (à lister aussi dans SHELL du service worker) ;
// noms affichés : clés « ec.jeu.<id> » d'i18n.js.
// `echelle` : les modèles font environ 64 unités par case ; une case vaut 1 ici. Base en 0, cavalier tourné vers +z.
const EC_JEUX = {
  echiquierjs: { echelle: 1 / 56,
    fichiers: { p: 'pion.obj', r: 'tour.obj', n: 'cavalier.obj', b: 'fou.obj', q: 'dame.obj', k: 'roi.obj' } },
  facettes: { echelle: 1 / 56,
    fichiers: { p: 'pawn.stl', r: 'rook.stl', n: 'knight.stl', b: 'bishop.stl', q: 'queen.stl', k: 'king.stl' } }
};
// Thèmes : couleurs du plateau, des pièces, du dernier coup, du contour et de l'énergie des cases contrôlées par
// les blancs et par les noirs (la sélection et les prises suivent les couleurs de l'application : --accent-color,
// --hot-color) ; noms affichés : clés « ec.theme.<id> » d'i18n.js
const EC_THEMES = {
  bois:    { claire: '#ecdcb9', foncee: '#a9774f', cadre: '#4d3323', blancs: '#f4f0e6', noirs: '#4b4459', dernier: '#e3c766', contour: '#16121f', energieB: '#ffd75e', energieN: '#9a6bff' },
  tournoi: { claire: '#eeeed2', foncee: '#769656', cadre: '#34452a', blancs: '#fbfaf3', noirs: '#33303a', dernier: '#f3ef6a', contour: '#141712', energieB: '#fff27a', energieN: '#ff6a4d' },
  marbre:  { claire: '#ececef', foncee: '#8e94a2', cadre: '#3a3d47', blancs: '#ffffff', noirs: '#30333c', dernier: '#a3c8e6', contour: '#121318', energieB: '#7fd3ff', energieN: '#ff7fb0' },
  ocean:   { claire: '#d5e8f0', foncee: '#4c7fa6', cadre: '#1d3850', blancs: '#f6f3e9', noirs: '#e0703f', dernier: '#f2c66d', contour: '#0d1a26', energieB: '#ffe28a', energieN: '#ff7a3d' },
  corail:  { claire: '#fbe4d3', foncee: '#e0896c', cadre: '#7a3a2f', blancs: '#fff9ef', noirs: '#4a2f47', dernier: '#ffd36b', contour: '#1f1218', energieB: '#ffe066', energieN: '#a05cff' },
  nuit:    { claire: '#5c5a7c', foncee: '#2b2940', cadre: '#13121c', blancs: '#e9e5ff', noirs: '#e0527a', dernier: '#7c6cf0', contour: '#07060c', energieB: '#bfe7ff', energieN: '#ff4f8b' },
  retro:   { claire: '#9bbc0f', foncee: '#5a8a1c', cadre: '#0f380f', blancs: '#e0f8d0', noirs: '#1e4d1e', dernier: '#c8d870', contour: '#0f380f', energieB: '#e0f8d0', energieN: '#0f380f' }
};
const EC_CONTOUR = 1.4;             // épaisseur du contour, en unités des modèles (≈ 0,025 case)
const ec_borner = (v, min, max) => v < min ? min : v > max ? max : v;

// ----- Contrôle des cases --------------------------------------------------------------------------------
// Pour chaque case : nombre de pièces blanches (w) et noires (b) qui la contrôlent, c'est-à-dire qui pourraient
// y prendre (pièces clouées comprises). Une pièce à longue portée s'arrête à la première pièce rencontrée,
// et contrôle la case de celle-ci (prise d'une pièce adverse, ou défense d'une pièce alliée).
function ec_controle(jeu) {
  const res = {}, nom = (f, r) => EC_FICHIERS[f] + (r + 1), dans = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], DROIT = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SAUTS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  for (const c of jeu.SQUARES) res[c] = { w: 0, b: 0 };
  for (const c of jeu.SQUARES) {
    const p = jeu.get(c);
    if (!p) continue;
    const f = EC_FICHIERS.indexOf(c[0]), r = +c[1] - 1;
    const pas = dirs => { for (const [df, dr] of dirs) if (dans(f + df, r + dr)) res[nom(f + df, r + dr)][p.color]++; };
    const portee = dirs => {
      for (const [df, dr] of dirs) {
        for (let ff = f + df, rr = r + dr; dans(ff, rr); ff += df, rr += dr) {
          res[nom(ff, rr)][p.color]++;
          if (jeu.get(nom(ff, rr))) break;
        }
      }
    };
    if (p.type === 'p') pas(p.color === 'w' ? [[-1, 1], [1, 1]] : [[-1, -1], [1, -1]]);
    else if (p.type === 'n') pas(SAUTS);
    else if (p.type === 'k') pas([...DIAG, ...DROIT]);
    else if (p.type === 'b') portee(DIAG);
    else if (p.type === 'r') portee(DROIT);
    else portee([...DIAG, ...DROIT]);
  }
  return res;
}

// Boîte ajoutée à un maillage (faces tournées vers l'extérieur, même ordre que Maillage.cube)
function ec_boite(mm, x0, x1, y0, y1, z0, z1, m) {
  const b = mm.sommets.length;
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) mm.sommets.push([x, y, z]);
  for (const q of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]) mm.faces.push({ s: q.map(i => b + i), m });
}

// Épée plantée dans la case (unités : la case), lame en losange ; matériaux « acier », « cuir », « camp »
function ec_epee() {
  const mm = new Maillage(), b = 0;
  for (const [y, w, t] of [[-0.04, 0.026, 0.008], [0.5, 0.046, 0.013]]) mm.sommets.push([w, y, 0], [0, y, -t], [-w, y, 0], [0, y, t]);
  for (let k = 0; k < 4; k++) mm.faces.push({ s: [b + k, b + (k + 1) % 4, b + 4 + (k + 1) % 4, b + 4 + k], m: 'acier' });
  mm.faces.push({ s: [3, 2, 1, 0], m: 'acier' }, { s: [4, 5, 6, 7], m: 'acier' });
  ec_boite(mm, -0.15, 0.15, 0.5, 0.545, -0.03, 0.03, 'camp');      // garde
  ec_boite(mm, -0.02, 0.02, 0.545, 0.68, -0.02, 0.02, 'cuir');     // poignée
  const c = 0.715, r = 0.038, o = mm.sommets.length;               // pommeau (octaèdre)
  mm.sommets.push([r, c, 0], [-r, c, 0], [0, c + r, 0], [0, c - r, 0], [0, c, r], [0, c, -r]);
  for (const [i, j, k] of [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]]) mm.faces.push({ s: [o + i, o + j, o + k], m: 'camp' });
  return mm;
}

// Écu bombé, posé sur sa pointe (unités : la case) ; face avant « camp », bords et dos « acier »
function ec_bouclier() {
  const mm = new Maillage(), contour = [[0, 0], [0.15, 0.11], [0.17, 0.33], [0, 0.38], [-0.17, 0.33], [-0.15, 0.11]], n = contour.length;
  for (const [x, y] of contour) mm.sommets.push([x, y + 0.03, 0.022]);
  for (const [x, y] of contour) mm.sommets.push([x, y + 0.03, -0.022]);
  mm.sommets.push([0, 0.24, 0.06]);                                // bosse au centre de la face avant
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    mm.faces.push({ s: [2 * n, k, k2], m: 'camp' });
    mm.faces.push({ s: [k, n + k, n + k2, k2], m: 'acier' });
  }
  mm.faces.push({ s: contour.map((_, k) => 2 * n - 1 - k), m: 'acier' });
  return mm;
}

// Effets visuels du contrôle des cases : faisceaux d'énergie sur les cases vides contrôlées (couleur du camp,
// hauteur selon le nombre de pièces ; deux faces par camp si la case est disputée), épée sur une pièce
// attaquée (poignée aux couleurs de l'attaquant, taille selon le nombre d'attaquants), bouclier sur une
// pièce défendue (taille selon le nombre de défenseurs). Épées et boucliers font face à la caméra.
class EchecsControle {
  constructor(ec) {
    this.ec = ec;
    this.cle = null;                  // position affichée (FEN)
    const scene = ec.m.scene, paliers = Modeles.paliers(4);
    // Faisceau : un trapèze par côté de la case, évasé vers le haut ; transparence en paliers (alphaMap)
    const a = 0.42, b = 0.47, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-a, 0, a, a, 0, a, b, 1, b, -b, 1, b], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const alpha = new THREE.DataTexture(new Uint8Array([235, 235, 235, 255, 150, 150, 150, 255, 80, 80, 80, 255, 20, 20, 20, 255]), 1, 4, THREE.RGBAFormat);
    alpha.minFilter = alpha.magFilter = THREE.NearestFilter;
    alpha.needsUpdate = true;
    const energie = () => new THREE.MeshBasicMaterial({ alphaMap: alpha, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.matEnergie = { w: energie(), b: energie() };
    this.mat = { acier: new THREE.MeshToonMaterial({ color: '#c8ccd8', gradientMap: paliers }), cuir: new THREE.MeshToonMaterial({ color: '#6b4a2f', gradientMap: paliers }) };
    const arme = mm => { const geo = mm.geometrie(); return { geo, contour: Modeles.contour(geo, 0.007) }; };
    this.formes = { epee: arme(ec_epee()), bouclier: arme(ec_bouclier()) };

    this.cases = {};
    for (const c in ec.cases) {
      const p = ec._pos(c), faisceau = new THREE.Group(), armes = new THREE.Group();
      faisceau.position.set(p.x, 0.002, p.z);
      armes.position.set(p.x, 0, p.z);
      faisceau.userData.selectionnable = armes.userData.selectionnable = false;
      const faces = [0, 1, 2, 3].map(k => {
        const f = new THREE.Mesh(g, this.matEnergie.w);
        f.rotation.y = k * Math.PI / 2;
        f.renderOrder = 1;
        faisceau.add(f);
        return f;
      });
      const epee = this._arme('epee', -0.3, 0.3);
      const bouclier = this._arme('bouclier', 0.3, 0.3);
      armes.add(epee, bouclier);
      faisceau.visible = armes.visible = false;
      scene.add(faisceau, armes);
      this.cases[c] = { faisceau, faces, armes, epee, bouclier };
    }
    this.couleurs();
  }

  _arme(forme, x, z) {
    const f = this.formes[forme], o = new THREE.Mesh(f.geo);
    o.position.set(x, 0, z);
    o.castShadow = true;
    const bord = new THREE.Mesh(f.contour, this.ec.matContour);
    o.add(bord);
    o.userData.forme = forme;
    return o;
  }

  // Matériaux d'une arme : « camp » aux couleurs des pièces de `couleur`
  _materiaux(o, couleur) {
    const camp = couleur === 'w' ? this.ec.mat.blancs : this.ec.mat.noirs;
    o.material = o.geometry.userData.materiaux.map(n => n === 'camp' ? camp : this.mat[n]);
  }

  couleurs() {
    const t = EC_THEMES[this.ec.state.theme];
    this.matEnergie.w.color.set(t.energieB);
    this.matEnergie.b.color.set(t.energieN);
  }

  // Recalcule l'état des cases si la position a changé ; rien n'est affiché pendant une animation
  mettreAJour() {
    const ec = this.ec, voir = ec.state.controle && !ec.occupe;
    if (!voir) {
      if (this.cle !== null) { for (const c in this.cases) this.cases[c].faisceau.visible = this.cases[c].armes.visible = false; this.cle = null; }
      this._pulsation(false);
      return;
    }
    const cle = ec.jeu.fen();
    if (cle === this.cle) return;
    this.cle = cle;
    const etat = ec_controle(ec.jeu), taille = n => Math.min(1.5, 0.75 + 0.25 * (n - 1));
    const hauteur = n => Math.min(0.85, 0.2 + 0.13 * (n - 1));
    let energie = false;
    for (const c in this.cases) {
      const v = this.cases[c], e = etat[c], p = ec.jeu.get(c);
      v.faisceau.visible = !p && (e.w + e.b > 0);
      if (v.faisceau.visible) {
        energie = true;
        // Faces 0 et 2 (côtés nord et sud) : blancs si présents ; faces 1 et 3 : noirs si présents
        v.faces.forEach((f, k) => {
          const camp = e.w && e.b ? (k % 2 ? 'b' : 'w') : (e.w ? 'w' : 'b');
          f.material = this.matEnergie[camp];
          f.scale.y = hauteur(e[camp]);
        });
      }
      const attaque = p ? e[p.color === 'w' ? 'b' : 'w'] : 0, defense = p ? e[p.color] : 0;
      v.armes.visible = !!(attaque || defense);
      v.epee.visible = !!attaque;
      v.bouclier.visible = !!defense;
      if (attaque) { this._materiaux(v.epee, p.color === 'w' ? 'b' : 'w'); v.epee.scale.setScalar(taille(attaque)); }
      if (defense) { this._materiaux(v.bouclier, p.color); v.bouclier.scale.setScalar(taille(defense)); }
    }
    this._pulsation(energie);
    ec.m.redessiner();
  }

  // Les épées et les boucliers se tournent vers la caméra (appelé à chaque image)
  orienter(lacet) {
    for (const c in this.cases) { const a = this.cases[c].armes; if (a.visible) a.rotation.y = lacet; }
  }

  // Pulsation lente de l'énergie : un comportement du moteur, actif seulement quand des faisceaux sont visibles
  _pulsation(oui) {
    if (oui && !this._puls) {
      let t = 0;
      this._puls = this.ec.m.animations.comportement(dt => {
        t += dt;
        const o = 0.78 + 0.22 * Math.sin(t * 2.6);
        this.matEnergie.w.opacity = this.matEnergie.b.opacity = o;
        return true;
      });
    } else if (!oui && this._puls) {
      this._puls.arreter();
      this._puls = null;
    }
  }
}

class EchecsContext extends Context {
  defaultState() { return { pgn: '', suivre: true, lacet: 0, hauteur: 0.9, zoom: 1, jeu: 'echiquierjs', theme: 'nuit', son: true, controle: true }; }

  build(el) {
    this._style();
    this.jeu = new Chess();
    if (this.state.pgn) { try { this.jeu.load_pgn(this.state.pgn); } catch (e) { this.jeu.reset(); } }
    this.cases = {};         // 'e4' → case du plateau
    this.pieces = {};        // 'e4' → pièce
    this.marqueurs = [];
    this.choix = null;       // case de la pièce sélectionnée
    this.coups = {};         // case d'arrivée → coups possibles depuis this.choix
    this.occupe = true;      // chargement ou animation : les touchers sont ignorés
    this.jeux = {};          // id de jeu → promesse de ses modèles (chargés une seule fois)
    if (!EC_JEUX[this.state.jeu]) this.state.jeu = 'echiquierjs';
    if (!EC_THEMES[this.state.theme]) this.state.theme = 'nuit';

    this._interface(el);
    let m;
    try {
      m = this.m = new Moteur(this.vue, { continu: false, champ: 45, ombres: { taille: 6.5 } });
    } catch (e) {
      this._statut(tr('ec.webgl'), true);
      return;
    }
    m.placerSoleil([-0.5, 1, 0.7]);
    m.soleil.intensity = 2.4;
    m.ciel.intensity = 1.2;
    this._materiaux();
    this._plateau(m);
    this.controle = new EchecsControle(this);
    this._camera(m);
    this._gestes(m);
    this._sons(m);
    m.evenements.ecouter('echecs:coup', mv => { this.dernierCoup = mv.san; });

    this._statut(tr('ec.chargement'));
    this._charger(this.state.jeu).then(md => {
      this.modeles = md;
      this.echelle = EC_JEUX[this.state.jeu].echelle;
      this._placerPieces();
      this.occupe = false;
      this._marquer();
      this._statut();
    }).catch(err => this._statut(tr('ec.introuvables', { err: err && err.message || err }), true));
  }

  onShow() {
    if (!this.m) return;
    this._couleurs();                 // le thème (clair / sombre) a pu changer
    this.m.redimensionner();
    this.m.demarrer();
  }

  onHide() {
    if (this.m) this.m.arreter();
  }

  // ----- Interface HTML -----------------------------------------------------------------------------
  _interface(el) {
    this.vue = document.createElement('div');
    this.vue.className = 'ec-vue';
    const hud = document.createElement('div');
    hud.className = 'ec-hud';
    this.etat = document.createElement('span');
    this.etat.className = 'ec-etat';
    hud.append(this.etat);   // le titre est porté par le menu de navigation

    const barre = document.createElement('div');
    barre.className = 'ec-barre';
    const bouton = (texte, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ec-btn';
      b.textContent = texte;
      b.addEventListener('click', fn);
      barre.appendChild(b);
      return b;
    };
    bouton(tr('ec.annuler'), () => this._annuler());
    this.btnSuivre = bouton('', () => {
      this.state.suivre = !this.state.suivre;
      this.save();
      this._afficherSuivre();
      if (this.state.suivre) this._orienter();
    });
    this.btnNouvelle = bouton(tr('ec.nouvelle'), () => this._nouvellePartie());
    bouton(tr('ec.apparence'), () => this._ouvrirApparence());
    this.btnControle = bouton('⚔', () => {
      this.state.controle = !this.state.controle;
      this.save();
      this._afficherControle();
      if (this.controle) this.controle.mettreAJour();
    });
    this.btnControle.setAttribute('aria-label', tr('ec.controle'));
    this.btnSon = bouton('', () => {
      this.state.son = !this.state.son;
      this.save();
      this._afficherSon();
      if (this.m) {
        this.m.sons.actif = this.state.son;
        this.m.sons.jouer('coup');
      }
    });
    this.btnSon.setAttribute('aria-label', tr('ec.sons'));
    this._afficherSuivre();
    this._afficherSon();
    this._afficherControle();

    // Choix de la pièce de promotion
    this.promo = document.createElement('div');
    this.promo.className = 'ec-promo';
    this.promo.hidden = true;
    const carte = document.createElement('div');
    carte.className = 'ec-carte';
    const q = document.createElement('b');
    q.textContent = tr('ec.promotion');
    const choix = document.createElement('div');
    choix.className = 'ec-choix';
    for (const [code, glyphe] of [['q', '♛'], ['r', '♜'], ['b', '♝'], ['n', '♞']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span>${glyphe}</span>`;
      b.append(tr('ec.' + code));
      b.addEventListener('click', () => this._promouvoir(code));
      choix.appendChild(b);
    }
    const non = document.createElement('button');
    non.type = 'button';
    non.className = 'ec-non';
    non.textContent = tr('ec.annulerPromo');
    non.addEventListener('click', () => { this.promo.hidden = true; this._promotion = null; });
    carte.append(q, choix, non);
    this.promo.appendChild(carte);

    el.append(this.vue, hud, barre, this.promo, this._panneauApparence());
  }

  // Choix du jeu de pièces et du thème de couleurs, appliqués aussitôt
  _panneauApparence() {
    const fond = this.apparence = document.createElement('div');
    fond.className = 'ec-promo';
    fond.hidden = true;
    fond.addEventListener('click', e => { if (e.target === fond) fond.hidden = true; });
    const carte = document.createElement('div');
    carte.className = 'ec-carte';
    const titre = texte => { const b = document.createElement('b'); b.className = 'ec-rubrique'; b.textContent = texte; return b; };

    const jeux = document.createElement('div');
    jeux.className = 'ec-jeux';
    this.btnJeux = {};
    for (const id in EC_JEUX) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tr('ec.jeu.' + id);
      b.addEventListener('click', () => this._changerJeu(id));
      jeux.appendChild(b);
      this.btnJeux[id] = b;
    }

    const themes = document.createElement('div');
    themes.className = 'ec-themes';
    this.btnThemes = {};
    for (const id in EC_THEMES) {
      const t = EC_THEMES[id], b = document.createElement('button');
      b.type = 'button';
      // Aperçu : quatre cases du plateau et une pièce de chaque camp
      b.innerHTML = `<i style="--c1:${t.claire};--c2:${t.foncee};--bord:${t.cadre}">`
        + `<em style="background:${t.blancs}"></em><em style="background:${t.noirs}"></em></i>`;
      b.append(tr('ec.theme.' + id));
      b.addEventListener('click', () => this._changerTheme(id));
      themes.appendChild(b);
      this.btnThemes[id] = b;
    }

    const fermer = document.createElement('button');
    fermer.type = 'button';
    fermer.className = 'ec-non';
    fermer.textContent = tr('ec.fermer');
    fermer.addEventListener('click', () => { fond.hidden = true; });
    carte.append(titre(tr('ec.jeuPieces')), jeux, titre(tr('ec.couleurs')), themes, fermer);
    fond.appendChild(carte);
    this._afficherApparence();
    return fond;
  }

  _afficherApparence() {
    for (const id in this.btnJeux) this.btnJeux[id].classList.toggle('on', id === this.state.jeu);
    for (const id in this.btnThemes) this.btnThemes[id].classList.toggle('on', id === this.state.theme);
  }

  _ouvrirApparence() {
    if (!this.promo.hidden) return;
    if (this.choix) this._selectionner(null);
    this.apparence.hidden = false;
  }

  _changerTheme(id) {
    this.state.theme = id;
    this.save();
    this._afficherApparence();
    if (this.mat) this._couleurs();
  }

  // Les modèles du nouveau jeu remplacent ceux des pièces en place (le dernier choix l'emporte)
  _changerJeu(id) {
    if (!this.m) return;
    this.state.jeu = id;
    this.save();
    this._afficherApparence();
    this._charger(id).then(md => {
      if (this.state.jeu !== id) return;
      this.modeles = md;
      this.echelle = EC_JEUX[id].echelle;
      for (const o of Object.values(this.pieces)) {
        this.m.animations.arreter(o.scale);
        this._habiller(o, o.userData.couleur, o.userData.type);
        o.scale.setScalar(this.echelle);
      }
      this.m.redessiner();
    }).catch(err => this._statut(tr('ec.introuvables', { err: err && err.message || err }), true));
  }

  _afficherControle() {
    this.btnControle.classList.toggle('on', this.state.controle);
  }

  _afficherSon() {
    this.btnSon.textContent = this.state.son ? '🔊' : '🔇';
    this.btnSon.classList.toggle('on', this.state.son);
  }

  // Sons d'echiquierJS, déclenchés par les événements du jeu
  _sons(m) {
    const s = m.sons, ev = m.evenements, f = {};
    for (const n of ['depart', 'coup', 'prise', 'echec', 'roque', 'en-passant', 'victoire', 'nulle']) f[n] = 'sons/echecs/' + n + '.ogg';
    s.actif = this.state.son;
    s.charger(f);
    ev.ecouter('echecs:pose', mv => {
      const fl = mv.flags;
      s.jouer(fl.indexOf('e') >= 0 ? 'en-passant' : fl.indexOf('k') >= 0 || fl.indexOf('q') >= 0 ? 'roque'
        : mv.captured ? 'prise' : 'coup');
    });
    ev.ecouter('echecs:echec', () => s.jouer('echec', { delai: 0.12 }));
    ev.ecouter('echecs:fin', d => s.jouer(d.mat ? 'victoire' : 'nulle', { delai: 0.2 }));
    ev.ecouter('echecs:annulation', () => s.jouer('coup', { vitesse: 0.8, volume: 0.7 }));
    ev.ecouter('echecs:nouvelle', () => s.jouer('depart'));
  }

  _afficherSuivre() {
    this.btnSuivre.textContent = tr(this.state.suivre ? 'ec.vueTrait' : 'ec.vueLibre');
    this.btnSuivre.classList.toggle('on', this.state.suivre);
  }

  _statut(texte, alerte) {
    const j = this.jeu;
    if (!texte) {
      const camp = j.turn(), autre = camp === 'w' ? 'b' : 'w';
      const n = Math.floor(j.history().length / 2) + 1;
      alerte = j.in_check();
      if (j.in_checkmate()) texte = tr('ec.mat.' + autre);
      else if (j.in_stalemate()) texte = tr('ec.pat');
      else if (j.in_threefold_repetition()) texte = tr('ec.repetition');
      else if (j.insufficient_material()) texte = tr('ec.materiel');
      else if (j.in_draw()) texte = tr('ec.cinquante');
      else texte = tr((alerte ? 'ec.traitEchec.' : 'ec.trait.') + camp, { n });
    }
    this.etat.textContent = texte;
    this.etat.classList.toggle('alerte', !!alerte);
  }

  // ----- Scène --------------------------------------------------------------------------------------
  // Matériaux « dessin animé » : 4 paliers d'éclairage, partagés par toutes les cases et toutes les pièces
  _materiaux() {
    const paliers = Modeles.paliers(4), toon = (couleur = '#ffffff') => new THREE.MeshToonMaterial({ color: couleur, gradientMap: paliers });
    this.mat = {
      'case-claire': toon(), 'case-foncee': toon(), cadre: toon(), blancs: toon(), noirs: toon(),
      HARDblack: toon('#1d1a24'),                         // fente de la mitre du fou
      selection: toon(), cible: toon(), prise: toon(), echec: toon(), dernier: toon()
    };
    this.matContour = Modeles.materiauContour('#16121f');
    this._couleurs();
  }

  // Couleurs du thème choisi, et couleurs d'identité lues dans le thème de l'application (variables CSS)
  _couleurs() {
    const m = this.m, mat = this.mat, t = EC_THEMES[this.state.theme];
    mat['case-claire'].color.set(t.claire);
    mat['case-foncee'].color.set(t.foncee);
    mat.cadre.color.set(t.cadre);
    mat.blancs.color.set(t.blancs);
    mat.noirs.color.set(t.noirs);
    mat.dernier.color.set(t.dernier);
    this.matContour.color.set(t.contour);
    if (this.controle) this.controle.couleurs();
    mat.selection.color.copy(m.couleur('--accent-color'));
    mat.cible.color.copy(m.couleur('--accent-color'));
    mat.prise.color.copy(m.couleur('--hot-color'));
    mat.echec.color.copy(m.couleur('--hot-color'));
    m.redessiner();
  }

  _pos(c) {
    return { x: EC_FICHIERS.indexOf(c[0]) - 3.5, z: 3.5 - (+c[1] - 1) };
  }

  _plateau(m) {
    const cadre = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.35, 9.1), this.mat.cadre);
    cadre.position.y = -0.176;                            // juste sous les cases
    cadre.receiveShadow = true;
    cadre.userData.selectionnable = false;
    m.scene.add(cadre);
    const carre = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const c = EC_FICHIERS[f] + (r + 1), base = (f + r) % 2 ? 'case-claire' : 'case-foncee';
        const o = new THREE.Mesh(carre, this.mat[base]);
        const p = this._pos(c);
        o.position.set(p.x, 0, p.z);
        o.receiveShadow = true;
        o.userData = { case: c, base };
        m.scene.add(o);
        this.cases[c] = o;
      }
    }
  }

  // Modèles d'un jeu : une géométrie par type de pièce (partagée par les deux camps) et la coque de son contour
  _charger(id) {
    if (this.jeux[id]) return this.jeux[id];
    const codes = Object.keys(EC_PIECES), f = EC_JEUX[id].fichiers;
    const promesse = Promise.all(codes.map(k => Modeles.charger('modeles/echecs/' + f[k]))).then(liste => {
      const md = {};
      codes.forEach((k, i) => { md[k] = { geo: liste[i], contour: Modeles.contour(liste[i], EC_CONTOUR) }; });
      return md;
    });
    promesse.catch(() => { delete this.jeux[id]; });      // nouvel essai au prochain choix
    return (this.jeux[id] = promesse);
  }

  // Donne à une pièce la forme et les couleurs de `type` (création, promotion)
  _habiller(o, couleur, type) {
    const md = this.modeles[type], camp = couleur === 'w' ? this.mat.blancs : this.mat.noirs;
    o.geometry = md.geo;
    o.material = md.geo.userData.materiaux.map(n => n === 'HARDblack' ? this.mat.HARDblack : camp);
    o.children[0].geometry = md.contour;
    o.userData.couleur = couleur;
    o.userData.type = type;
  }

  _nouvellePiece(c, p) {
    const o = new THREE.Mesh();
    o.name = (p.color === 'w' ? 'blanc ' : 'noir ') + EC_PIECES[p.type];
    o.castShadow = o.receiveShadow = true;
    const bord = new THREE.Mesh(undefined, this.matContour);
    bord.userData.selectionnable = false;
    o.add(bord);
    o.userData = { case: c };
    this._habiller(o, p.color, p.type);
    const q = this._pos(c);
    o.position.set(q.x, 0, q.z);
    o.rotation.y = p.color === 'w' ? Math.PI : 0;        // les cavaliers se font face
    o.scale.setScalar(this.echelle);
    this.m.scene.add(o);
    this.pieces[c] = o;
    return o;
  }

  // Replace toutes les pièces d'après la position du jeu (démarrage, annulation, nouvelle partie)
  _placerPieces() {
    for (const o of Object.values(this.pieces)) this.m.scene.remove(o);
    this.pieces = {};
    for (const c of this.jeu.SQUARES) {
      const p = this.jeu.get(c);
      if (p) this._nouvellePiece(c, p);
    }
    this.m.redessiner();
  }

  // Cases colorées (dernier coup, échec, sélection, prises) et pastilles des coups possibles
  _marquer() {
    const teinter = (c, nom) => { this.cases[c].material = this.mat[nom]; };
    for (const c in this.cases) teinter(c, this.cases[c].userData.base);
    const h = this.jeu.history({ verbose: true }), der = h[h.length - 1];
    if (der) { teinter(der.from, 'dernier'); teinter(der.to, 'dernier'); }
    if (this.jeu.in_check()) {
      const roi = this.jeu.SQUARES.find(c => { const p = this.jeu.get(c); return p && p.type === 'k' && p.color === this.jeu.turn(); });
      if (roi) teinter(roi, 'echec');
    }
    if (this.choix) teinter(this.choix, 'selection');

    let k = 0;
    for (const c in this.coups) {
      if (this.jeu.get(c)) { teinter(c, 'prise'); continue; }
      let mq = this.marqueurs[k];
      if (!mq) {
        this._geoMarqueur = this._geoMarqueur || new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16);
        mq = new THREE.Mesh(this._geoMarqueur, this.mat.cible);
        mq.castShadow = true;
        this.m.scene.add(mq);
        this.marqueurs[k] = mq;
      }
      const p = this._pos(c);
      mq.position.set(p.x, 0.015, p.z);
      mq.userData.case = c;
      mq.visible = true;
      k++;
    }
    for (; k < this.marqueurs.length; k++) this.marqueurs[k].visible = false;
    if (this.controle) this.controle.mettreAJour();
    this.m.redessiner();
  }

  // ----- Partie -------------------------------------------------------------------------------------
  _toucher(d) {
    if (this.occupe || !this.promo.hidden || !this.apparence.hidden) return;
    const o = this.m.objetSous(d.clientX, d.clientY);
    const c = o && o.userData.case;
    if (c && this.choix && this.coups[c]) { this._jouer(this.choix, c); return; }
    const p = c && this.jeu.get(c);
    if (p && p.color === this.jeu.turn() && !this.jeu.game_over() && c !== this.choix) this._selectionner(c);
    else this._selectionner(null);
  }

  _selectionner(c) {
    const anim = this.m.animations;
    const avant = this.choix && this.pieces[this.choix];
    if (avant) { anim.arreter(avant.position); anim.vers(avant.position, { y: 0 }, 0.15); }
    this.choix = c;
    this.coups = {};
    if (c) {
      for (const mv of this.jeu.moves({ square: c, verbose: true })) (this.coups[mv.to] = this.coups[mv.to] || []).push(mv);
      const p = this.pieces[c];
      if (p) { anim.arreter(p.position); anim.vers(p.position, { y: 0.25 }, 0.2, { assouplir: 'sortie' }); }
    }
    this._marquer();
  }

  _jouer(de, vers) {
    if (this.coups[vers][0].flags.indexOf('p') >= 0) {
      this._promotion = { from: de, to: vers };
      this.promo.hidden = false;
      return;
    }
    this._executer({ from: de, to: vers });
  }

  _promouvoir(code) {
    this.promo.hidden = true;
    if (this._promotion) this._executer({ ...this._promotion, promotion: code });
    this._promotion = null;
  }

  _executer(coup) {
    const mv = this.jeu.move(coup);
    if (!mv) return;
    this.choix = null;
    this.coups = {};
    this.occupe = true;
    this._sauver();
    this._marquer();
    this.m.evenements.emettre('echecs:coup', mv);
    this._animer(mv).then(() => {
      const j = this.jeu;
      if (j.game_over()) this.m.evenements.emettre('echecs:fin', { mat: j.in_checkmate(), gagnant: j.in_checkmate() ? mv.color : null });
      else if (j.in_check()) this.m.evenements.emettre('echecs:echec', { camp: j.turn() });
      this._verifier();
      this.occupe = false;
      this._marquer();
      this._statut();
      if (this.state.suivre && !this.jeu.game_over()) this._orienter();
    });
  }

  // Animation d'un coup : glissé (saut pour le cavalier), prise qui disparaît, roque, promotion
  _animer(mv) {
    const anim = this.m.animations, scene = this.m.scene, attentes = [];
    const piece = this.pieces[mv.from];
    if (!piece) return Promise.resolve();
    const duree = 0.45;

    const prise = mv.flags.indexOf('e') >= 0 ? mv.to[0] + mv.from[1] : (mv.captured ? mv.to : null);
    if (prise && this.pieces[prise]) {
      const v = this.pieces[prise];
      delete this.pieces[prise];
      attentes.push(anim.vers(v.scale, { x: 0, y: 0, z: 0 }, 0.3, { assouplir: 'entree', delai: duree * 0.6 }).fini
        .then(() => scene.remove(v)));
    }

    delete this.pieces[mv.from];
    this.pieces[mv.to] = piece;
    piece.userData.case = mv.to;
    const p = this._pos(mv.to);
    anim.arreter(piece.position);
    attentes.push(anim.vers(piece.position, { x: p.x, z: p.z }, duree).fini
      .then(() => this.m.evenements.emettre('echecs:pose', mv)));
    if (mv.piece === 'n') {
      attentes.push(anim.vers(piece.position, { y: 0.9 }, duree / 2, { assouplir: 'sortie' }).fini
        .then(() => anim.vers(piece.position, { y: 0 }, duree / 2, { assouplir: 'entree' }).fini));
    } else attentes.push(anim.vers(piece.position, { y: 0 }, duree).fini);

    if (mv.flags.indexOf('k') >= 0 || mv.flags.indexOf('q') >= 0) {
      const rang = mv.from[1];
      const [de, vers] = mv.flags.indexOf('k') >= 0 ? ['h' + rang, 'f' + rang] : ['a' + rang, 'd' + rang];
      const tour = this.pieces[de];
      if (tour) {
        delete this.pieces[de];
        this.pieces[vers] = tour;
        tour.userData.case = vers;
        const q = this._pos(vers);
        attentes.push(anim.vers(tour.position, { x: q.x, z: q.z }, duree, { delai: 0.15 }).fini);
      }
    }

    return Promise.all(attentes).then(() => {
      if (!mv.promotion) return;
      this._habiller(piece, mv.color, mv.promotion);
      const e = this.echelle;
      piece.scale.setScalar(e * 0.4);
      return anim.vers(piece.scale, { x: e, y: e, z: e }, 0.5, { assouplir: 'retour' }).fini;
    });
  }

  // Filet de sécurité : si les pièces affichées ne correspondent plus à la position, on les replace
  _verifier() {
    const ok = this.jeu.SQUARES.every(c => !!this.jeu.get(c) === !!this.pieces[c]);
    if (!ok) this._placerPieces();
  }

  _annuler() {
    if (this.occupe || !this.jeu.undo()) return;
    this.m.evenements.emettre('echecs:annulation', {});
    this.choix = null;
    this.coups = {};
    this._sauver();
    this._placerPieces();
    this._marquer();
    this._statut();
    if (this.state.suivre) this._orienter();
  }

  // Deux appuis : le premier demande confirmation (trois secondes)
  _nouvellePartie() {
    if (this.occupe) return;
    if (!this._confirmer) {
      this._confirmer = true;
      this.btnNouvelle.textContent = tr('ec.confirmer');
      this.btnNouvelle.classList.add('alerte');
      clearTimeout(this._tConfirmer);
      this._tConfirmer = setTimeout(() => this._finConfirmer(), 3000);
      return;
    }
    this._finConfirmer();
    this.jeu.reset();
    this.m.evenements.emettre('echecs:nouvelle', {});
    this.choix = null;
    this.coups = {};
    this._sauver();
    this._placerPieces();
    this._marquer();
    this._statut();
    this._orienter();
  }

  _finConfirmer() {
    this._confirmer = false;
    clearTimeout(this._tConfirmer);
    this.btnNouvelle.textContent = tr('ec.nouvelle');
    this.btnNouvelle.classList.remove('alerte');
  }

  _sauver() {
    this.state.pgn = this.jeu.pgn();
    this.save();
  }

  // ----- Caméra et gestes ---------------------------------------------------------------------------
  _camera(m) {
    this.cam = { lacet: this.state.lacet, hauteur: this.state.hauteur, zoom: this.state.zoom };
    this.inertie = 0;
    m.evenements.ecouter('moteur:image', () => {
      const asp = m.largeur && m.hauteur ? m.largeur / m.hauteur : 0.6;
      const base = 5 / (Math.tan(m.camera.fov * Math.PI / 360) * Math.min(1, asp));   // le plateau tient en largeur
      m.orbiter({ x: 0, y: 0, z: 0 }, base * this.cam.zoom, this.cam.lacet, this.cam.hauteur);
      if (this.controle) this.controle.orienter(this.cam.lacet);
    });
  }

  // Fait pivoter la vue du côté du joueur au trait (par le chemin le plus court)
  _orienter() {
    const cible = this.jeu.turn() === 'w' ? 0 : Math.PI, tour = 2 * Math.PI;
    const lacet = cible + tour * Math.round((this.cam.lacet - cible) / tour);
    this.m.animations.arreter(this.cam);
    this.m.animations.vers(this.cam, { lacet, hauteur: 0.9 }, 0.9, {
      assouplir: 'cubique',
      fin: () => { this.cam.lacet = ((this.cam.lacet % tour) + tour) % tour; this._memoriser(); }   // même vue, angle borné
    });
  }

  _memoriser() {
    Object.assign(this.state, this.cam);
    this.save();
  }

  _gestes(m) {
    const ev = m.evenements, c = this.cam, anim = m.animations;
    ev.ecouter('tactile:glisser-debut', () => { anim.arreter(c); this.inertie = 0; });
    ev.ecouter('tactile:glisser', d => {
      c.lacet -= d.dx * 0.008;
      c.hauteur = ec_borner(c.hauteur + d.dy * 0.006, 0.3, 1.5);
    });
    ev.ecouter('tactile:glisser-fin', d => {
      this.inertie = -d.vx * 0.008;
      if (Math.abs(this.inertie) < 0.05) { this._memoriser(); return; }
      // Comportement qui s'arrête de lui-même : le rendu à la demande reprend sa veille ensuite
      anim.comportement(dt => {
        c.lacet += this.inertie * dt;
        this.inertie *= Math.exp(-4 * dt);
        if (Math.abs(this.inertie) > 0.02) return true;
        this._memoriser();
        return false;
      });
    });
    ev.ecouter('tactile:pincer', d => {
      c.zoom = ec_borner(c.zoom / d.echelle, 0.45, 1.6);
      c.lacet -= d.rotation;
    });
    ev.ecouter('tactile:pincer-fin', () => this._memoriser());
    ev.ecouter('tactile:appui', d => this._toucher(d));
    ev.ecouter('tactile:double-appui', d => {
      if (!m.objetSous(d.clientX, d.clientY)) this._orienter();
    });
  }

  _style() {
    if (document.getElementById('ec-style')) return;
    const st = document.createElement('style');
    st.id = 'ec-style';
    st.textContent = `
      #ctx-echecs{overflow:hidden}
      .ec-vue{position:absolute;inset:0;
        background:radial-gradient(ellipse at 50% 35%,var(--surface-color) 0%,var(--background-color) 55%,var(--border-color) 100%)}
      .ec-hud{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-end;flex-direction:column;gap:1em;
        padding:calc(env(safe-area-inset-top,0px) + .75em) .8em .6em;pointer-events:none}
      .ec-etat{max-width:45%;font-size:.85em;padding:.3em .8em;border-radius:999px;background:var(--surface-color);color:var(--text-color);
        box-shadow:0 1px 4px rgba(0,0,0,.08);text-align:right}
      .ec-etat.alerte{background:var(--hot-color);color:#fff}
      .ec-barre{position:absolute;left:0;right:0;bottom:max(.8em, env(safe-area-inset-bottom, 0px));display:flex;justify-content:center;gap:.5em;padding:0 .8em;flex-wrap:wrap}
      .ec-btn{border:0;border-radius:999px;padding:.55em .95em;font-size:.82em;background:var(--surface-color);color:var(--text-color);
        box-shadow:0 2px 8px rgba(0,0,0,.12);-webkit-tap-highlight-color:transparent}
      .ec-btn.on{background:var(--accent-color);color:#fff}
      .ec-btn.alerte{background:var(--hot-color);color:#fff}
      .ec-btn:active{transform:scale(.97)}
      .ec-promo{position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:1em}
      .ec-promo[hidden]{display:none}
      .ec-carte{background:var(--surface-color);border-radius:var(--radius);padding:1.1em;width:100%;max-width:22em;text-align:center}
      .ec-choix{display:grid;grid-template-columns:repeat(4,1fr);gap:.5em;margin:.9em 0}
      .ec-choix button{border:0;border-radius:12px;background:var(--background-color);color:var(--text-color);padding:.5em .2em;
        font-size:.8em;display:flex;flex-direction:column;align-items:center;gap:.1em}
      .ec-choix button span{font-size:2.2em;line-height:1.1;color:var(--accent-color)}
      .ec-non{border:0;background:none;color:var(--inactive-color);padding:.4em 1em}
      .ec-rubrique{display:block;text-align:left;font-size:.85em;margin:.2em 0 .5em;color:var(--text-color)}
      .ec-jeux{display:flex;gap:.5em;margin-bottom:1em}
      .ec-jeux button{flex:1;border:0;border-radius:12px;padding:.7em .4em;font-size:.85em;
        background:var(--background-color);color:var(--text-color)}
      .ec-themes{display:grid;grid-template-columns:repeat(4,1fr);gap:.5em;margin-bottom:.6em}
      .ec-themes button{border:0;border-radius:12px;background:var(--background-color);color:var(--text-color);
        padding:.45em .2em;font-size:.72em;display:flex;flex-direction:column;align-items:center;gap:.3em}
      .ec-themes i{position:relative;width:2.6em;height:2.6em;border-radius:6px;border:3px solid var(--bord);
        background:conic-gradient(var(--c1) 25%,var(--c2) 0 50%,var(--c1) 0 75%,var(--c2) 0)}
      .ec-themes em{position:absolute;top:50%;width:.8em;height:.8em;margin-top:-.4em;border-radius:50%;
        box-shadow:0 0 0 1.5px rgba(0,0,0,.55)}
      .ec-themes em:first-child{left:.25em}
      .ec-themes em:last-child{right:.25em}
      .ec-jeux button.on,.ec-themes button.on{box-shadow:0 0 0 2px var(--accent-color)}
      .ec-jeux button.on{background:var(--accent-color);color:#fff}
    `;
    document.head.appendChild(st);
  }
}

window.EchecsContext = EchecsContext;
