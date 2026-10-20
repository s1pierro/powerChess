# PowerChess

PWA Android pour **tablette** (13 pouces, paysage de préférence ; le portrait doit rester utilisable), en JavaScript
natif. Extraite du projet GDA (« Grosse direction artistique »), dont elle garde la coquille PWA et une partie du
moteur 3D. Jeu d'échecs à deux joueurs sur le même appareil, rendu « à l'ancienne » (cel-shading en paliers,
contours, ombres) par **three.js** (WebGL), avec le **contrôle des cases** : faisceaux d'énergie sur les cases vides
contrôlées, épées sur les pièces attaquées, boucliers sur les pièces défendues. Pièces reprises d'echiquierJS
(https://github.com/s1pierro/echiquierJS).

## Moteur (`moteur/`, chargé dans cet ordre, après `lib/three.min.js`)
three.js **r159** copié dans `lib/three.min.js` : dernière version livrée en script classique (variable globale
`THREE`) ; les versions suivantes n'existent qu'en modules ES, interdits ici. Ne pas utiliser les « addons »
(`examples/jsm`, modules ES) : écrire l'équivalent dans le moteur.
`modeles.js` `Modeles` (OBJ ou STL → BufferGeometry à facettes, un groupe par matériau `usemtl` dans
`geo.userData.materiaux` ; STL : Z vers le haut converti en Y ; `contour()` coque inversée ; `paliers(n)` pour
MeshToonMaterial ; `damier()`) ·
`maillage.js` `Maillage` (maillage polygonal : `sommets` [[x,y,z]], `faces` [{ s: [i,j,k…], m }] ; lecteurs OBJ / STL /
glTF utilisés par `Modeles` ; `geometrie()` ; sert aussi à construire l'épée et le bouclier du contrôle des cases) ·
`evenements.js` `Evenements` (bus « module:action », émission différée, minuteurs en temps de jeu) ·
`tactile.js` `Tactile` (Pointer Events → `tactile:appui`, `glisser`, `pincer`…) · `animation.js` `Animations`
(interpolations de propriétés numériques et comportements continus, `Assouplir`) ·
`sons.js` `Sons` (effets sonores Web Audio : `charger({ nom: url })`, `jouer(nom, { volume, vitesse, delai })`,
contexte audio réveillé au premier toucher ; `moteur.sons`) ·
`moteur.js` `Moteur` (renderer, `scene`, `camera`, `soleil` + `ciel`, `orbiter()`, `placerSoleil()`,
`objetSous()` qui ignore `userData.selectionnable = false`, `couleur('--var')` pour les couleurs du thème,
`pixelise`, boucle de jeu ; `continu: false` = rendu à la demande, `moteur.redessiner()`).
Les objets de la scène sont des objets three.js ordinaires ; données de jeu dans `userData`.
Modèles 3D : `modeles/echecs/` (OBJ d'echiquierJS, STL du jeu « Facettes » ; à lister dans `SHELL`).
Sons : `sons/echecs/` (à lister dans `SHELL`). Bibliothèques copiées : `lib/` (three.js, MIT ; chess.js, BSD).
Identifiants du moteur en français.
Test hors navigateur possible dans Node (module `vm`) : three.js, `Maillage`, `Modeles` et chess.js se chargent sans
DOM ; le contexte complet demande un DOM simulé et un faux `WebGLRenderer` (aucun navigateur dans Termux).

## Jeu (`ctx-echecs.js`, contexte d'identifiant « echecs »)
Règles : chess.js. Jeux de pièces `EC_JEUX`, thèmes `EC_THEMES` (bouton Apparence), contrôle des cases
`ec_controle()` + `EchecsControle` ; `ec_echange()` (évaluation statique des échanges, enfilades comprises) : le
bouclier d'une pièce défendue qui perd quand même du matériel luit en rouge (`EC_MENACE`, pulsation « luciole »). Événements : `echecs:coup`, `echecs:pose`, `echecs:echec`, `echecs:fin`,
`echecs:annulation`, `echecs:nouvelle` (les sons y répondent). Partie enregistrée en PGN dans `this.state`.

## Contexte de développement
- Le développeur travaille sur tablette Android de 13 pouces (Termux), sans clavier de bureau : ne pas proposer de
  raccourcis clavier ni d'outils qui supposent un ordinateur. Préférer des solutions testables dans le navigateur
  de la tablette. L'application vise ce grand écran tactile, en paysage surtout, en gardant des cibles au doigt.
- Code et commentaires **en français** (typographie française : espaces avant « : ; ? ! », guillemets « »).
  Le français est aussi la langue de référence de l'interface, traduite par `i18n.js`.

## Règles du projet
- **Aucune étape de build** : pas de bundler, pas de npm, pas de framework, pas de modules ES. Des scripts classiques
  chargés dans l'ordre par `index.html`, qui exposent leurs classes sur `window`.
- **Publier une version** : incrémenter `version` dans `app.config.js` (lu par la page ET par le service worker).
  À faire à chaque livraison, sinon les appareils gardent l'ancien cache.
- **Nouveau fichier** : l'ajouter à `index.html` (avant `app.js`) **et** à la liste `SHELL` de `service-worker.js`.
- **Régionalisation** (`i18n.js`, chargé juste après `storage-ns.js`) : aucun texte affiché écrit en dur ; passer par
  `tr('cle', { param })` (`{param}` remplacé). Toute nouvelle clé s'ajoute au dictionnaire `fr` (référence et repli)
  **et** à chaque autre langue de `LANGUES` (aujourd'hui fr, en, es, de, it, pt), chacune avec sa propre typographie.
  Nombres : `I18N.nombre(v, décimales)`. Langue : choix enregistré (clé `langue`), sinon celle de l'appareil, sinon
  l'anglais ; `I18N.choisir(code | null)` enregistre et recharge (Réglages › Langue). Le manifeste reste en français.
- **Stockage** : passer par `app.saveToLocal(clé, valeur)` / `app.loadFromLocal(clé)` ou `localStorage` ;
  le préfixe `powerchess:` est ajouté automatiquement par `storage-ns.js` (ne jamais l'écrire à la main).
- **Écrans** : un onglet ou une page = une classe qui étend `Context` (voir `contexts.js`) :
  `build(el)` une seule fois, `onShow()` / `onHide()` à chaque affichage, état persistant dans `this.state`
  (`defaultState()`, puis `this.save()`). Onglets : `initContexts()` + tableau `TABS` dans `app.js`
  (aujourd'hui PowerChess et Réglages). Pages superposées : `register(…, { overlay: true })`,
  `app.contexts.open(id)` / `app.contexts.back()`.
- **Navigation** : menu déroulant flottant en haut à gauche (`buildNavDock()` dans `app.js`) ; au repos il affiche
  l'icône et le nom du contexte courant, qui tiennent lieu de titre : un écran n'affiche pas son propre titre et
  laisse libre le coin supérieur gauche (`var(--nav-reserve)` = hauteur de la pastille, zone sûre comprise).
  Un contexte qui a besoin de place déclare `get navMini() { return true; }` : la pastille n'affiche alors au repos
  que l'icône. Les barres d'outils posées en bas utilisent `max(.8em, env(safe-area-inset-bottom))`.
- **Styles** : couleurs et rayons via les variables de `css/app.css` (`--accent-color`, `--hot-color`…), jamais
  de couleur d'identité codée en dur (les thèmes du plateau, `EC_THEMES`, sont des couleurs de jeu). Le style propre
  à un écran est injecté une fois par son contexte (`<style id="ec-style">`) avec des classes préfixées (`ec-`).
- **Écran d'accueil PWA** (`pwa.js` + `css/pwa.css`) : état, Démarrer en plein écran / dans le navigateur,
  installation, mise à jour, réinitialisation. Ne pas contourner : la mise à jour n'est appliquée que sur demande
  (`SKIP_WAITING`). Lignes d'état supplémentaires : `PWA.addRow(async () => ({ k, v, s }))`.
- Mise en page : tablette, paysage et portrait (`"orientation": "any"` dans le manifeste), rester utilisable sur
  téléphone ; zones sûres (`env(safe-area-inset-*)`), hauteur réelle via `--app-h`.
- Pas de dépendance externe sans nécessité ; si une bibliothèque CDN est utile, version figée dans l'URL
  (elle est mise en cache par le service worker, voir `LIB_HOSTS`).

## Vérifier
- Syntaxe : `node --check <fichier>.js` sur chaque fichier modifié.
- Secours navigateur : `?reset` (vide service worker + caches), `?eruda` (console de débogage mobile).

## Fichiers
`app.config.js` identité/version · `index.html` coquille · `manifest.json` · `service-worker.js` cache hors ligne ·
`storage-ns.js` préfixe des données · `i18n.js` langues et traductions (`tr`, `I18N`) · `pwa.js` écran d'accueil · `contexts.js` contextes, en-tête à vague, `uiSvg` ·
`app.js` menu de navigation et stockage · `ctx-echecs.js` PowerChess · `ctx-reglages.js` plein écran, langue,
installation, version · `moteur/` moteur 3D · `lib/` bibliothèques copiées · `modeles/echecs/` · `sons/echecs/` · `css/` thème ·
`icons/` icônes (`icon.svg` et `icon-maskable.svg` sources des PNG du manifeste, `glyph.svg` pion monochrome pour
l'en-tête ; PNG régénérés avec `inkscape icon.svg -w 512 -h 512 -o icon-512x512.png`). Voir aussi `LISEZMOI.txt`.
