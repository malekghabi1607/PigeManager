# PigeManager / PigeControl

Application de suivi des piges : coffrets, quantités manquantes, historique des contrôles et lots de commande exportables en Excel/PDF.

## Lancement sous Windows

Depuis la racine du projet, dans deux terminaux PowerShell :

```powershell
cd backend
.\.venv-win\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Interface : http://127.0.0.1:5173

Documentation API : http://127.0.0.1:8000/docs

Arrêt : `Ctrl+C` dans chaque terminal. Si les serveurs sont déjà actifs en arrière-plan, les arrêter avant de les relancer.

Pour installer les dépendances sur une nouvelle machine, depuis la racine :

```powershell
python -m venv backend/.venv-win
backend/.venv-win/Scripts/python.exe -m pip install -r backend/requirements.txt
cd frontend
npm.cmd ci
```

Le dossier `backend/.venv` fourni provient d'un environnement Unix ; l'environnement Windows utilise `.venv-win`.

## Architecture et fonctionnement

- `frontend/src/App.tsx` : navigation React entre connexion, accueil, coffret, besoins et historique.
- `frontend/src/services/api.ts` : appels HTTP vers le port 8000 du même hôte. `VITE_API_BASE_URL` permet de modifier cette adresse à la compilation ou au démarrage de Vite.
- `frontend/src/hooks/useDebouncedSave.ts` : sauvegarde après 500 ms sans nouveau clic et mise en file des sauvegardes par pige.
- `backend/app/api/routes.py` : routes FastAPI et validation des entrées par les schémas Pydantic.
- `backend/app/services` : contrôles, calcul des besoins, utilisateurs, historique et exports.
- `backend/app/models` et `database.py` : modèles SQLAlchemy et accès SQLite.
- `backend/app/core` : configuration, journalisation, erreurs HTTP et calcul des statuts.

La base persistante est `backend/pigecontrol.db`. Le démarrage crée les tables absentes. Il n'effectue pas de migration des tables existantes.

Un contrôle ajoute une entrée à l'historique. Le dernier contrôle de chaque pige détermine son état courant. Les besoins déduisent les quantités déjà exportées depuis la dernière remise à zéro. Créer un lot d'export enregistre donc des quantités considérées comme commandées ; télécharger à nouveau un lot existant ne crée pas de commande supplémentaire.

`import_excel.py` importe des coffrets depuis un classeur. `seed_visible_data.py` peuple les coffrets prédéfinis et réécrit leurs quantités initiales et positions : ne pas l'exécuter simplement pour démarrer une base déjà remplie.

## Vérifications du 29 septembre 2026

- Installation Windows : Python 3.14.7 et Node 24.21.0.
- `npm.cmd run build` et `npm.cmd run lint` : réussis.
- Interface, santé API, coffrets, besoins, historique et exports : réponses HTTP 200.
- Lecture des 27 coffrets et de leurs 1 827 piges : réussie.
- Base existante : 50 contrôles, 2 lots d'export, aucun besoin restant à commander.
- Téléchargement Excel et PDF d'un lot existant : réussi.
- En-tête CORS vérifié pour l'interface locale.

Ces vérifications n'incluent pas de parcours interactif dans un navigateur ni de création de contrôles dans la base existante.

## Points relevés à la lecture du code

- La connexion identifie un nom sans mot de passe ni session authentifiée côté serveur ; les routes ne contrôlent pas de droits d'accès.
- Les versions Python ne sont pas figées dans `requirements.txt`, ce qui rend les installations futures moins reproductibles.
- Au départ de la page coffret, les sauvegardes restantes sont envoyées directement, sans rejoindre la file des requêtes déjà en cours. Une modification récente peut donc être dépassée par une requête précédente ; la fermeture de l'onglet ne garantit pas non plus la fin de ces envois.
- La création des lots calcule les besoins puis enregistre les lignes sans mécanisme explicite empêchant deux exports simultanés des mêmes besoins.
- Aucun ensemble de tests automatisés propre au projet n'a été trouvé dans les sources inspectées.
