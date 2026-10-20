// moteur/maillage.js — maillage éditable (sommets + faces polygonales) et formats de fichiers 3D :
// Wavefront OBJ, STL (binaire ou texte) et glTF 2.0 (.gltf à données intégrées, ou .glb). Nécessite three.js.
//
//   const m = Maillage.depuisFichier(nom, contenu);  // contenu : texte (OBJ, glTF) ou ArrayBuffer (tous formats)
//   m.sommets  → [[x, y, z], …]          m.faces → [{ s: [i, j, k, …], m: 'materiau' }, …]
//   m.faces.push({ s: [0, 1, 2], m: 'defaut' });     // face tournée dans le sens trigonométrique vue de dehors
//   const geo = m.geometrie();                       // BufferGeometry à facettes (Modeles._geometrie)
//   m.versOBJ() → texte · m.versSTL() → ArrayBuffer · m.versGLB() → ArrayBuffer
//   Maillage.reunir([m1, m2]) → un maillage · Maillage.objetsVersOBJ([{ nom, maillage }]) → OBJ à plusieurs « o »
//   Maillage.objetsDepuisOBJ(texte) → [{ nom, maillage }] (un objet par « o », ou par « g » à défaut)
//
// Repère : Y vers le haut (three.js, OBJ, glTF). Les STL sont supposés Z vers le haut (Blender, impression 3D)
// et convertis dans les deux sens. Les polygones sont découpés en éventail : convexes et plans de préférence.

class Maillage {
  constructor(sommets = [], faces = []) {
    this.sommets = sommets;
    this.faces = faces;
  }

  clone() {
    return new Maillage(this.sommets.map(p => p.slice()), this.faces.map(f => ({ s: f.s.slice(), m: f.m })));
  }

  // Objet simple pour JSON.stringify (sauvegarde locale, annulation)
  versDonnees() {
    return { v: this.sommets.map(p => p.map(c => Math.round(c * 1e5) / 1e5)), f: this.faces.map(f => [f.m, ...f.s]) };
  }

  static depuisDonnees(d) {
    return new Maillage((d.v || []).map(p => p.slice()), (d.f || []).map(f => ({ m: f[0], s: f.slice(1) })));
  }

