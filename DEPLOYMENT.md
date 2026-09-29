# Hebergement gratuit : Render + Neon

Le Dockerfile compile React puis sert l'interface et FastAPI sur une seule adresse HTTPS. Les appels API utilisent la meme adresse : aucun port 8000 a ouvrir sur le telephone.

## Activation

1. Creer un compte sur https://neon.com et un projet sur le plan **Free**. Copier l'URL PostgreSQL depuis **Connect**, avec `sslmode=require`.
2. Se connecter a https://render.com avec GitHub et autoriser le depot `malekghabi1607/PigeManager`.
3. Choisir **New > Blueprint**, selectionner ce depot et sa branche `main`. Le fichier `render.yaml` demande explicitement le plan **free**.
4. Renseigner `DATABASE_URL` avec l'URL Neon dans le formulaire Render. Cette URL contient un mot de passe : ne pas la mettre dans GitHub ni dans le frontend.
5. Apres le deploiement, ouvrir l'adresse HTTPS indiquee par Render. Elle fonctionne depuis un telephone sans laisser le PC allume.

L'application actuelle identifie les utilisateurs par leur nom sans authentification. Une instance publiee est donc accessible et modifiable par les visiteurs qui connaissent son URL. Ajouter un controle d'acces avant d'y placer des donnees privees.

## Donnees

La base SQLite locale n'est pas incluse dans GitHub ni dans l'image Docker. La premiere base Neon sera vide : les donnees locales ne sont pas transferees automatiquement.

Pour initialiser uniquement le catalogue predefini des coffrets et piges, depuis un terminal local dans `backend`, definir temporairement `DATABASE_URL` avec l'URL Neon puis executer :

```powershell
.\.venv-win\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-win\Scripts\python.exe seed_visible_data.py
```

Ne faire cette initialisation que pour une nouvelle base. Le script met aussi a jour les positions et quantites initiales existantes. Pour conserver les controles, utilisateurs et exports du PC, une migration distincte est necessaire.

Sans `DATABASE_URL`, le developpement local continue a utiliser SQLite. Pour revenir au stockage local dans PowerShell : `Remove-Item Env:DATABASE_URL`.

## Limites des offres gratuites

- Render peut mettre le service en veille apres inactivite ; son reveil ralentit la premiere visite.
- Le disque Render gratuit est temporaire : c'est pourquoi les donnees sont stockees dans Neon.
- Neon impose des quotas au plan gratuit. Verifier les offres au moment de l'inscription et conserver les plans Free.
- Le PostgreSQL gratuit de Render expire apres 30 jours ; ne pas le substituer a Neon pour ce montage.

Sources : https://render.com/docs/free et https://neon.com/docs/introduction/plans
