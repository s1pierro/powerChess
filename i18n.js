// i18n.js — régionalisation : langue de l'interface, textes traduits, nombres.
// Chargé juste après storage-ns.js, avant tout script qui affiche du texte. Expose window.I18N et tr() :
//   tr('ec.nouvelle')               → texte dans la langue courante (repli : le français, puis la clé elle-même)
//   tr('ec.trait.w', { n: 12 })     → « Coup 12 · aux blancs » (chaque {nom} est remplacé)
//   I18N.nombre(1.5, 1)             → « 1,5 » / « 1.5 » selon la langue
// Langue : choix enregistré (clé locale « langue »), sinon la première langue de l'appareil disponible, sinon
// l'anglais. I18N.choisir(code) enregistre le choix (null : automatique) et recharge l'application.
// Ajouter une langue : une entrée dans LANGUES (`nom` écrit dans la langue elle-même), avec toutes les clés du
// français, qui sert de référence ; chaque langue garde sa propre typographie (espaces, guillemets).
(function () {
  'use strict';

  const LANGUES = {
    fr: { nom: 'Français', textes: {
      'app.slogan': 'Échecs et contrôle des cases',
      'app.nomComplet': 'PowerChess — échecs et contrôle des cases',
      'app.ouvrirImpossible': 'Impossible d’ouvrir « {id} » : {err}',
      'nav.reglages': 'Réglages',
      'unite.o': 'o', 'unite.ko': 'Ko', 'unite.mo': 'Mo', 'unite.go': 'Go',

      'pwa.version': 'version {v}',
      'pwa.sw.nonPris': 'Non pris en charge', 'pwa.sw.https': 'HTTPS requis', 'pwa.sw.erreur': 'Erreur',
      'pwa.sw.enregistrement': 'Enregistrement…', 'pwa.sw.inactif': 'Inactif', 'pwa.sw.installation': 'Installation…',
      'pwa.sw.actif': 'Actif', 'pwa.sw.actifProchain': 'Actif (au prochain démarrage)',
      'pwa.mode.fullscreen': 'Installée · plein écran', 'pwa.mode.standalone': 'Installée · autonome',
      'pwa.mode.minimal-ui': 'Installée · minimale', 'pwa.mode.browser': 'Dans le navigateur',
      'pwa.k.application': 'Application', 'pwa.k.sw': 'Service worker', 'pwa.k.horsLigne': 'Hors ligne',
      'pwa.k.connexion': 'Connexion', 'pwa.k.donnees': 'Données locales', 'pwa.k.stockage': 'Stockage navigateur',
      'pwa.k.pleinEcran': 'Plein écran', 'pwa.k.maj': 'Mise à jour',
      'pwa.pret': 'Prêt · {n} fichiers', 'pwa.indisponible': 'Non disponible', 'pwa.enLigne': 'En ligne',
      'pwa.horsLigne': 'Hors ligne', 'pwa.actif': 'Actif', 'pwa.inactif': 'Inactif', 'pwa.disponible': 'Disponible',
      'pwa.aide.ios': 'Pour installer : Safari › Partager › « Sur l’écran d’accueil ».',
      'pwa.aide.menu': 'L’installation est proposée par le menu du navigateur (« Installer l’application »).',
      'pwa.aide.https': 'L’installation nécessite une connexion sécurisée (HTTPS).',
      'pwa.fermer': 'Fermer', 'pwa.demarrerPE': 'Démarrer en plein écran', 'pwa.demarrerNav': 'Démarrer dans le navigateur',
      'pwa.demarrer': 'Démarrer', 'pwa.maj': 'Mettre à jour l’application', 'pwa.installer': 'Installer l’application',
      'pwa.quitterPE': 'Quitter le plein écran', 'pwa.passerPE': 'Passer en plein écran',
      'pwa.reinit': 'Réinitialisation', 'pwa.reinitApp': 'Réinitialiser l’application',
      'pwa.reinitConf': 'Confirmer ? (cache et mises à jour)', 'pwa.effacer': 'Tout effacer, données comprises',
      'pwa.effacerConf': 'Confirmer ? (données locales perdues)',
      'pwa.reinitAide': 'La réinitialisation supprime le cache hors ligne et recharge l’application ; vos données sont conservées, sauf avec « Tout effacer ».',

      'rg.affichage': 'Affichage', 'rg.pleinEcran': 'Plein écran',
      'rg.peActif': 'Activé · toucher pour quitter', 'rg.peInactif': 'Désactivé · toucher pour activer',
      'rg.application': 'Application', 'rg.installation': 'Installation et état', 'rg.navigateur': 'Dans le navigateur',
      'rg.installee': 'Installée', 'rg.majDispo': ' · mise à jour disponible', 'rg.reinit': ' · réinitialisation',
      'rg.version': 'Version {v}', 'rg.langue': 'Langue', 'rg.auto': 'Automatique',
      'rg.autoSous': 'Langue de l’appareil : {nom}',

      'ec.webgl': 'WebGL indisponible sur cet appareil', 'ec.chargement': 'Chargement des pièces…',
      'ec.introuvables': 'Pièces introuvables : {err}', 'ec.annuler': '↶ Annuler',
      'ec.vueTrait': '⟲ Vue : suit le trait', 'ec.vueLibre': '⟲ Vue : libre',
      'ec.nouvelle': 'Nouvelle partie', 'ec.confirmer': 'Confirmer ?', 'ec.apparence': '🎨 Apparence',
      'ec.controle': 'Contrôle des cases', 'ec.sons': 'Sons', 'ec.promotion': 'Promotion du pion',
      'ec.q': 'Dame', 'ec.r': 'Tour', 'ec.b': 'Fou', 'ec.n': 'Cavalier', 'ec.annulerPromo': 'Annuler',
      'ec.jeuPieces': 'Jeu de pièces', 'ec.couleurs': 'Couleurs', 'ec.fermer': 'Fermer',
      'ec.jeu.echiquierjs': 'echiquierJS', 'ec.jeu.facettes': 'Facettes',
      'ec.theme.bois': 'Bois', 'ec.theme.tournoi': 'Tournoi', 'ec.theme.marbre': 'Marbre', 'ec.theme.ocean': 'Océan',
      'ec.theme.corail': 'Corail', 'ec.theme.nuit': 'Nuit', 'ec.theme.retro': 'Rétro',
      'ec.mat.w': 'Échec et mat : les blancs gagnent', 'ec.mat.b': 'Échec et mat : les noirs gagnent',
      'ec.pat': 'Pat : partie nulle', 'ec.repetition': 'Partie nulle par répétition',
      'ec.materiel': 'Partie nulle : matériel insuffisant', 'ec.cinquante': 'Partie nulle (règle des 50 coups)',
      'ec.trait.w': 'Coup {n} · aux blancs', 'ec.trait.b': 'Coup {n} · aux noirs',
      'ec.traitEchec.w': 'Coup {n} · aux blancs : échec !', 'ec.traitEchec.b': 'Coup {n} · aux noirs : échec !'
    } },

    en: { nom: 'English', textes: {
      'app.slogan': 'Chess and square control',
      'app.nomComplet': 'PowerChess — chess and square control',
      'app.ouvrirImpossible': 'Cannot open “{id}”: {err}',
      'nav.reglages': 'Settings',
      'unite.o': 'B', 'unite.ko': 'KB', 'unite.mo': 'MB', 'unite.go': 'GB',

      'pwa.version': 'version {v}',
      'pwa.sw.nonPris': 'Not supported', 'pwa.sw.https': 'HTTPS required', 'pwa.sw.erreur': 'Error',
      'pwa.sw.enregistrement': 'Registering…', 'pwa.sw.inactif': 'Inactive', 'pwa.sw.installation': 'Installing…',
      'pwa.sw.actif': 'Active', 'pwa.sw.actifProchain': 'Active (on next launch)',
      'pwa.mode.fullscreen': 'Installed · full screen', 'pwa.mode.standalone': 'Installed · standalone',
      'pwa.mode.minimal-ui': 'Installed · minimal', 'pwa.mode.browser': 'In the browser',
      'pwa.k.application': 'App', 'pwa.k.sw': 'Service worker', 'pwa.k.horsLigne': 'Offline',
      'pwa.k.connexion': 'Connection', 'pwa.k.donnees': 'Local data', 'pwa.k.stockage': 'Browser storage',
      'pwa.k.pleinEcran': 'Full screen', 'pwa.k.maj': 'Update',
      'pwa.pret': 'Ready · {n} files', 'pwa.indisponible': 'Not available', 'pwa.enLigne': 'Online',
      'pwa.horsLigne': 'Offline', 'pwa.actif': 'On', 'pwa.inactif': 'Off', 'pwa.disponible': 'Available',
      'pwa.aide.ios': 'To install: Safari › Share › “Add to Home Screen”.',
      'pwa.aide.menu': 'Installation is offered in the browser menu (“Install app”).',
      'pwa.aide.https': 'Installation requires a secure connection (HTTPS).',
      'pwa.fermer': 'Close', 'pwa.demarrerPE': 'Start in full screen', 'pwa.demarrerNav': 'Start in the browser',
      'pwa.demarrer': 'Start', 'pwa.maj': 'Update the app', 'pwa.installer': 'Install the app',
      'pwa.quitterPE': 'Exit full screen', 'pwa.passerPE': 'Go full screen',
      'pwa.reinit': 'Reset', 'pwa.reinitApp': 'Reset the app',
      'pwa.reinitConf': 'Confirm? (cache and updates)', 'pwa.effacer': 'Erase everything, data included',
      'pwa.effacerConf': 'Confirm? (local data will be lost)',
      'pwa.reinitAide': 'Resetting removes the offline cache and reloads the app; your data is kept, except with “Erase everything”.',

      'rg.affichage': 'Display', 'rg.pleinEcran': 'Full screen',
      'rg.peActif': 'On · tap to exit', 'rg.peInactif': 'Off · tap to enable',
      'rg.application': 'App', 'rg.installation': 'Installation and status', 'rg.navigateur': 'In the browser',
      'rg.installee': 'Installed', 'rg.majDispo': ' · update available', 'rg.reinit': ' · reset',
      'rg.version': 'Version {v}', 'rg.langue': 'Language', 'rg.auto': 'Automatic',
      'rg.autoSous': 'Device language: {nom}',

      'ec.webgl': 'WebGL is not available on this device', 'ec.chargement': 'Loading pieces…',
      'ec.introuvables': 'Pieces not found: {err}', 'ec.annuler': '↶ Undo',
      'ec.vueTrait': '⟲ View: follows the turn', 'ec.vueLibre': '⟲ View: free',
      'ec.nouvelle': 'New game', 'ec.confirmer': 'Confirm?', 'ec.apparence': '🎨 Appearance',
      'ec.controle': 'Square control', 'ec.sons': 'Sounds', 'ec.promotion': 'Pawn promotion',
      'ec.q': 'Queen', 'ec.r': 'Rook', 'ec.b': 'Bishop', 'ec.n': 'Knight', 'ec.annulerPromo': 'Cancel',
      'ec.jeuPieces': 'Piece set', 'ec.couleurs': 'Colors', 'ec.fermer': 'Close',
      'ec.jeu.echiquierjs': 'echiquierJS', 'ec.jeu.facettes': 'Facets',
      'ec.theme.bois': 'Wood', 'ec.theme.tournoi': 'Tournament', 'ec.theme.marbre': 'Marble', 'ec.theme.ocean': 'Ocean',
      'ec.theme.corail': 'Coral', 'ec.theme.nuit': 'Night', 'ec.theme.retro': 'Retro',
      'ec.mat.w': 'Checkmate: White wins', 'ec.mat.b': 'Checkmate: Black wins',
      'ec.pat': 'Stalemate: draw', 'ec.repetition': 'Draw by repetition',
      'ec.materiel': 'Draw: insufficient material', 'ec.cinquante': 'Draw (50-move rule)',
      'ec.trait.w': 'Move {n} · White to play', 'ec.trait.b': 'Move {n} · Black to play',
      'ec.traitEchec.w': 'Move {n} · White to play: check!', 'ec.traitEchec.b': 'Move {n} · Black to play: check!'
    } },

    es: { nom: 'Español', textes: {
      'app.slogan': 'Ajedrez y control de casillas',
      'app.nomComplet': 'PowerChess — ajedrez y control de casillas',
      'app.ouvrirImpossible': 'No se puede abrir «{id}»: {err}',
      'nav.reglages': 'Ajustes',
      'unite.o': 'B', 'unite.ko': 'KB', 'unite.mo': 'MB', 'unite.go': 'GB',

      'pwa.version': 'versión {v}',
      'pwa.sw.nonPris': 'No compatible', 'pwa.sw.https': 'Se requiere HTTPS', 'pwa.sw.erreur': 'Error',
      'pwa.sw.enregistrement': 'Registrando…', 'pwa.sw.inactif': 'Inactivo', 'pwa.sw.installation': 'Instalando…',
      'pwa.sw.actif': 'Activo', 'pwa.sw.actifProchain': 'Activo (en el próximo inicio)',
      'pwa.mode.fullscreen': 'Instalada · pantalla completa', 'pwa.mode.standalone': 'Instalada · independiente',
      'pwa.mode.minimal-ui': 'Instalada · mínima', 'pwa.mode.browser': 'En el navegador',
      'pwa.k.application': 'Aplicación', 'pwa.k.sw': 'Service worker', 'pwa.k.horsLigne': 'Sin conexión',
      'pwa.k.connexion': 'Conexión', 'pwa.k.donnees': 'Datos locales', 'pwa.k.stockage': 'Almacenamiento del navegador',
      'pwa.k.pleinEcran': 'Pantalla completa', 'pwa.k.maj': 'Actualización',
      'pwa.pret': 'Lista · {n} archivos', 'pwa.indisponible': 'No disponible', 'pwa.enLigne': 'En línea',
      'pwa.horsLigne': 'Sin conexión', 'pwa.actif': 'Activa', 'pwa.inactif': 'Inactiva', 'pwa.disponible': 'Disponible',
      'pwa.aide.ios': 'Para instalar: Safari › Compartir › «Añadir a pantalla de inicio».',
      'pwa.aide.menu': 'La instalación se ofrece en el menú del navegador («Instalar aplicación»).',
      'pwa.aide.https': 'La instalación requiere una conexión segura (HTTPS).',
      'pwa.fermer': 'Cerrar', 'pwa.demarrerPE': 'Iniciar en pantalla completa', 'pwa.demarrerNav': 'Iniciar en el navegador',
      'pwa.demarrer': 'Iniciar', 'pwa.maj': 'Actualizar la aplicación', 'pwa.installer': 'Instalar la aplicación',
      'pwa.quitterPE': 'Salir de pantalla completa', 'pwa.passerPE': 'Pasar a pantalla completa',
      'pwa.reinit': 'Restablecimiento', 'pwa.reinitApp': 'Restablecer la aplicación',
      'pwa.reinitConf': '¿Confirmar? (caché y actualizaciones)', 'pwa.effacer': 'Borrar todo, datos incluidos',
      'pwa.effacerConf': '¿Confirmar? (se perderán los datos locales)',
      'pwa.reinitAide': 'El restablecimiento elimina la caché sin conexión y recarga la aplicación; tus datos se conservan, salvo con «Borrar todo».',

      'rg.affichage': 'Pantalla', 'rg.pleinEcran': 'Pantalla completa',
      'rg.peActif': 'Activada · toca para salir', 'rg.peInactif': 'Desactivada · toca para activar',
      'rg.application': 'Aplicación', 'rg.installation': 'Instalación y estado', 'rg.navigateur': 'En el navegador',
      'rg.installee': 'Instalada', 'rg.majDispo': ' · actualización disponible', 'rg.reinit': ' · restablecimiento',
      'rg.version': 'Versión {v}', 'rg.langue': 'Idioma', 'rg.auto': 'Automático',
      'rg.autoSous': 'Idioma del dispositivo: {nom}',

      'ec.webgl': 'WebGL no está disponible en este dispositivo', 'ec.chargement': 'Cargando piezas…',
      'ec.introuvables': 'Piezas no encontradas: {err}', 'ec.annuler': '↶ Deshacer',
      'ec.vueTrait': '⟲ Vista: sigue el turno', 'ec.vueLibre': '⟲ Vista: libre',
      'ec.nouvelle': 'Nueva partida', 'ec.confirmer': '¿Confirmar?', 'ec.apparence': '🎨 Apariencia',
      'ec.controle': 'Control de casillas', 'ec.sons': 'Sonidos', 'ec.promotion': 'Promoción del peón',
      'ec.q': 'Dama', 'ec.r': 'Torre', 'ec.b': 'Alfil', 'ec.n': 'Caballo', 'ec.annulerPromo': 'Cancelar',
      'ec.jeuPieces': 'Juego de piezas', 'ec.couleurs': 'Colores', 'ec.fermer': 'Cerrar',
      'ec.jeu.echiquierjs': 'echiquierJS', 'ec.jeu.facettes': 'Facetas',
      'ec.theme.bois': 'Madera', 'ec.theme.tournoi': 'Torneo', 'ec.theme.marbre': 'Mármol', 'ec.theme.ocean': 'Océano',
      'ec.theme.corail': 'Coral', 'ec.theme.nuit': 'Noche', 'ec.theme.retro': 'Retro',
      'ec.mat.w': 'Jaque mate: ganan las blancas', 'ec.mat.b': 'Jaque mate: ganan las negras',
      'ec.pat': 'Ahogado: tablas', 'ec.repetition': 'Tablas por repetición',
      'ec.materiel': 'Tablas: material insuficiente', 'ec.cinquante': 'Tablas (regla de los 50 movimientos)',
      'ec.trait.w': 'Jugada {n} · juegan las blancas', 'ec.trait.b': 'Jugada {n} · juegan las negras',
      'ec.traitEchec.w': 'Jugada {n} · juegan las blancas: ¡jaque!', 'ec.traitEchec.b': 'Jugada {n} · juegan las negras: ¡jaque!'
    } },

    de: { nom: 'Deutsch', textes: {
      'app.slogan': 'Schach und Feldkontrolle',
      'app.nomComplet': 'PowerChess — Schach und Feldkontrolle',
      'app.ouvrirImpossible': '„{id}“ kann nicht geöffnet werden: {err}',
      'nav.reglages': 'Einstellungen',
      'unite.o': 'B', 'unite.ko': 'KB', 'unite.mo': 'MB', 'unite.go': 'GB',

      'pwa.version': 'Version {v}',
      'pwa.sw.nonPris': 'Nicht unterstützt', 'pwa.sw.https': 'HTTPS erforderlich', 'pwa.sw.erreur': 'Fehler',
      'pwa.sw.enregistrement': 'Registrierung…', 'pwa.sw.inactif': 'Inaktiv', 'pwa.sw.installation': 'Installation…',
      'pwa.sw.actif': 'Aktiv', 'pwa.sw.actifProchain': 'Aktiv (beim nächsten Start)',
      'pwa.mode.fullscreen': 'Installiert · Vollbild', 'pwa.mode.standalone': 'Installiert · eigenständig',
      'pwa.mode.minimal-ui': 'Installiert · minimal', 'pwa.mode.browser': 'Im Browser',
      'pwa.k.application': 'App', 'pwa.k.sw': 'Service Worker', 'pwa.k.horsLigne': 'Offline',
      'pwa.k.connexion': 'Verbindung', 'pwa.k.donnees': 'Lokale Daten', 'pwa.k.stockage': 'Browser-Speicher',
      'pwa.k.pleinEcran': 'Vollbild', 'pwa.k.maj': 'Update',
      'pwa.pret': 'Bereit · {n} Dateien', 'pwa.indisponible': 'Nicht verfügbar', 'pwa.enLigne': 'Online',
      'pwa.horsLigne': 'Offline', 'pwa.actif': 'Aktiv', 'pwa.inactif': 'Inaktiv', 'pwa.disponible': 'Verfügbar',
      'pwa.aide.ios': 'Zum Installieren: Safari › Teilen › „Zum Home-Bildschirm“.',
      'pwa.aide.menu': 'Die Installation wird im Browsermenü angeboten („App installieren“).',
      'pwa.aide.https': 'Die Installation erfordert eine sichere Verbindung (HTTPS).',
      'pwa.fermer': 'Schließen', 'pwa.demarrerPE': 'Im Vollbild starten', 'pwa.demarrerNav': 'Im Browser starten',
      'pwa.demarrer': 'Starten', 'pwa.maj': 'App aktualisieren', 'pwa.installer': 'App installieren',
      'pwa.quitterPE': 'Vollbild beenden', 'pwa.passerPE': 'Vollbild aktivieren',
      'pwa.reinit': 'Zurücksetzen', 'pwa.reinitApp': 'App zurücksetzen',
      'pwa.reinitConf': 'Bestätigen? (Cache und Updates)', 'pwa.effacer': 'Alles löschen, auch die Daten',
      'pwa.effacerConf': 'Bestätigen? (lokale Daten gehen verloren)',
      'pwa.reinitAide': 'Das Zurücksetzen löscht den Offline-Cache und lädt die App neu; deine Daten bleiben erhalten, außer bei „Alles löschen“.',

      'rg.affichage': 'Anzeige', 'rg.pleinEcran': 'Vollbild',
      'rg.peActif': 'Aktiv · tippen zum Beenden', 'rg.peInactif': 'Inaktiv · tippen zum Aktivieren',
      'rg.application': 'App', 'rg.installation': 'Installation und Status', 'rg.navigateur': 'Im Browser',
      'rg.installee': 'Installiert', 'rg.majDispo': ' · Update verfügbar', 'rg.reinit': ' · Zurücksetzen',
      'rg.version': 'Version {v}', 'rg.langue': 'Sprache', 'rg.auto': 'Automatisch',
      'rg.autoSous': 'Gerätesprache: {nom}',

      'ec.webgl': 'WebGL ist auf diesem Gerät nicht verfügbar', 'ec.chargement': 'Figuren werden geladen…',
      'ec.introuvables': 'Figuren nicht gefunden: {err}', 'ec.annuler': '↶ Zurück',
      'ec.vueTrait': '⟲ Ansicht: folgt dem Zug', 'ec.vueLibre': '⟲ Ansicht: frei',
      'ec.nouvelle': 'Neue Partie', 'ec.confirmer': 'Bestätigen?', 'ec.apparence': '🎨 Aussehen',
      'ec.controle': 'Feldkontrolle', 'ec.sons': 'Töne', 'ec.promotion': 'Bauernumwandlung',
      'ec.q': 'Dame', 'ec.r': 'Turm', 'ec.b': 'Läufer', 'ec.n': 'Springer', 'ec.annulerPromo': 'Abbrechen',
      'ec.jeuPieces': 'Figurensatz', 'ec.couleurs': 'Farben', 'ec.fermer': 'Schließen',
      'ec.jeu.echiquierjs': 'echiquierJS', 'ec.jeu.facettes': 'Facetten',
      'ec.theme.bois': 'Holz', 'ec.theme.tournoi': 'Turnier', 'ec.theme.marbre': 'Marmor', 'ec.theme.ocean': 'Ozean',
      'ec.theme.corail': 'Koralle', 'ec.theme.nuit': 'Nacht', 'ec.theme.retro': 'Retro',
      'ec.mat.w': 'Schachmatt: Weiß gewinnt', 'ec.mat.b': 'Schachmatt: Schwarz gewinnt',
      'ec.pat': 'Patt: Remis', 'ec.repetition': 'Remis durch Stellungswiederholung',
      'ec.materiel': 'Remis: ungenügendes Material', 'ec.cinquante': 'Remis (50-Züge-Regel)',
      'ec.trait.w': 'Zug {n} · Weiß am Zug', 'ec.trait.b': 'Zug {n} · Schwarz am Zug',
      'ec.traitEchec.w': 'Zug {n} · Weiß am Zug: Schach!', 'ec.traitEchec.b': 'Zug {n} · Schwarz am Zug: Schach!'
    } },

    it: { nom: 'Italiano', textes: {
      'app.slogan': 'Scacchi e controllo delle case',
      'app.nomComplet': 'PowerChess — scacchi e controllo delle case',
      'app.ouvrirImpossible': 'Impossibile aprire «{id}»: {err}',
      'nav.reglages': 'Impostazioni',
      'unite.o': 'B', 'unite.ko': 'KB', 'unite.mo': 'MB', 'unite.go': 'GB',

      'pwa.version': 'versione {v}',
      'pwa.sw.nonPris': 'Non supportato', 'pwa.sw.https': 'HTTPS richiesto', 'pwa.sw.erreur': 'Errore',
      'pwa.sw.enregistrement': 'Registrazione…', 'pwa.sw.inactif': 'Inattivo', 'pwa.sw.installation': 'Installazione…',
      'pwa.sw.actif': 'Attivo', 'pwa.sw.actifProchain': 'Attivo (al prossimo avvio)',
      'pwa.mode.fullscreen': 'Installata · schermo intero', 'pwa.mode.standalone': 'Installata · autonoma',
      'pwa.mode.minimal-ui': 'Installata · minima', 'pwa.mode.browser': 'Nel browser',
      'pwa.k.application': 'Applicazione', 'pwa.k.sw': 'Service worker', 'pwa.k.horsLigne': 'Offline',
      'pwa.k.connexion': 'Connessione', 'pwa.k.donnees': 'Dati locali', 'pwa.k.stockage': 'Spazio del browser',
      'pwa.k.pleinEcran': 'Schermo intero', 'pwa.k.maj': 'Aggiornamento',
      'pwa.pret': 'Pronta · {n} file', 'pwa.indisponible': 'Non disponibile', 'pwa.enLigne': 'Online',
      'pwa.horsLigne': 'Offline', 'pwa.actif': 'Attivo', 'pwa.inactif': 'Inattivo', 'pwa.disponible': 'Disponibile',
      'pwa.aide.ios': 'Per installare: Safari › Condividi › «Aggiungi alla schermata Home».',
      'pwa.aide.menu': 'L’installazione è proposta dal menu del browser («Installa app»).',
      'pwa.aide.https': 'L’installazione richiede una connessione sicura (HTTPS).',
      'pwa.fermer': 'Chiudi', 'pwa.demarrerPE': 'Avvia a schermo intero', 'pwa.demarrerNav': 'Avvia nel browser',
      'pwa.demarrer': 'Avvia', 'pwa.maj': 'Aggiorna l’applicazione', 'pwa.installer': 'Installa l’applicazione',
      'pwa.quitterPE': 'Esci dallo schermo intero', 'pwa.passerPE': 'Passa a schermo intero',
      'pwa.reinit': 'Ripristino', 'pwa.reinitApp': 'Ripristina l’applicazione',
      'pwa.reinitConf': 'Confermare? (cache e aggiornamenti)', 'pwa.effacer': 'Cancella tutto, dati compresi',
      'pwa.effacerConf': 'Confermare? (i dati locali andranno persi)',
      'pwa.reinitAide': 'Il ripristino elimina la cache offline e ricarica l’applicazione; i tuoi dati vengono conservati, tranne con «Cancella tutto».',

      'rg.affichage': 'Schermo', 'rg.pleinEcran': 'Schermo intero',
      'rg.peActif': 'Attivo · tocca per uscire', 'rg.peInactif': 'Disattivato · tocca per attivare',
      'rg.application': 'Applicazione', 'rg.installation': 'Installazione e stato', 'rg.navigateur': 'Nel browser',
      'rg.installee': 'Installata', 'rg.majDispo': ' · aggiornamento disponibile', 'rg.reinit': ' · ripristino',
      'rg.version': 'Versione {v}', 'rg.langue': 'Lingua', 'rg.auto': 'Automatica',
      'rg.autoSous': 'Lingua del dispositivo: {nom}',

      'ec.webgl': 'WebGL non è disponibile su questo dispositivo', 'ec.chargement': 'Caricamento dei pezzi…',
      'ec.introuvables': 'Pezzi non trovati: {err}', 'ec.annuler': '↶ Annulla',
      'ec.vueTrait': '⟲ Vista: segue il tratto', 'ec.vueLibre': '⟲ Vista: libera',
      'ec.nouvelle': 'Nuova partita', 'ec.confirmer': 'Confermare?', 'ec.apparence': '🎨 Aspetto',
      'ec.controle': 'Controllo delle case', 'ec.sons': 'Suoni', 'ec.promotion': 'Promozione del pedone',
      'ec.q': 'Donna', 'ec.r': 'Torre', 'ec.b': 'Alfiere', 'ec.n': 'Cavallo', 'ec.annulerPromo': 'Annulla',
      'ec.jeuPieces': 'Set di pezzi', 'ec.couleurs': 'Colori', 'ec.fermer': 'Chiudi',
      'ec.jeu.echiquierjs': 'echiquierJS', 'ec.jeu.facettes': 'Faccette',
      'ec.theme.bois': 'Legno', 'ec.theme.tournoi': 'Torneo', 'ec.theme.marbre': 'Marmo', 'ec.theme.ocean': 'Oceano',
      'ec.theme.corail': 'Corallo', 'ec.theme.nuit': 'Notte', 'ec.theme.retro': 'Retrò',
      'ec.mat.w': 'Scacco matto: vince il Bianco', 'ec.mat.b': 'Scacco matto: vince il Nero',
      'ec.pat': 'Stallo: patta', 'ec.repetition': 'Patta per ripetizione',
      'ec.materiel': 'Patta: materiale insufficiente', 'ec.cinquante': 'Patta (regola delle 50 mosse)',
      'ec.trait.w': 'Mossa {n} · tocca al Bianco', 'ec.trait.b': 'Mossa {n} · tocca al Nero',
      'ec.traitEchec.w': 'Mossa {n} · tocca al Bianco: scacco!', 'ec.traitEchec.b': 'Mossa {n} · tocca al Nero: scacco!'
    } },

    pt: { nom: 'Português', textes: {
      'app.slogan': 'Xadrez e controle das casas',
      'app.nomComplet': 'PowerChess — xadrez e controle das casas',
      'app.ouvrirImpossible': 'Não foi possível abrir “{id}”: {err}',
      'nav.reglages': 'Configurações',
      'unite.o': 'B', 'unite.ko': 'KB', 'unite.mo': 'MB', 'unite.go': 'GB',

      'pwa.version': 'versão {v}',
      'pwa.sw.nonPris': 'Não suportado', 'pwa.sw.https': 'HTTPS necessário', 'pwa.sw.erreur': 'Erro',
      'pwa.sw.enregistrement': 'Registrando…', 'pwa.sw.inactif': 'Inativo', 'pwa.sw.installation': 'Instalando…',
      'pwa.sw.actif': 'Ativo', 'pwa.sw.actifProchain': 'Ativo (na próxima inicialização)',
      'pwa.mode.fullscreen': 'Instalado · tela cheia', 'pwa.mode.standalone': 'Instalado · autônomo',
      'pwa.mode.minimal-ui': 'Instalado · mínimo', 'pwa.mode.browser': 'No navegador',
      'pwa.k.application': 'Aplicativo', 'pwa.k.sw': 'Service worker', 'pwa.k.horsLigne': 'Offline',
      'pwa.k.connexion': 'Conexão', 'pwa.k.donnees': 'Dados locais', 'pwa.k.stockage': 'Armazenamento do navegador',
      'pwa.k.pleinEcran': 'Tela cheia', 'pwa.k.maj': 'Atualização',
      'pwa.pret': 'Pronto · {n} arquivos', 'pwa.indisponible': 'Indisponível', 'pwa.enLigne': 'On-line',
      'pwa.horsLigne': 'Offline', 'pwa.actif': 'Ativa', 'pwa.inactif': 'Inativa', 'pwa.disponible': 'Disponível',
      'pwa.aide.ios': 'Para instalar: Safari › Compartilhar › “Adicionar à Tela de Início”.',
      'pwa.aide.menu': 'A instalação é oferecida no menu do navegador (“Instalar app”).',
      'pwa.aide.https': 'A instalação requer uma conexão segura (HTTPS).',
      'pwa.fermer': 'Fechar', 'pwa.demarrerPE': 'Iniciar em tela cheia', 'pwa.demarrerNav': 'Iniciar no navegador',
      'pwa.demarrer': 'Iniciar', 'pwa.maj': 'Atualizar o aplicativo', 'pwa.installer': 'Instalar o aplicativo',
      'pwa.quitterPE': 'Sair da tela cheia', 'pwa.passerPE': 'Passar para tela cheia',
      'pwa.reinit': 'Redefinição', 'pwa.reinitApp': 'Redefinir o aplicativo',
      'pwa.reinitConf': 'Confirmar? (cache e atualizações)', 'pwa.effacer': 'Apagar tudo, incluindo os dados',
      'pwa.effacerConf': 'Confirmar? (os dados locais serão perdidos)',
      'pwa.reinitAide': 'A redefinição remove o cache offline e recarrega o aplicativo; seus dados são mantidos, exceto com “Apagar tudo”.',

      'rg.affichage': 'Tela', 'rg.pleinEcran': 'Tela cheia',
      'rg.peActif': 'Ativada · toque para sair', 'rg.peInactif': 'Desativada · toque para ativar',
      'rg.application': 'Aplicativo', 'rg.installation': 'Instalação e status', 'rg.navigateur': 'No navegador',
      'rg.installee': 'Instalado', 'rg.majDispo': ' · atualização disponível', 'rg.reinit': ' · redefinição',
      'rg.version': 'Versão {v}', 'rg.langue': 'Idioma', 'rg.auto': 'Automático',
      'rg.autoSous': 'Idioma do dispositivo: {nom}',

      'ec.webgl': 'WebGL não está disponível neste dispositivo', 'ec.chargement': 'Carregando as peças…',
      'ec.introuvables': 'Peças não encontradas: {err}', 'ec.annuler': '↶ Desfazer',
      'ec.vueTrait': '⟲ Vista: segue a vez', 'ec.vueLibre': '⟲ Vista: livre',
      'ec.nouvelle': 'Nova partida', 'ec.confirmer': 'Confirmar?', 'ec.apparence': '🎨 Aparência',
      'ec.controle': 'Controle das casas', 'ec.sons': 'Sons', 'ec.promotion': 'Promoção do peão',
      'ec.q': 'Dama', 'ec.r': 'Torre', 'ec.b': 'Bispo', 'ec.n': 'Cavalo', 'ec.annulerPromo': 'Cancelar',
      'ec.jeuPieces': 'Conjunto de peças', 'ec.couleurs': 'Cores', 'ec.fermer': 'Fechar',
      'ec.jeu.echiquierjs': 'echiquierJS', 'ec.jeu.facettes': 'Facetas',
      'ec.theme.bois': 'Madeira', 'ec.theme.tournoi': 'Torneio', 'ec.theme.marbre': 'Mármore', 'ec.theme.ocean': 'Oceano',
      'ec.theme.corail': 'Coral', 'ec.theme.nuit': 'Noite', 'ec.theme.retro': 'Retrô',
      'ec.mat.w': 'Xeque-mate: as brancas vencem', 'ec.mat.b': 'Xeque-mate: as pretas vencem',
      'ec.pat': 'Afogamento: empate', 'ec.repetition': 'Empate por repetição',
      'ec.materiel': 'Empate: material insuficiente', 'ec.cinquante': 'Empate (regra dos 50 lances)',
      'ec.trait.w': 'Lance {n} · vez das brancas', 'ec.trait.b': 'Lance {n} · vez das pretas',
      'ec.traitEchec.w': 'Lance {n} · vez das brancas: xeque!', 'ec.traitEchec.b': 'Lance {n} · vez das pretas: xeque!'
    } }
  };

  const CLE = 'langue';            // choix enregistré (préfixé par storage-ns.js), absent = automatique

  // Première langue de l'appareil disponible ici (« pt-BR » → « pt »), sinon l'anglais
  function langueAppareil() {
    const liste = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const l of liste) {
      const code = String(l || '').toLowerCase().split('-')[0];
      if (LANGUES[code]) return code;
    }
    return 'en';
  }

  function choixEnregistre() {
    try { const v = JSON.parse(localStorage.getItem(CLE)); return LANGUES[v] ? v : null; }
    catch (e) { return null; }
  }

  const choix = choixEnregistre();
  const I18N = {
    langues: LANGUES,
    choix,                                     // code choisi, ou null (automatique)
    appareil: langueAppareil(),
    langue: choix || langueAppareil(),

    t(cle, params) {
      const propre = LANGUES[this.langue].textes[cle];
      let s = propre !== undefined ? propre : LANGUES.fr.textes[cle];
      if (s === undefined) { console.warn('Texte sans traduction :', cle); return cle; }
      if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => params[k] !== undefined ? params[k] : m);
      return s;
    },

    nombre(v, decimales = 0) {
      try { return new Intl.NumberFormat(this.langue, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(v); }
      catch (e) { return v.toFixed(decimales); }
    },

    // code : une clé de LANGUES, ou null pour suivre la langue de l'appareil. Recharge l'application.
    choisir(code) {
      try {
        if (code && LANGUES[code]) localStorage.setItem(CLE, JSON.stringify(code));
        else localStorage.removeItem(CLE);
      } catch (e) {}
      location.reload();
    }
  };

  document.documentElement.lang = I18N.langue;
  self.I18N = I18N;
  self.tr = (cle, params) => I18N.t(cle, params);
})();