  // Cube centré sur l'origine, de côté `c` : point de départ d'un nouveau maillage
  static cube(c = 1) {
    const h = c / 2, s = [];
    for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) s.push([x, y, z]);
    // indices : x * 4 + y * 2 + z (0 = négatif, 1 = positif)
    const f = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    return new Maillage(s, f.map(q => ({ s: q, m: 'defaut' })));
  }

  // Liste des triangles (éventail) par matériau ; `materiauDe(face, n)` permet de regrouper autrement
  triangles(materiauDe = f => f.m) {
    const parMateriau = new Map();
    this.faces.forEach((f, n) => {
      const m = materiauDe(f, n);
      if (!parMateriau.has(m)) parMateriau.set(m, []);
      const l = parMateriau.get(m), s = f.s;
      for (let k = 1; k + 1 < s.length; k++) l.push(s[0], s[k], s[k + 1]);
    });
    return parMateriau;
  }

  geometrie(materiauDe) {
    return Modeles._geometrie(this.sommets.flat(), this.triangles(materiauDe));
  }

  // Arêtes uniques des polygones [[i, j], …] (pour l'affichage en fil de fer)
  aretes() {
    const vues = new Set(), a = [];
    for (const f of this.faces) {
      for (let k = 0; k < f.s.length; k++) {
        const i = f.s[k], j = f.s[(k + 1) % f.s.length], cle = i < j ? i + ' ' + j : j + ' ' + i;
        if (!vues.has(cle)) { vues.add(cle); a.push([i, j]); }
      }
    }
    return a;
  }

  // Normale d'une face (méthode de Newell : tient compte de tout le polygone)
  normale(f) {
    let x = 0, y = 0, z = 0;
    const s = f.s;
    for (let k = 0; k < s.length; k++) {
      const a = this.sommets[s[k]], b = this.sommets[s[(k + 1) % s.length]];
      x += (a[1] - b[1]) * (a[2] + b[2]);
      y += (a[2] - b[2]) * (a[0] + b[0]);
      z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  }

  // Découpe d'une face en triangles [[i, j, k], …], dans le sens de la face : oreilles successives dans le plan moyen
  // (Newell), ce qui convient aussi aux polygones concaves ; parmi les oreilles possibles, celle dont le plus petit
  // angle est le plus grand (triangles bien formés). Polygone trop tordu pour en trouver une : fin en éventail.
  trianguler(f) {
    const s = f.s, n = this.normale(f);
    if (s.length <= 3) return [s.slice()];
    // Repère du plan : u ⟂ n, v = n × u
    const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]];
    const lu = Math.hypot(...u); u = u.map(c => c / lu);
    const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const p = new Map(s.map(i => { const q = this.sommets[i]; return [i, [q[0] * u[0] + q[1] * u[1] + q[2] * u[2], q[0] * v[0] + q[1] * v[1] + q[2] * v[2]]]; }));
    const croix = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const angle = (a, b, c) => {
      const x = [b[0] - a[0], b[1] - a[1]], y = [c[0] - a[0], c[1] - a[1]];
      return Math.acos(Math.max(-1, Math.min(1, (x[0] * y[0] + x[1] * y[1]) / (Math.hypot(...x) * Math.hypot(...y) || 1))));
    };
    const reste = s.slice(), tris = [];
    let echelle = 0;
    for (const q of p.values()) echelle = Math.max(echelle, Math.abs(q[0]), Math.abs(q[1]));
    const eps = 1e-12 * (echelle * echelle || 1);
    while (reste.length > 3) {
      let meilleur = -1, note = -1;
      for (let k = 0; k < reste.length; k++) {
        const ia = reste[(k + reste.length - 1) % reste.length], ib = reste[k], ic = reste[(k + 1) % reste.length];
        const a = p.get(ia), b = p.get(ib), c = p.get(ic);
        if (croix(a, b, c) <= eps) continue;                          // coin rentrant ou plat
        const dedans = reste.some(j => j !== ia && j !== ib && j !== ic &&
          croix(a, b, p.get(j)) >= -eps && croix(b, c, p.get(j)) >= -eps && croix(c, a, p.get(j)) >= -eps);
        if (dedans) continue;
        const m = Math.min(angle(a, b, c), angle(b, c, a), angle(c, a, b));
        if (m > note) { note = m; meilleur = k; }
      }
      if (meilleur < 0) break;
      const k = meilleur;
      tris.push([reste[(k + reste.length - 1) % reste.length], reste[k], reste[(k + 1) % reste.length]]);
      reste.splice(k, 1);
    }
    for (let k = 1; k + 1 < reste.length; k++) tris.push([reste[0], reste[k], reste[k + 1]]);
    return tris;
  }

  // Retire des sommets (et les faces qui les utilisent), renumérote le reste
  supprimerSommets(indices) {
    const retires = new Set(indices), nouveau = [], n = [];
    this.sommets.forEach((p, i) => { if (retires.has(i)) n.push(-1); else { n.push(nouveau.length); nouveau.push(p); } });
    this.sommets = nouveau;
    this.faces = this.faces.filter(f => f.s.every(i => !retires.has(i)));
    for (const f of this.faces) f.s = f.s.map(i => n[i]);
    return n;                        // ancien indice → nouveau (−1 : supprimé)
  }

  // Fusionne des sommets en un seul (au centre) ; les faces dégénérées disparaissent. Renvoie la table ancien indice
  // → nouveau (les sommets fusionnés y ont tous l'indice du sommet gardé, `table[indices[0]]`).
  fusionner(indices) {
    if (indices.length < 2) return this.sommets.map((_, i) => i);
    const c = [0, 0, 0];
    for (const i of indices) for (let k = 0; k < 3; k++) c[k] += this.sommets[i][k] / indices.length;
    const garde = indices[0], autres = new Set(indices.slice(1));
    this.sommets[garde] = c;
    for (const f of this.faces) {
      f.s = f.s.map(i => autres.has(i) ? garde : i).filter((i, k, s) => i !== s[(k + 1) % s.length]);   // doublons voisins
    }
    this.faces = this.faces.filter(f => new Set(f.s).size >= 3);
    const n = this.supprimerSommets([...autres]);
    for (const i of autres) n[i] = n[garde];
    return n;
  }

  // Contour d'un ensemble de faces réunies en une seule : { s: [i, j, …], plane } ou { erreur }. Les faces doivent
  // être connexes par leurs arêtes (une face qui ne touche les autres que par un sommet, ou pas du tout, est isolée),
  // orientées dans le même sens, et former un seul polygone sans trou. Les sommets du contour sont tous gardés
  // (alignés compris) : les faces voisines les partagent. `plane` : faux si les faces ne sont pas dans un même plan.
  contourFaces(faces) {
    if (faces.length < 2) return { erreur: 'Sélectionnez au moins 2 faces' };
    const cle = (i, j) => i < j ? i + ' ' + j : j + ' ' + i;
    const parArete = new Map(), dirigees = new Set();
    for (const [n, f] of faces.entries()) {
      for (let k = 0; k < f.s.length; k++) {
        const i = f.s[k], j = f.s[(k + 1) % f.s.length], d = i + '>' + j;
        if (dirigees.has(d)) return { erreur: 'Faces d’orientations opposées : inversez-en' };
        dirigees.add(d);
        const c = cle(i, j);
        if (!parArete.has(c)) parArete.set(c, []);
        parArete.get(c).push(n);
      }
    }
    // Connexité par les arêtes partagées (union-find)
    const parent = faces.map((_, n) => n), racine = n => parent[n] === n ? n : (parent[n] = racine(parent[n]));
    for (const l of parArete.values()) {
      if (l.length > 2) return { erreur: 'Une arête est partagée par plus de 2 faces' };
      if (l.length === 2) parent[racine(l[0])] = racine(l[1]);
    }
    if (faces.some((_, n) => racine(n) !== racine(0))) return { erreur: 'Faces non connexes : au moins une est isolée' };
    // Bord : arêtes dirigées dont l'opposée n'est pas dans l'ensemble
    const suivant = new Map();
    for (const d of dirigees) {
      const [i, j] = d.split('>').map(Number);
      if (dirigees.has(j + '>' + i)) continue;
      if (suivant.has(i)) return { erreur: 'Les faces se touchent par un sommet seulement : contour non simple' };
      suivant.set(i, j);
    }
    if (!suivant.size) return { erreur: 'Surface fermée : pas de contour' };
    const depart = faces[0].s.find(i => suivant.has(i)) ?? suivant.keys().next().value, s = [depart];
    for (let i = suivant.get(depart); i !== depart; i = suivant.get(i)) {
      if (i === undefined || s.length > suivant.size) return { erreur: 'Contour ouvert' };
      s.push(i);
    }
    if (s.length < suivant.size) return { erreur: 'La réunion entourerait un trou' };
    const f = { s }, n = this.normale(f), o = this.sommets[s[0]];
    let ecart = 0, taille = 0;
    for (const i of s) {
      const p = this.sommets[i], d = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
      ecart = Math.max(ecart, Math.abs(d[0] * n[0] + d[1] * n[1] + d[2] * n[2]));
      taille = Math.max(taille, Math.hypot(...d));
    }
    return { s, plane: ecart <= 1e-4 * (taille || 1) };
  }

  // Coupe chaque arête [[i, j], …] en `coupes` + 1 segments égaux : nouveaux sommets ajoutés à la fin, insérés
  // dans toutes les faces qui la bordent, dans le sens de chacune (faces modifiées sur place : mêmes objets).
  // Renvoie Map « i j » (i < j) → indices des nouveaux sommets, de i vers j.
  subdiviser(aretes, coupes = 1) {
    const nouveaux = new Map(), cle = (i, j) => i < j ? i + ' ' + j : j + ' ' + i;
    for (const [a, b] of aretes) {
      const i = Math.min(a, b), j = Math.max(a, b), c = cle(i, j);
      if (nouveaux.has(c) || i === j) continue;
      const p = this.sommets[i], q = this.sommets[j], l = [];
      for (let k = 1; k <= coupes; k++) {
        const t = k / (coupes + 1);
        l.push(this.sommets.length);
        this.sommets.push(p.map((x, d) => x + (q[d] - x) * t));
      }
      nouveaux.set(c, l);
    }
    for (const f of this.faces) {
      const s = [];
      f.s.forEach((a, k) => {
        const b = f.s[(k + 1) % f.s.length], l = nouveaux.get(cle(a, b));
        s.push(a);
        if (l) s.push(...(a < b ? l : l.slice().reverse()));
      });
      f.s = s;
    }
    return nouveaux;
  }

  // Dissolution d'arêtes [[i, j], …] : chacune doit border exactement deux faces ; les faces reliées par ces arêtes
  // forment des groupes, réunis chacun en une face par contourFaces (sens des faces conservé, arêtes communes non
  // choisies dissoutes aussi). Renvoie { groupes: [{ faces, s, plane }] } ou { erreur }.
  dissolution(aretes) {
    if (!aretes.length) return { erreur: 'Sélectionnez au moins une arête' };
    const cle = (i, j) => i < j ? i + ' ' + j : j + ' ' + i, bordees = new Map();
    for (const f of this.faces) {
      for (let k = 0; k < f.s.length; k++) {
        const c = cle(f.s[k], f.s[(k + 1) % f.s.length]);
        if (!bordees.has(c)) bordees.set(c, []);
        bordees.get(c).push(f);
      }
    }
    const parent = new Map(), racine = f => parent.get(f) === f ? f : racine(parent.get(f));
    for (const [i, j] of aretes) {
      const l = bordees.get(cle(i, j)) || [];
      if (l.length < 2) return { erreur: 'Arête de bord : une seule face, rien à dissoudre' };
      if (l.length > 2) return { erreur: 'Une arête est partagée par plus de 2 faces' };
      if (l[0] === l[1]) return { erreur: 'Arête bordée deux fois par la même face' };
      for (const f of l) if (!parent.has(f)) parent.set(f, f);
      parent.set(racine(l[0]), racine(l[1]));
    }
    // Groupes dans l'ordre des faces du maillage (la première de chaque groupe donne départ et matériau)
    const groupes = new Map();
    for (const f of this.faces) {
      if (!parent.has(f)) continue;
      const r = racine(f);
      if (!groupes.has(r)) groupes.set(r, []);
      groupes.get(r).push(f);
    }
    const r = [];
    for (const faces of groupes.values()) {
      const c = this.contourFaces(faces);
      if (c.erreur) return c;
      r.push({ faces, s: c.s, plane: c.plane });
    }
    return { groupes: r };
  }

  // Sommets à la même position (à `tolerance` près) réunis : les fichiers STL et glTF les répètent
  souder(tolerance = 1e-5) {
    const deja = new Map(), n = [], sommets = [];
    const q = c => Math.round(c / tolerance);
    for (const p of this.sommets) {
      const cle = q(p[0]) + ' ' + q(p[1]) + ' ' + q(p[2]);
      let i = deja.get(cle);
      if (i === undefined) { i = sommets.length; sommets.push(p); deja.set(cle, i); }
      n.push(i);
    }
    this.sommets = sommets;
    for (const f of this.faces) f.s = f.s.map(i => n[i]).filter((i, k, s) => i !== s[(k + 1) % s.length]);
    this.faces = this.faces.filter(f => new Set(f.s).size >= 3);
    return this;
  }

  // Boîte englobante { min: [x, y, z], max: [x, y, z] } (null si vide)
  boite() {
    if (!this.sommets.length) return null;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of this.sommets) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
    return { min, max };
  }

  // ----- Lecture --------------------------------------------------------------------------------------
  // D'après l'extension du nom de fichier ; `contenu` : texte ou ArrayBuffer
  static depuisFichier(nom, contenu) {
    const ext = (nom.match(/\.([a-z0-9]+)(\?|#|$)/i) || [])[1];
    const e = ext ? ext.toLowerCase() : '';
    const texte = () => typeof contenu === 'string' ? contenu : new TextDecoder().decode(contenu);
    const octets = () => typeof contenu === 'string' ? new TextEncoder().encode(contenu).buffer : contenu;
    if (e === 'obj') return Maillage.depuisOBJ(texte());
    if (e === 'stl') return Maillage.depuisSTL(octets());
    if (e === 'gltf' || e === 'glb') return Maillage.depuisGLTF(octets());
    throw new Error('format non pris en charge : ' + (ext || nom) + ' (OBJ, STL, glTF, GLB)');
  }

  // Lignes lues : v, f (formats « 1 », « 1/2 », « 1/2/3 », « 1//3 », indices négatifs), usemtl.
  static depuisOBJ(texte, materiauParDefaut = 'defaut') {
    const sommets = [], faces = [];
    let m = materiauParDefaut;
    for (const brute of texte.split(/\r?\n/)) {
      const ligne = brute.trim();
      if (!ligne || ligne[0] === '#') continue;
      const t = ligne.split(/\s+/);
      if (t[0] === 'v') sommets.push([+t[1], +t[2], +t[3]]);
      else if (t[0] === 'usemtl') m = t[1] || materiauParDefaut;
      else if (t[0] === 'f') {
        const s = [], n = sommets.length;
        for (let k = 1; k < t.length; k++) {
          const v = parseInt(t[k], 10);           // « 12/5/7 » → 12
          if (!isNaN(v)) s.push(v < 0 ? n + v : v - 1);
        }
        if (s.length >= 3) faces.push({ s, m });
      }
    }
    return new Maillage(sommets, faces);
  }

  // OBJ à plusieurs objets → [{ nom, maillage }] : un par nom de « o » (à défaut de « o », de « g » ; mêmes noms
  // réunis), avec les sommets qu'utilisent ses faces, plus les sommets isolés déclarés dans son bloc. Indices
  // renumérotés par objet, coordonnées inchangées (au monde). Fichier sans « o » ni « g » : un seul objet.
  static objetsDepuisOBJ(texte, materiauParDefaut = 'defaut') {
    const lignes = texte.split(/\r?\n/).map(l => l.trim()).filter(l => l && l[0] !== '#');
    const cle = lignes.some(l => /^o(\s|$)/.test(l)) ? 'o' : 'g';
    const sommets = [], parNom = new Map(), utilises = new Set();
    let m = materiauParDefaut, courant = null;
    const objet = nom => {
      if (!parNom.has(nom)) parNom.set(nom, { nom, faces: [], declares: [] });
      return parNom.get(nom);
    };
    for (const ligne of lignes) {
      const t = ligne.split(/\s+/);
      if (t[0] === cle) courant = objet(t.slice(1).join(' ') || 'objet');
      else if (t[0] === 'v') { sommets.push([+t[1], +t[2], +t[3]]); if (courant) courant.declares.push(sommets.length - 1); }
      else if (t[0] === 'usemtl') m = t[1] || materiauParDefaut;
      else if (t[0] === 'f') {
        const s = [], n = sommets.length;
        for (let k = 1; k < t.length; k++) {
          const v = parseInt(t[k], 10);
          if (!isNaN(v)) s.push(v < 0 ? n + v : v - 1);
        }
        if (s.length < 3) continue;
        (courant || (courant = objet('objet'))).faces.push({ s, m });
        for (const i of s) utilises.add(i);
      }
    }
    const liste = [];
    for (const o of parNom.values()) {
      const local = new Map(), mm = new Maillage();
      const prendre = i => {
        if (!local.has(i)) { local.set(i, mm.sommets.length); mm.sommets.push(sommets[i].slice()); }
        return local.get(i);
      };
      for (const f of o.faces) mm.faces.push({ s: f.s.filter(i => sommets[i]).map(prendre), m: f.m });
      for (const i of o.declares) if (!utilises.has(i)) prendre(i);
      mm.faces = mm.faces.filter(f => f.s.length >= 3);
      if (mm.sommets.length) liste.push({ nom: o.nom, maillage: mm });
    }
    if (!parNom.size && sommets.length) liste.push({ nom: 'objet', maillage: new Maillage(sommets, []) });
    return liste;
  }

  // STL binaire ou texte, sommets soudés. `zEnHaut` : (x, y, z) du fichier → (x, z, −y)
  static depuisSTL(donnees, { materiau = 'defaut', zEnHaut = true } = {}) {
    const vue = new DataView(donnees), t = [];
    const n = donnees.byteLength >= 84 ? vue.getUint32(80, true) : -1;
    if (n >= 0 && 84 + n * 50 === donnees.byteLength) {
      for (let k = 0; k < n; k++) {
        const o = 84 + k * 50 + 12;                // 12 octets de normale, ignorée (recalculée)
        for (let c = 0; c < 9; c++) t.push(vue.getFloat32(o + c * 4, true));
      }
    } else {
      const texte = new TextDecoder().decode(donnees), re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
      let r;
      while ((r = re.exec(texte))) t.push(+r[1], +r[2], +r[3]);
    }
    const sommets = [], faces = [];
    for (let k = 0; k + 2 < t.length; k += 3) sommets.push(zEnHaut ? [t[k], t[k + 2], -t[k + 1]] : [t[k], t[k + 1], t[k + 2]]);
    for (let k = 0; k + 2 < sommets.length; k += 3) faces.push({ s: [k, k + 1, k + 2], m: materiau });
    return new Maillage(sommets, faces).souder(1e-4);
  }

  // glTF 2.0 : .glb, ou .gltf dont les tampons sont intégrés (« data: ») ; les fichiers .bin séparés ne sont
  // pas lisibles ici. Toutes les primitives triangulaires de la scène, transformations des nœuds appliquées.
  static depuisGLTF(donnees) {
    const u8 = new Uint8Array(donnees), vue = new DataView(donnees);
    let json, bin = null;
    if (vue.byteLength >= 12 && vue.getUint32(0, true) === 0x46546C67) {          // « glTF »
      let o = 12;
      while (o + 8 <= vue.byteLength) {
        const lg = vue.getUint32(o, true), type = vue.getUint32(o + 4, true), d = u8.subarray(o + 8, o + 8 + lg);
        if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(d));   // « JSON »
        else if (type === 0x004E4942) bin = d;                                      // « BIN »
        o += 8 + lg;
      }
    } else json = JSON.parse(new TextDecoder().decode(u8));
    if (!json) throw new Error('glTF illisible');

    const tampons = (json.buffers || []).map((b, i) => {
      if (b.uri && b.uri.startsWith('data:')) {
        const s = atob(b.uri.slice(b.uri.indexOf(',') + 1)), d = new Uint8Array(s.length);
        for (let k = 0; k < s.length; k++) d[k] = s.charCodeAt(k);
        return d;
      }
      if (i === 0 && bin) return bin;
      throw new Error('glTF : tampon externe « ' + (b.uri || '?') + ' » non pris en charge (utiliser un .glb)');
    });
    const TAILLES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const lire = n => {
      const a = json.accessors[n], bv = json.bufferViews[a.bufferView], t = tampons[bv.buffer];
      const nc = TAILLES[a.type], dv = new DataView(t.buffer, t.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0));
      const lg = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
      const pas = bv.byteStride || nc * lg, r = [];
      const lit = {
        5120: o => dv.getInt8(o), 5121: o => dv.getUint8(o), 5122: o => dv.getInt16(o, true),
        5123: o => dv.getUint16(o, true), 5125: o => dv.getUint32(o, true), 5126: o => dv.getFloat32(o, true)
      }[a.componentType];
      for (let i = 0; i < a.count; i++) for (let c = 0; c < nc; c++) r.push(lit(i * pas + c * lg));
      return r;
    };

    const m = new Maillage(), mat4 = new THREE.Matrix4(), v = new THREE.Vector3();
    const noeud = (i, parent) => {
      const nd = json.nodes[i], local = new THREE.Matrix4();
      if (nd.matrix) local.fromArray(nd.matrix);
      else local.compose(new THREE.Vector3(...(nd.translation || [0, 0, 0])),
        new THREE.Quaternion(...(nd.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(nd.scale || [1, 1, 1])));
      const monde = parent.clone().multiply(local);
      if (nd.mesh !== undefined) {
        for (const p of json.meshes[nd.mesh].primitives) {
          const mode = p.mode ?? 4;
          if (mode < 4 || p.attributes.POSITION === undefined) continue;   // points et lignes ignorés
          const pos = lire(p.attributes.POSITION), base = m.sommets.length;
          for (let k = 0; k < pos.length; k += 3) {
            v.set(pos[k], pos[k + 1], pos[k + 2]).applyMatrix4(monde);
            m.sommets.push([v.x, v.y, v.z]);
          }
          const idx = p.indices !== undefined ? lire(p.indices) : Array.from({ length: pos.length / 3 }, (_, k) => k);
          const mt = p.material !== undefined ? ((json.materials || [])[p.material] || {}).name || 'materiau' + p.material : 'defaut';
          const tri = (a, b, c) => m.faces.push({ s: [base + a, base + b, base + c], m: mt });
          if (mode === 4) for (let k = 0; k + 2 < idx.length; k += 3) tri(idx[k], idx[k + 1], idx[k + 2]);
          else if (mode === 5) for (let k = 0; k + 2 < idx.length; k++) k % 2 ? tri(idx[k + 1], idx[k], idx[k + 2]) : tri(idx[k], idx[k + 1], idx[k + 2]);
          else for (let k = 1; k + 1 < idx.length; k++) tri(idx[0], idx[k], idx[k + 1]);
        }
      }
      for (const e of nd.children || []) noeud(e, monde);
    };
    if (!json.nodes) json.nodes = (json.meshes || []).map((_, i) => ({ mesh: i }));   // sans nœuds : maillages tels quels
    const scene = (json.scenes || [])[json.scene || 0];
    for (const r of (scene && scene.nodes) || json.nodes.map((_, i) => i)) noeud(r, mat4);
    return m.souder();
  }

  // Un seul maillage fait de plusieurs (copiés, indices décalés) : export d'une scène en STL ou GLB
  static reunir(liste) {
    const r = new Maillage();
    for (const m of liste) {
      const base = r.sommets.length;
      for (const p of m.sommets) r.sommets.push(p.slice());
      for (const f of m.faces) r.faces.push({ s: f.s.map(i => i + base), m: f.m });
    }
    return r;
  }

  // ----- Écriture -------------------------------------------------------------------------------------
  // OBJ de plusieurs objets [{ nom, maillage }] : un « o » chacun, numérotation des sommets commune
  static objetsVersOBJ(liste, titre = 'scene') {
    const l = ['# ' + titre + ' — exporté par GDA'];
    let base = 0;
    for (const { nom, maillage } of liste) {
      const o = maillage.versOBJ(nom).split('\n').slice(1).filter(Boolean);
      for (const ligne of o) l.push(ligne.startsWith('f ') ? 'f ' + ligne.slice(2).split(' ').map(i => +i + base).join(' ') : ligne);
      base += maillage.sommets.length;
    }
    return l.join('\n') + '\n';
  }

  versOBJ(nom = 'maillage') {
    const l = ['# ' + nom + ' — exporté par GDA', 'o ' + nom.replace(/\s+/g, '_')];
    for (const p of this.sommets) l.push('v ' + p.map(c => +c.toFixed(6)).join(' '));
    let m = null;
    for (const f of this.faces) {
      if (f.m !== m) { m = f.m; l.push('usemtl ' + m); }
      l.push('f ' + f.s.map(i => i + 1).join(' '));
    }
    return l.join('\n') + '\n';
  }

  // STL binaire, Z vers le haut (inverse de la lecture)
  versSTL(nom = 'maillage') {
    const tri = [];
    for (const l of this.triangles().values()) for (const i of l) tri.push(i);
    const n = tri.length / 3, d = new ArrayBuffer(84 + n * 50), vue = new DataView(d);
    const entete = new TextEncoder().encode((nom + ' — GDA').slice(0, 79));
    new Uint8Array(d).set(entete, 0);
    vue.setUint32(80, n, true);
    const z = p => [p[0], -p[2], p[1]];
    for (let t = 0; t < n; t++) {
      const a = z(this.sommets[tri[t * 3]]), b = z(this.sommets[tri[t * 3 + 1]]), c = z(this.sommets[tri[t * 3 + 2]]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const ln = Math.hypot(...nn) || 1, o = 84 + t * 50;
      [...nn.map(x => x / ln), ...a, ...b, ...c].forEach((x, k) => vue.setFloat32(o + k * 4, x, true));
    }
    return d;
  }

  // glTF binaire (.glb) : un nœud, une primitive par matériau, sans normales (les lecteurs glTF calculent alors
  // des normales de facette, ce qui convient au style du moteur)
  versGLB(nom = 'maillage') {
    const groupes = [...this.triangles()].filter(([, l]) => l.length);
    const nv = this.sommets.length, lgPos = nv * 12;
    const lgIdx = groupes.reduce((s, [, l]) => s + l.length * 4, 0);
    const bin = new ArrayBuffer(lgPos + lgIdx), f32 = new Float32Array(bin, 0, nv * 3), u32 = new Uint32Array(bin, lgPos);
    const b = this.boite() || { min: [0, 0, 0], max: [0, 0, 0] };
    this.sommets.forEach((p, i) => f32.set(p, i * 3));
    const json = {
      asset: { version: '2.0', generator: 'GDA' }, scene: 0, scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: nom }], meshes: [{ name: nom, primitives: [] }], materials: [],
      buffers: [{ byteLength: bin.byteLength }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: lgPos, target: 34962 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: nv, type: 'VEC3',
        min: b.min.map(c => Math.fround(c)), max: b.max.map(c => Math.fround(c)) }]
    };
    let o = 0;
    groupes.forEach(([m, l], k) => {
      u32.set(l, o / 4);
      json.bufferViews.push({ buffer: 0, byteOffset: lgPos + o, byteLength: l.length * 4, target: 34963 });
      json.accessors.push({ bufferView: k + 1, componentType: 5125, count: l.length, type: 'SCALAR' });
      json.materials.push({ name: m, pbrMetallicRoughness: { baseColorFactor: [0.8, 0.8, 0.8, 1], metallicFactor: 0, roughnessFactor: 0.9 } });
      json.meshes[0].primitives.push({ attributes: { POSITION: 0 }, indices: k + 1, material: k, mode: 4 });
      o += l.length * 4;
    });
    // Assemblage : en-tête 12 octets, morceau JSON (complété d'espaces), morceau BIN (complété de zéros)
    const js = new TextEncoder().encode(JSON.stringify(json));
    const pad4 = n => (n + 3) & ~3, lj = pad4(js.length), lb = pad4(bin.byteLength);
    const total = 12 + 8 + lj + 8 + lb, d = new ArrayBuffer(total), vue = new DataView(d), u8 = new Uint8Array(d);
    vue.setUint32(0, 0x46546C67, true); vue.setUint32(4, 2, true); vue.setUint32(8, total, true);
    vue.setUint32(12, lj, true); vue.setUint32(16, 0x4E4F534A, true);
    u8.fill(0x20, 20, 20 + lj); u8.set(js, 20);
    vue.setUint32(20 + lj, lb, true); vue.setUint32(24 + lj, 0x004E4942, true);
    u8.set(new Uint8Array(bin), 28 + lj);
    return d;
  }
}

window.Maillage = Maillage;
