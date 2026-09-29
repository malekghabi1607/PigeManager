# PigeManager

**Gestion des coffrets de piges et suivi du réapprovisionnement.**

PigeManager permet de consulter les coffrets, de repérer les pièces manquantes et de préparer les commandes depuis une interface accessible sur ordinateur, tablette et téléphone.

[Ouvrir l’application](https://pigemanager.onrender.com)

## Fonctionnalités principales

### Gestion des coffrets

Les coffrets sont présentés sous forme de cartes avec leur nom et leur nombre de pièces. Un clic ouvre la grille des piges correspondantes.

La recherche accepte un nom, une dimension ou une plage de dimensions, par exemple : `12,34`, `12.34` ou `1 à 2`.

Il est également possible d’ajouter un coffret en indiquant sa plage de dimensions. Les piges sont alors générées automatiquement au pas de **0,01**.

### Suivi des pièces manquantes

Les quantités se modifient directement dans la grille du coffret. Les changements sont enregistrés automatiquement et les indicateurs visuels permettent de repérer les piges concernées.

### Préparation des commandes

La page **Besoins** rassemble les pièces à commander et regroupe les quantités par code de pige. Les commandes peuvent être exportées en **Excel** ou en **PDF**.

Les lots précédents restent consultables et peuvent être téléchargés à nouveau.

### Historique des contrôles

L’historique permet de retrouver les contrôles enregistrés, leur date, le nom renseigné par l’utilisateur et les quantités concernées.

## Utilisation

1. Saisir son nom pour accéder à l’application.
2. Rechercher un coffret et cliquer sur sa carte.
3. Renseigner les quantités manquantes et attendre la fin de la sauvegarde.
4. Ouvrir **Besoins** pour consulter les pièces à commander.
5. Exporter la commande au format souhaité.

## À savoir

- Créer un export enregistre les pièces comme commandées et les déduit des besoins suivants. Retélécharger un export existant ne crée pas une nouvelle commande.
- La remise à zéro demande une confirmation et conserve l’historique. Pour les piges remises à zéro, les anciennes commandes ne sont plus déduites des futurs besoins.
- Un coffret déjà associé à des contrôles ou à des exports ne peut pas être supprimé, afin de préserver l’historique.
- Le nom saisi sert à identifier les contrôles ; il ne constitue pas une connexion protégée par mot de passe.
