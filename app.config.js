// app.config.js — identité et version de l'application, en un seul endroit.
// Chargé par la page (window) ET par le service worker (importScripts) : `self` désigne l'un ou l'autre.
//
// Pour publier une nouvelle version : incrémenter `version`. Le service worker change alors de cache,
// l'écran d'accueil propose « Mettre à jour l'application » et l'ancien cache est supprimé à l'activation.
self.APP = Object.freeze({
  name: 'PowerChess',                       // nom court (écran d'accueil, titre)
  fullName: 'PowerChess — échecs et contrôle des cases',
  tagline: 'Échecs et contrôle des cases',
  version: 'v5',                            // ← à incrémenter à chaque publication
  prefix: 'powerchess',                     // préfixe des données locales (« powerchess: ») et des caches (« powerchess-v1 »)
  startTab: 'echecs'                        // onglet ouvert au premier lancement
});
