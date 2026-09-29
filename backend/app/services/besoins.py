from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Coffret, Controle, ExportLigne, ExportLot, Pige
from app.schemas import BesoinRead


@dataclass
class BesoinRow:
    pige_id: int
    coffret_id: int
    coffret_nom: str
    date: datetime
    code: str
    quantite_manquante: int
    quantite_deja_commandee: int
    quantite_a_commander: int


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _latest_controls_rows(db: Session):
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
            Controle.date.label("date"),
        )
        .join(
            latest_control_ids,
            (latest_control_ids.c.pige_id == Controle.pige_id)
            & (latest_control_ids.c.controle_id == Controle.id),
        )
        .subquery()
    )

    statement = (
        select(
            Pige.id.label("pige_id"),
            Coffret.id.label("coffret_id"),
            Coffret.nom.label("coffret_nom"),
            latest_controls.c.date.label("date"),
            Pige.code.label("code"),
            latest_controls.c.quantite_manquante.label("quantite_manquante"),
        )
        .join(Coffret, Coffret.id == Pige.coffret_id)
        .join(latest_controls, latest_controls.c.pige_id == Pige.id)
        .where(latest_controls.c.quantite_manquante > 0)
        .order_by(Coffret.nom, Pige.position_ligne, Pige.position_colonne)
    )
    return db.execute(statement).all()


def _deja_commandee_par_pige(db: Session) -> dict[int, int]:
    """Quantites deja exportees depuis la derniere remise a 0 de chaque pige.

    Quand une pige revient a 0 (piece remplacee), ses anciens exports ne comptent plus.
    """
    remises_a_zero = {
        pige_id: _as_utc(date)
        for pige_id, date in db.execute(
            select(Controle.pige_id, func.max(Controle.date))
            .where(Controle.quantite_manquante == 0)
            .group_by(Controle.pige_id)
        ).all()
    }

    deja: dict[int, int] = {}
    lignes = db.execute(
        select(ExportLigne.pige_id, ExportLigne.quantite, ExportLot.date)
        .join(ExportLot, ExportLot.id == ExportLigne.lot_id)
    ).all()
    for pige_id, quantite, date_export in lignes:
        remise = remises_a_zero.get(pige_id)
        if remise is not None and _as_utc(date_export) <= remise:
            continue
        deja[pige_id] = deja.get(pige_id, 0) + quantite
    return deja


def get_besoins_rows(db: Session) -> list[BesoinRow]:
    deja = _deja_commandee_par_pige(db)
    rows: list[BesoinRow] = []
    for row in _latest_controls_rows(db):
        deja_commandee = deja.get(row.pige_id, 0)
        a_commander = max(0, row.quantite_manquante - deja_commandee)
        if a_commander == 0:
            continue
        rows.append(
            BesoinRow(
                pige_id=row.pige_id,
                coffret_id=row.coffret_id,
                coffret_nom=row.coffret_nom,
                date=row.date,
                code=row.code,
                quantite_manquante=row.quantite_manquante,
                quantite_deja_commandee=deja_commandee,
                quantite_a_commander=a_commander,
            )
        )
    return rows


def get_besoins(db: Session) -> list[BesoinRead]:
    return [
        BesoinRead(
            pige_id=row.pige_id,
            coffret_id=row.coffret_id,
            coffret_nom=row.coffret_nom,
            code=row.code,
            quantite_manquante=row.quantite_manquante,
            quantite_deja_commandee=row.quantite_deja_commandee,
            quantite_a_commander=row.quantite_a_commander,
        )
        for row in get_besoins_rows(db)
    ]
