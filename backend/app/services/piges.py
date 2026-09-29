from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.status import compute_controle_status
from app.models import Controle, Pige
from app.schemas import PigeRead


def get_piges_for_coffret(db: Session, coffret_id: int) -> list[PigeRead]:
    latest_control_ids = (
        select(
            Controle.pige_id.label("pige_id"),
            func.max(Controle.id).label("controle_id"),
        )
        .group_by(Controle.pige_id)
        .subquery()
    )
    latest_controls = (
        select(
            Controle.pige_id.label("pige_id"),
            Controle.quantite_manquante.label("quantite_manquante"),
        )
        .join(
            latest_control_ids,
            (latest_control_ids.c.pige_id == Controle.pige_id)
            & (latest_control_ids.c.controle_id == Controle.id),
        )
        .subquery()
    )
    statement = (
        select(Pige, func.coalesce(latest_controls.c.quantite_manquante, 0))
        .outerjoin(latest_controls, latest_controls.c.pige_id == Pige.id)
        .where(Pige.coffret_id == coffret_id)
        .order_by(Pige.position_ligne, Pige.position_colonne)
    )

    return [
        PigeRead(
            id=pige.id,
            coffret_id=pige.coffret_id,
            code=pige.code,
            quantite_initiale=pige.quantite_initiale,
            quantite_manquante=quantite_manquante,
            statut=compute_controle_status(quantite_manquante, pige.quantite_initiale).value,
            position_ligne=pige.position_ligne,
            position_colonne=pige.position_colonne,
        )
        for pige, quantite_manquante in db.execute(statement).all()
    ]
