from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Utilisateur
from app.schemas import UtilisateurCreate


def normalize_user_name(nom: str) -> str:
    return " ".join(nom.strip().split())


def connect_utilisateur(db: Session, utilisateur_data: UtilisateurCreate) -> Utilisateur:
    nom = normalize_user_name(utilisateur_data.nom)

    # "malek" et "Malek" designent la meme personne.
    utilisateur = db.scalars(
        select(Utilisateur)
        .where(func.lower(Utilisateur.nom) == nom.lower())
        .order_by(Utilisateur.id)
    ).first()
    if utilisateur is None:
        utilisateur = Utilisateur(nom=nom, role="controleur")
        db.add(utilisateur)

    db.commit()
    db.refresh(utilisateur)
    return utilisateur


def list_utilisateurs(db: Session) -> list[Utilisateur]:
    return list(db.scalars(select(Utilisateur).order_by(Utilisateur.nom)).all())
