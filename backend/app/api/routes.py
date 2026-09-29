import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import not_found
from app.database import get_db
from app.models import Coffret, Controle, Pige, Utilisateur
from app.schemas import (
    BesoinRead,
    CoffretRead,
    ControleCreate,
    ControleRead,
    ExportCreate,
    ExportLotRead,
    HistoriqueControleRead,
    PigeRead,
    UtilisateurCreate,
    UtilisateurRead,
)
from app.services import (
    build_lot_excel,
    build_lot_pdf,
    create_export_lot,
    get_export_lot,
    list_export_lots,
    connect_utilisateur,
    get_besoins,
    get_historique_controles,
    get_piges_for_coffret,
    list_utilisateurs,
    save_controle,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/utilisateurs", response_model=list[UtilisateurRead])
def get_utilisateurs(db: Session = Depends(get_db)) -> list[Utilisateur]:
    logger.info("Listing utilisateurs")
    return list_utilisateurs(db)


@router.post(
    "/utilisateurs/connexion",
    response_model=UtilisateurRead,
    status_code=201,
)
def login_utilisateur(
    utilisateur_data: UtilisateurCreate,
    db: Session = Depends(get_db),
) -> Utilisateur:
    logger.info("Connecting utilisateur nom=%s", utilisateur_data.nom)
    return connect_utilisateur(db, utilisateur_data)


@router.get("/coffrets", response_model=list[CoffretRead])
def get_coffrets(db: Session = Depends(get_db)) -> list[CoffretRead]:
    logger.info("Listing coffrets")
    statement = (
        select(Coffret.id, Coffret.nom, func.count(Pige.id).label("total_piges"))
        .outerjoin(Coffret.piges)
        .group_by(Coffret.id, Coffret.nom)
        .order_by(Coffret.id)
    )
    return [
        CoffretRead(id=row.id, nom=row.nom, total_piges=row.total_piges)
        for row in db.execute(statement).all()
    ]


@router.get("/coffrets/{coffret_id}", response_model=list[PigeRead])
def get_piges_by_coffret(
    coffret_id: int,
    db: Session = Depends(get_db),
) -> list[PigeRead]:
    coffret = db.get(Coffret, coffret_id)
    if coffret is None:
        raise not_found("Coffret introuvable")

    logger.info("Listing piges for coffret_id=%s", coffret_id)
    return get_piges_for_coffret(db, coffret_id)


@router.post(
    "/controle",
    response_model=ControleRead,
    status_code=201,
)
def create_controle(
    controle_data: ControleCreate,
    db: Session = Depends(get_db),
) -> Controle:
    logger.info("Saving controle for pige_id=%s", controle_data.pige_id)
    return save_controle(db, controle_data)


@router.get("/besoins", response_model=list[BesoinRead])
def list_besoins(db: Session = Depends(get_db)) -> list[BesoinRead]:
    logger.info("Listing besoins")
    return get_besoins(db)


@router.get("/historique", response_model=list[HistoriqueControleRead])
def list_historique(db: Session = Depends(get_db)) -> list[HistoriqueControleRead]:
    logger.info("Listing controle history")
    return get_historique_controles(db)


@router.get("/exports", response_model=list[ExportLotRead])
def get_exports(db: Session = Depends(get_db)) -> list[ExportLotRead]:
    logger.info("Listing export lots")
    return list_export_lots(db)


@router.post("/exports", response_model=ExportLotRead, status_code=201)
def post_export(export_data: ExportCreate, db: Session = Depends(get_db)) -> ExportLotRead:
    logger.info("Creating export lot for utilisateur_id=%s", export_data.utilisateur_id)
    return create_export_lot(db, export_data.utilisateur_id)


@router.get("/exports/{lot_id}/excel")
def export_lot_excel(lot_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    logger.info("Exporting lot %s as Excel", lot_id)
    return StreamingResponse(
        build_lot_excel(get_export_lot(db, lot_id)),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="pigecontrol_commande_{lot_id}.xlsx"'},
    )


@router.get("/exports/{lot_id}/pdf")
def export_lot_pdf(lot_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    logger.info("Exporting lot %s as PDF", lot_id)
    return StreamingResponse(
        build_lot_pdf(get_export_lot(db, lot_id)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="pigecontrol_commande_{lot_id}.pdf"'},
    )
