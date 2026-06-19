# Application de partage de l'horaire USI

Application distincte du logiciel de génération. Cette PWA consulte l'horaire
partagé, les comptes et les demandes d'échange par l'API FastAPI déployée sur
Render.

## Démarrage local

Double-cliquer `start_partage.command`, puis ouvrir :

`http://127.0.0.1:8080/index.html`

## Déploiement du frontend sur Render

Le dépôt contient un Blueprint `render.yaml` à sa racine. Il publie directement
le dossier `partage-horaire` comme site statique; aucune commande de compilation
n'est nécessaire.

1. Placer le projet dans un dépôt GitHub, GitLab ou Bitbucket privé.
2. Dans Render, choisir `New > Blueprint` et connecter ce dépôt.
3. Sélectionner le fichier `render.yaml`, puis créer le service proposé.
4. Ouvrir l'adresse HTTPS `onrender.com` attribuée par Render.

Render redéploiera automatiquement le frontend à chaque changement poussé sur
la branche connectée. L'adresse de l'API est définie dans `api-client.js`.

## Transfert depuis le générateur

1. Utiliser le fichier Excel annuel corrigé manuellement comme source officielle.
2. Dans cette application, utiliser `Importer Excel ou CSV`.
3. Choisir un fichier `.xlsx`, `.xls` ou `.csv`.

L'import reconnaît le tableau Excel large produit par le générateur ainsi que
le format détaillé du CSV. Dans les cellules Excel, un intensiviste peut être
indiqué par son code, son nom complet ou sous la forme `CODE - Nom complet`.
Les dates Excel et les cellules marquées `VACANT` ou `HDQ` sont également
reconnues. Ces cellules demeurent visibles dans la grille, mais ne sont pas
échangeables.

L'application génère ensuite automatiquement une liste de garde quotidienne
pour chaque semaine de l'horaire annuel. Chaque grille contient les colonnes du
lundi au dimanche et les lignes `Garde de JOUR`, `Garde de NUIT`,
`2e garde de nuit`, `Unité A-B`, `Unité C-D` et `UGB`.

Le modèle quotidien actuel reproduit le patron fourni dans la capture d'écran à
partir des affectations hebdomadaires `USI AB`, `USI CD`, `USI UGB` et
`USI nuits`. Chaque cellule journalière peut servir de point de départ à une
demande d'échange.

Règle générale appliquée :

- garde de jour : alternance `USI AB / USI CD`, en commençant et terminant par `USI AB`;
- garde de nuit : `USI nuits` du lundi au jeudi, puis `USI UGB` du vendredi au dimanche;
- deuxième garde de nuit : alternance `USI AB / USI CD`, en commençant et terminant par `USI AB`;
- unités A-B et C-D : affectations hebdomadaires correspondantes tous les jours;
- UGB : `USI UGB` du lundi au vendredi, `USI CD` le samedi et `USI AB` le dimanche.

Exception lorsque Alexis Turgeon est affecté à `USI AB` :

- garde de jour : Alexis Turgeon les lundi, mercredi, vendredi et dimanche;
- garde de nuit : Alexis Turgeon les lundi et mercredi, `USI nuits` les mardi
  et jeudi, puis `USI UGB` du vendredi au dimanche;
- deuxième garde de nuit : `USI CD` du lundi au jeudi, Alexis Turgeon le
  vendredi et dimanche, puis `USI CD` le samedi;
- unités A-B et C-D ainsi que la ligne UGB : même structure que la règle
  générale.

L'exception applicable lorsqu'Alexis Turgeon est affecté à `USI CD` sera
ajoutée séparément dès que son patron sera fourni.

Deux niveaux d'échange sont disponibles :

- une garde quotidienne individuelle;
- toutes les tâches attribuées à un intensiviste pendant une semaine.

## Politique de notification retenue

- notification poussée immédiate sur iPhone et Android;
- courriel institutionnel envoyé avec chaque demande;
- rappel automatique après 48 heures si la demande est toujours sans réponse.

L'interface affiche encore ces événements à titre indicatif. Leur transmission
réelle exige un fournisseur de courriel, l'inscription de chaque appareil aux
notifications et un traitement planifié côté serveur.

## État du branchement serveur

- connexion obligatoire avec session signée par l'API;
- identité et rôle fournis par le serveur;
- utilisateurs, horaires, échanges et audit conservés dans PostgreSQL;
- import annuel réservé à l'administrateur et publié dans PostgreSQL;
- approbations et échanges validés côté serveur;
- PDF des fêtes/HSFA et paramètres de notification encore conservés localement.
