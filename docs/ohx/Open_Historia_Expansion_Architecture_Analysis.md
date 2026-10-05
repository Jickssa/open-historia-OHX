# Open Historia Android — analyse d'architecture et plan d'extension

## 1. Base étudiée

Analyse fondée sur le dépôt public `Open-Historia/open-historia`, branche `main`, commit `0eec087ce7bad0ec39937c33743a147d82477d94` du 30 septembre 2026, ainsi que sur la documentation Android et les release metadata publiques.

L'APK Android stable actuellement publié est le Build 17. Le dépôt explique que l'application Android est le client React/Vite du jeu empaqueté dans une WebView Capacitor, avec les mêmes systèmes de jeu que les autres variantes, et non un moteur Android natif séparé.

## 2. Architecture réelle

```text
Android APK
└── Capacitor 7 / WebView
    ├── bundle React 19 + Vite
    ├── MapLibre + PMTiles
    ├── UI du jeu
    ├── moteur de jeu client
    │   ├── gameState / worldState
    │   ├── sauts temporels
    │   ├── événements
    │   ├── storylines
    │   ├── projets
    │   ├── diplomatie / accords / guerres
    │   ├── espionnage
    │   ├── rapports
    │   ├── unités
    │   └── scènes interactives
    ├── IndexedDB / backend web local
    ├── map data embarquée
    └── bridge natif Android
        ├── HTTP natif pour certains endpoints IA
        ├── gestion fichiers
        ├── pause arrière-plan
        └── reprise du renderer
```

Point architectural majeur : `src/` constitue le véritable cœur réutilisable. L'APK n'est donc pas seulement un contenant graphique ; on peut enrichir le comportement du jeu par du code JavaScript/React empaqueté dans le bundle Android.

## 3. Rouage de simulation

Le moteur possède déjà une séparation importante entre :

- `game.json` : état joueur / date / tour / difficulté ;
- `world.json` : état mutable de simulation ;
- `events.json` : chronologie ;
- `chat`, `advisor`, `actions`, `reports`, etc. : couches spécialisées ;
- géométrie et assets cartographiques : couche visuelle séparée.

Le saut temporel est particulièrement important : l'IA produit un paquet structuré d'événements et d'impacts, le moteur valide/salvage les données, puis applique les changements au monde. Des directeurs natifs contrôlent désormais les registres diplomatiques, les guerres, les storylines, les projets et certaines contraintes territoriales.

Cela donne une propriété essentielle pour les extensions : il vaut mieux ajouter des systèmes qui dérivent des données existantes, ou qui appellent les mêmes points d'application, plutôt que de créer un second moteur de simulation.

## 4. Système interactif actuel

Le jeu possède déjà un mécanisme très intéressant : un événement issu d'un saut peut devenir une scène jouable.

Fonctionnement actuel :

1. un saut produit des événements ;
2. les événements sont filtrés ;
3. un événement peut être offert comme `interactiveOffer` ;
4. le joueur choisit de jouer la scène ou de la laisser passer ;
5. la scène d'ouverture reçoit 2 à 5 choix ;
6. chaque choix produit une nouvelle réponse IA ;
7. chaque séquence est enregistrée et peut être reprise jusqu'à certains points ;
8. la scène résolue revient dans la chronologie normale.

Le code actuel rend cependant ces offres volontairement rares : environ une chance sur trois et un cooldown de trois tours.

## 5. Pourquoi ne pas modifier directement ce cooldown dans l'extension

Le modifier de façon brutale aurait deux inconvénients :

- surcharge narrative et consommation IA ;
- rupture de la philosophie actuelle du moteur, qui veut éviter de transformer tous les sauts en cinématiques.

L'extension ci-jointe adopte donc une meilleure séparation : elle crée un **deck de moments jouables supplémentaires** à partir des événements déjà générés et laisse le moteur interactif officiel produire la scène lorsqu'un joueur choisit réellement de la jouer.

## 6. Extension réalisée

### Situation Room

Un HUD mobile autonome fournit un centre de situation indépendant de l'interface existante.

### World Dynamics

Huit indicateurs sont dérivés de l'état réel du monde :

- risque systémique ;
- tension diplomatique ;
- stress des marchés ;
- pression sanitaire ;
- contrainte logistique ;
- bruit informationnel ;
- confiance institutionnelle ;
- résilience.

