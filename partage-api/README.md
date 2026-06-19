# API de partage de l'horaire USI

API FastAPI destinée à être placée entre la PWA et PostgreSQL. La base de
données n'est jamais appelée directement par le navigateur.

## Variables Render obligatoires

- `DATABASE_URL`: fournie automatiquement par Render Postgres;
- `JWT_SECRET`: valeur aléatoire générée par Render;
- `ALLOWED_ORIGINS`: adresse HTTPS exacte du frontend Render;
- `ADMIN_CODE`: `GLEB`;
- `ADMIN_NAME`: `Guillaume Leblanc`;
- `ADMIN_EMAIL`: courriel initial de l'administrateur;
- `ADMIN_INITIAL_PASSWORD`: mot de passe initial robuste.

Au premier démarrage, l'API crée les tables et le compte administrateur. Le mot
de passe n'est enregistré que sous forme de dérivé `PBKDF2-SHA256` salé.

## Routes initiales

- `GET /health`: état du service;
- `POST /api/auth/login`: ouverture de session;
- `GET /api/me`: utilisateur connecté;
- `GET /api/users`: utilisateurs actifs;
- `POST /api/admin/users`: création et modification des comptes;
- `GET /api/schedules?year=2026`: horaire partagé;
- `POST /api/admin/schedules/{year}`: publication d'un horaire annuel;
- `GET|POST /api/swaps`: demandes d'échange;
- `POST /api/admin/swaps/direct`: échange administratif immédiat;
- `POST /api/swaps/{id}/decision`: acceptation ou refus;
- `GET /api/audit`: journal réservé à l'administrateur.

La documentation interactive est disponible à `/docs` sur le service Render.
Le frontend de production autorisé est
`https://gestion-horaire-usi-hej.onrender.com`. Les valeurs secrètes demeurent
uniquement dans les variables d'environnement Render.
