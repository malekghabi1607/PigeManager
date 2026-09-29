from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import Coffret, Controle, Pige, Utilisateur
from app.schemas import HistoriqueControleRead, HistoriqueRead


def get_historique_controles(db: Session, jours: int) -> HistoriqueRead:
    """Controles des `jours` derniers jours, les plus recents d'abord."""
    limite = datetime.now(timezone.utc) - timedelta(days=jours)

    # Valeur precedente de chaque pige, calculee sur tout l'historique : le premier
    # controle affiche garde son vrai "avant" meme si le precedent est plus ancien.
    avec_avant = select(
        Controle.id.label("id"),
        func.lag(Controle.quantite_manquante, 1, 0)
        .over(partition_by=Controle.pige_id, order_by=Controle.id)
        .label("quantite_avant"),
    ).subquery()

    statement = (
        select(
            Controle.id.label("id"),
            Utilisateur.nom.label("utilisateur_nom"),
            Utilisateur.role.label("utilisateur_role"),
            Coffret.nom.label("coffret_nom"),
            Pige.code.label("code_pige"),
            Controle.statut.label("statut"),
            avec_avant.c.quantite_avant,
            Controle.quantite_manquante.label("quantite_manquante"),
            Controle.date.label("date"),
        )
        .join(avec_avant, avec_avant.c.id == Controle.id)
        .join(Pige, Pige.id == Controle.pige_id)
        .join(Coffret, Coffret.id == Pige.coffret_id)
        .outerjoin(Utilisateur, Utilisateur.id == Controle.utilisateur_id)
        .where(Controle.date >= limite)
        .order_by(desc(Controle.date), desc(Controle.id))
    )

    controles = [
        HistoriqueControleRead(
            id=row.id,
            utilisateur_nom=row.utilisateur_nom or "Non renseigne",
            utilisateur_role=row.utilisateur_role or "controleur",
            coffret_nom=row.coffret_nom,
            code_pige=row.code_pige,
            statut=row.statut,
            quantite_avant=row.quantite_avant,
            quantite_manquante=row.quantite_manquante,
            date=row.date,
        )
        for row in db.execute(statement).all()
    ]
    plus_anciens = db.scalar(select(func.count()).select_from(Controle).where(Controle.date < limite)) > 0
    return HistoriqueRead(controles=controles, jours=jours, plus_anciens=plus_anciens)
