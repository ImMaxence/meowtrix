# Meowtrix

Un site plein écran pour faire jouer les chats : un lézard 3D (Three.js) qui se promène, se fige,
hoche la tête, sort la langue et détale quand une patte le touche. Les sons sont synthétisés en
direct (Web Audio API) et, si on l'autorise, le micro le fait sursauter aux bruits de la pièce.

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérifie les types et produit dist/
```

## Docker

```bash
# Test local sur http://localhost:8787
docker compose -f docker-compose.yml -f compose.local.yml up --build
```

Sur Coolify : ressource **Docker Compose** pointant sur ce dépôt (`docker-compose.yml`), domaine
`https://meowtrix.mbonnici.fr` sur le service `meowtrix` (port 80). Le HTTPS est nécessaire pour le micro.

## Structure

| Dossier | Rôle |
| --- | --- |
| `src/game/lizard/` | Modèle procédural (corps, pattes en IK, peau), démarche et animations |
| `src/game/brain.ts` | Comportement : errance, alerte, fuite, cachette hors écran |
| `src/game/world.ts` | Scène, caméra, lumière, sol |
| `src/audio/` | Sons synthétisés et écoute du micro |
| `public/` | Manifeste PWA, service worker, icônes (`npm run icons` pour les régénérer) |
