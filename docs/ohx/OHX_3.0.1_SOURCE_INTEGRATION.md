# OHX 3.0.1 — intégration source

Cette branche intègre directement le correctif OHX 3.0.1 dans les sources Open Historia actuelles.

## Corrections

- Le runtime OHX est en lecture seule vis-à-vis du monde canonique.
- Aucun appel à `writeWorldState` depuis le runtime OHX.
- Aucune création synthétique de `interactiveOffer`.
- Un moment ne peut être lancé que si le moteur interactif natif l'offre réellement.
- Le boot OHX est différé de 1200 ms pour éviter la concurrence avec le démarrage, la carte et les premières entrées.
- Les événements `oh:world-updated`, `oh:game-updated`, `oh:runtime-json-updated` et `oh:active-game-changed` alimentent l'état dérivé.
- Les écritures de chat sont explicitement isolées.
- Les listeners sont tous nettoyés à la destruction.
- La Situation Room utilise un Shadow DOM et expose les erreurs via une alerte accessible.
- L'état OHX est dérivé en mémoire et reste déterministe.

## Vérifications

Les tests unitaires OHX sont dans `src/runtime/ohxExpansionEngine.test.js` et `src/runtime/ohxExpansion.test.js`. Les audits de non-régression sont dans `scripts/ohx/`.

## Android

Le workflow `.github/workflows/build-ohx-android.yml` construit la branche courante, exécute les tests et le lint, applique une identité Android OHX séparée, assemble l'APK et publie un artefact accompagné de son SHA-256 (Secure Hash Algorithm 256 bits).
