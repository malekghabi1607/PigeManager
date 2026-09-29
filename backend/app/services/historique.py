from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Coffret, Controle, Pige, Utilisateur
from app.schemas import HistoriqueControleRead


def get_historique_controles(db: Session) -> list[HistoriqueControleRead]:
    statement = (
        select(
            Controle.id.label("id"),
            Utilisateur.nom.label("utilisateur_nom"),
            Utilisateur.role.label("utilisateur_role"),
            Coffret.nom.label("coffret_nom"),
            Pige.code.label("code_pige"),
            Controle.statut.label("statut"),
            Controle.quantite_manquante.label("quantite_manquante"),
            Controle.date.label("date"),
        )
        .join(Pige, Pige.id == Controle.pige_id)
        .join(Coffret, Coffret.id == Pige.coffret_id)
        .outerjoin(Utilisateur, Utilisateur.id == Controle.utilisateur_id)
        .order_by(desc(Controle.date), desc(Controle.id))
    )

    return [
        HistoriqueControleRead(
            id=row.id,
            utilisateur_nom=row.utilisateur_nom or "Non renseigne",
            utilisateur_role=row.utilisateur_role or "controleur",
            coffret_nom=row.coffret_nom,
            code_pige=row.code_pige,
            statut=row.statut,
            quantite_manquante=row.quantite_manquante,
            date=row.date,
        )
        for row in db.execute(statement).all()
    ]

