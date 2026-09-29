from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import not_found
from app.core.status import ControleStatut
from app.models import Controle, Utilisateur
from app.schemas import ResetRead


def _piges_a_remettre(db: Session) -> list[tuple[int, int]]:
    """(pige_id, quantite_manquante) des piges dont le dernier controle est superieur a 0."""
    derniers = (
        select(func.max(Controle.id).label("controle_id"))
        .group_by(Controle.pige_id)
        .subquery()
    )
    statement = (
        select(Controle.pige_id, Controle.quantite_manquante)
        .join(derniers, Controle.id == derniers.c.controle_id)
        .where(Controle.quantite_manquante > 0)
    )
    return [(row.pige_id, row.quantite_manquante) for row in db.execute(statement)]


def get_reset_apercu(db: Session) -> ResetRead:
    piges = _piges_a_remettre(db)
    return ResetRead(piges=len(piges), pieces=sum(quantite for _, quantite in piges))


def reset_piges(db: Session, utilisateur_id: int) -> ResetRead:
    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise not_found("Utilisateur introuvable")

    piges = _piges_a_remettre(db)
    # Un controle a 0 par pige : l'historique est garde et, comme pour une remise
    # a 0 manuelle, les exports anterieurs ne sont plus deduits des besoins.
    date = datetime.now(timezone.utc)
    db.add_all(
        Controle(
            pige_id=pige_id,
            utilisateur_id=utilisateur.id,
            statut=ControleStatut.PRESENTE.value,
            quantite_manquante=0,
            date=date,
        )
        for pige_id, _ in piges
    )
    db.commit()
    return ResetRead(piges=len(piges), pieces=sum(quantite for _, quantite in piges))
