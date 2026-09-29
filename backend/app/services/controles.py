from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.status import compute_controle_status
from app.core.errors import not_found
from app.models import Controle, Pige, Utilisateur
from app.schemas import ControleCreate


def save_controle(db: Session, controle_data: ControleCreate) -> Controle:
    pige = db.get(Pige, controle_data.pige_id)
    if pige is None:
        raise not_found("Pige introuvable")

    utilisateur = db.get(Utilisateur, controle_data.utilisateur_id)
    if utilisateur is None:
        raise not_found("Utilisateur introuvable")

    controle = Controle(
        pige_id=controle_data.pige_id,
        utilisateur_id=utilisateur.id,
        statut=compute_controle_status(
            controle_data.quantite_manquante,
            pige.quantite_initiale,
        ).value,
        quantite_manquante=controle_data.quantite_manquante,
        date=datetime.now(timezone.utc),
    )
    db.add(controle)
    db.commit()
    db.refresh(controle)
    return controle
