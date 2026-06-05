# GEP PV Platform — Green Energy Park Benguerir

Plateforme web de monitoring de 4 systèmes photovoltaïques du Green Energy Park (GEP) à Benguerir, Maroc.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React + Leaflet.js + Recharts |
| Backend | Django REST Framework + JWT |
| Base de données | PostgreSQL |
| Géospatial | Rasterio (GeoTIFF → PNG) |
| Infra | Docker + docker-compose |

## Lancer le projet

### Prérequis

- Docker Desktop installé et démarré
- Fichier `plant_orthomap.tif` placé dans le dossier `data/`
- Les fichiers CSV placés dans le dossier `data/` (optionnel — des données simulées sont générées automatiquement si absents)

### Démarrage en une commande

```bash
docker-compose up --build
```

Accès :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000/api

### Lancement en développement local (sans Docker)

**Backend :**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
python manage.py runserver
```

**Frontend :**
```bash
cd frontend
npm install
npm start
```

### Identifiants par défaut

```
Email    : admin@gep.ma
Password : Admin1234
```

## Structure du projet

```
gep-pv-platform/
├── frontend/              # React application
│   ├── src/
│   │   ├── api/           # Appels axios
│   │   ├── components/    # Navbar, SystemCard, PrivateRoute
│   │   ├── context/       # AuthContext JWT
│   │   └── pages/         # Login, Dashboard, MapPage, SystemDetail
│   └── Dockerfile
├── backend/               # Django REST API
│   ├── api/
│   │   ├── models.py      # PVSystem, Module, Inverter, DC/ACProduction
│   │   ├── views.py       # Endpoints REST + traitement GeoTIFF
│   │   ├── urls.py
│   │   └── management/commands/seed_data.py
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   └── Dockerfile
├── data/                  # Données non versionnées (CSV + GeoTIFF)
│   └── README.md
├── docker-compose.yml
└── README.md
```

## Fonctionnalités

- **Login sécurisé** — Authentification JWT avec token valide 24h
- **Dashboard** — 4 cartes système avec informations statiques et données live (puissance AC, énergie journalière)
- **Carte interactive** — Leaflet.js avec 3 fonds de carte (OpenStreetMap, Satellite Esri, Terrain)
- **Orthomosaïque RGB** — Photo drone GeoTIFF correctement géoréférencée sur la carte
- **Couche thermique** — Simulée depuis les bandes RGB avec palette Inferno (violet → rouge → jaune)
- **Page détail** — Graphiques Recharts pour DC/AC power, tension, courant, irradiance avec sélecteur de période

## API Endpoints

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/token/ | Non | Login — retourne access + refresh token |
| POST | /api/token/refresh/ | Non | Renouveler le token |
| GET | /api/systems/ | Oui | Liste des 4 systèmes avec données live |
| GET | /api/systems/:id/?days=7 | Oui | Mesures horaires d'un système |
| GET | /api/orthomap/rgb/ | Oui | GeoTIFF converti en PNG RGB léger |
| GET | /api/orthomap/thermal/ | Oui | GeoTIFF converti en PNG thermique |

## Modèle de données

| Table | Description |
|---|---|
| PVSystem | 4 systèmes — nom, capacité, coordonnées, inclinaison |
| Module | Panneaux PV — marque, modèle, technologie, puissance |
| Inverter | Onduleurs — marque, modèle, puissance AC, MPPT |
| DCProduction | Mesures horaires DC — puissance, tension, courant, irradiance |
| ACProduction | Mesures horaires AC — puissance, énergie, tension, fréquence |

## Hypothèses et décisions techniques

- **GeoTIFF traité côté serveur** — Le fichier fait 196 Mo, traitement JavaScript impossible sans crasher le navigateur. Rasterio (Python) convertit le GeoTIFF en PNG léger (max 1000px) côté backend.
- **Couche thermique simulée** — Formule : `T = 1 - (0.3×R + 0.59×G + 0.11×B)` normalisé entre 0 et 1, puis appliqué à la palette Inferno en 8 stops.
- **Géoréférencement WGS84** — Les coordonnées du GeoTIFF (projection UTM) sont converties en WGS84 via `rasterio.warp.transform_bounds` pour un positionnement correct sur Leaflet.
- **ForeignKey au lieu de OneToOneField** — Les onduleurs sont en relation ManyToOne avec les systèmes (SYS-001 a 2 onduleurs, SYS-003 a 2 onduleurs).
- **Données CSV réelles** — Les 5 fichiers CSV fournis avec l'exercice sont chargés via `python manage.py seed_data`. Si absents, des données simulées sont générées automatiquement sur 30 jours.

## Critères d'évaluation couverts

| Critère | Implémentation |
|---|---|
| Architecture | Frontend / Backend / DB séparés, composants réutilisables |
| Map & Raster | GeoTIFF correct, toggle thermique, 3 fonds de carte |
| Data pipeline | Ingestion CSV réelle, requêtes time-series optimisées |
| UI/UX | Design responsive, états de chargement, graphiques lisibles |
| Code quality | Structure claire, séparation des responsabilités |
| DevOps | Docker Compose fonctionnel, README complet |

## Contact

Projet réalisé dans le cadre de l'exercice technique Full-Stack Developer — Green Energy Park.