Ces nombres ne sont pas présentés comme des vérités physiques : ce sont des indicateurs de gameplay déterministes, calculés à partir des données déjà présentes.

### Crisis Radar

Les événements majeurs du dernier mouvement deviennent des signaux classés par gravité et domaine.

### Actor Network

Le module consolide les acteurs déjà connus par les relations, accords, guerres et réputations.

### Persistent Threads

Les storylines actives sont rendues lisibles avec pression, momentum, participants et prochaine date de revue.

### Commitments

Les accords en vigueur deviennent visibles sans créer un nouveau registre parallèle.

### Interactive Moments Deck

Jusqu'à cinq événements éligibles récents peuvent être lancés manuellement comme scènes interactives supplémentaires.

Le lancement :

```text
événement déjà présent
        ↓
OHX deck
        ↓
interactiveOffer temporaire
        ↓
createInteractive() natif
        ↓
scène officielle Open Historia
        ↓
réponse IA
        ↓
chronologie normale
```

Aucun second système de scène n'est créé.

## 7. Ce que cette première extension permet architecturalement

Elle constitue une couche de sur-structure et non un fork du moteur. Elle montre qu'il est possible d'ajouter des fonctionnalités profondes à partir des registres existants :

```text
Storylines ─┐
Projects ───┤
Relations ──┤
Wars ───────┤
Reports ────┤→ Situation model → UI → player decisions
Events ─────┤                         ↓
Spies ──────┤                    interactive scene
Stats ──────┘                         ↓
                                     events
```

## 8. Ajouts majeurs à développer en phase suivante

Ces briques sont les plus intéressantes compte tenu de l'architecture déjà existante.

### A. Conseil de crise

Une crise ne serait plus seulement un texte : elle ouvrirait une cellule de décision avec urgence, acteurs, informations connues / inconnues, options disponibles et conséquences différées.

### B. Chaînes de conséquences

Chaque décision importante pourrait créer une chaîne visible :

`décision → réaction → contre-réaction → conséquence secondaire → nouvelle opportunité`.

Les storylines existantes peuvent devenir la mémoire de ces chaînes.

### C. Réseau institutionnel

Le jeu peut représenter plus clairement les ministères, agences, entreprises, ONG, organisations internationales et groupes de pression comme acteurs non territoriaux.

### D. Marchés et systèmes économiques

Une couche de flux dérivée des événements et projets pourrait suivre : capacité, pénurie, prix relatifs, dépendance, goulots logistiques, exposition commerciale et résilience.

### E. Personnages dirigeants

Un personnage persistant pourrait porter : tempérament narratif, priorités, relations personnelles, tolérance au risque, crises traversées et mémoire des décisions du joueur.

### F. Dossiers secrets

Les rapports, l'espionnage et les storylines permettraient un système de dossiers révélables : information fiable, information douteuse, source, date, biais, interception, confirmation.

### G. Économie politique interne

Au lieu que le joueur incarne uniquement l'État abstrait, ses décisions pourraient être négociées entre plusieurs pôles internes avec objectifs divergents.

### H. Mémoire longue

Les décisions importantes devraient revenir des mois ou années plus tard : traités oubliés, promesses, scandales, anciens partenaires, investissements, sanctions, conflits de compétence.

## 9. Limites du patch réalisé ici

Le code d'extension peut être livré et vérifié source par source, mais cet environnement ne dispose ni du SDK Android complet ni de l'APK de base sous forme de fichier exploitable localement, et il ne possède pas la clé de signature officielle du projet.

Cela empêche ici la production honnête d'un APK final signé et installable comme mise à jour de la version officielle.

Une installation Android « par-dessus » le build officiel dépend en outre de la conservation de la même identité de paquet et surtout de la même clé de signature. Le projet documente explicitement cette contrainte.

Le résultat produit ici est donc le niveau immédiatement réalisable : **patch source, diff d'application, architecture documentée, contrôles de syntaxe et test fonctionnel synthétique du noyau d'extension**.

## 10. Vérifications réalisées

- syntaxe JavaScript des trois nouveaux modules : OK ;
- application du diff sur une copie de la structure de base : OK ;
- test synthétique de génération d'acteurs + deck interactif + indicateurs : OK ;
- aucune modification des schémas de saut existants ;
- aucun changement nécessaire dans `interactiveOffer.js` ;
- pas de nouvelle dépendance npm ;
- pas de nouveau backend serveur obligatoire ;
- données supplémentaires regroupées sous `world.ohx`.
