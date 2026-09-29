from datetime import timezone
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import bad_request, not_found
from app.models import ExportLigne, ExportLot, Pige, Utilisateur
from app.schemas import ExportLigneRead, ExportLotRead
from app.services.besoins import get_besoins_rows


def _lot_query():
    return select(ExportLot).options(
        selectinload(ExportLot.utilisateur),
        selectinload(ExportLot.lignes).selectinload(ExportLigne.pige).selectinload(Pige.coffret),
    )


def _lot_to_read(lot: ExportLot) -> ExportLotRead:
    lignes = sorted(
        lot.lignes,
        key=lambda ligne: (ligne.pige.coffret.nom, ligne.pige.position_ligne, ligne.pige.position_colonne),
    )
    return ExportLotRead(
        id=lot.id,
        date=lot.date if lot.date.tzinfo else lot.date.replace(tzinfo=timezone.utc),
        utilisateur_nom=lot.utilisateur.nom if lot.utilisateur else "Non renseigne",
        lignes=[
            ExportLigneRead(
                pige_id=ligne.pige_id,
                coffret_nom=ligne.pige.coffret.nom,
                code=ligne.pige.code,
                quantite=ligne.quantite,
            )
            for ligne in lignes
        ],
    )


def create_export_lot(db: Session, utilisateur_id: int) -> ExportLotRead:
    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise not_found("Utilisateur introuvable")

    besoins = get_besoins_rows(db)
    if not besoins:
        raise bad_request("Aucune nouvelle piece a exporter")

    lot = ExportLot(
        utilisateur_id=utilisateur.id,
        lignes=[ExportLigne(pige_id=row.pige_id, quantite=row.quantite_a_commander) for row in besoins],
    )
    db.add(lot)
    db.commit()
    return get_export_lot(db, lot.id)


def list_export_lots(db: Session) -> list[ExportLotRead]:
    lots = db.scalars(_lot_query().order_by(ExportLot.id.desc())).all()
    return [_lot_to_read(lot) for lot in lots]


def get_export_lot(db: Session, lot_id: int) -> ExportLotRead:
    lot = db.scalar(_lot_query().where(ExportLot.id == lot_id))
    if lot is None:
        raise not_found("Export introuvable")
    return _lot_to_read(lot)


def build_lot_excel(lot: ExportLotRead) -> BytesIO:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Besoins"

    headers = ["Nom coffret", "Date export", "Code pige", "Quantite a commander"]
    sheet.append(headers)

    header_fill = PatternFill("solid", fgColor="D9F3FB")
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="004E68")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for ligne in lot.lignes:
        sheet.append(
            [
                ligne.coffret_nom,
                lot.date.astimezone().strftime("%d/%m/%Y %H:%M"),
                ligne.code.replace(",", "."),
                ligne.quantite,
            ]
        )

    sheet.column_dimensions["A"].width = 34
    sheet.column_dimensions["B"].width = 20
    sheet.column_dimensions["C"].width = 14
    sheet.column_dimensions["D"].width = 22
    sheet.freeze_panes = "A2"

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output


def build_lot_pdf(lot: ExportLotRead) -> BytesIO:
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"PigeControl - Commande n°{lot.id}", styles["Title"]),
        Paragraph(
            lot.date.astimezone().strftime("Export genere le %d/%m/%Y a %H:%M")
            + f" par {lot.utilisateur_nom}",
            styles["Normal"],
        ),
        Spacer(1, 18),
    ]

    table_data = [["Nom coffret", "Date export", "Code pige", "Quantite a commander"]]
    for ligne in lot.lignes:
        table_data.append(
            [
                ligne.coffret_nom,
                lot.date.astimezone().strftime("%d/%m/%Y %H:%M"),
                ligne.code.replace(",", "."),
                str(ligne.quantite),
            ]
        )

    if len(table_data) == 1:
        table_data.append(["Aucun besoin", "-", "-", "0"])

    table = Table(table_data, colWidths=[210, 95, 75, 100], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#006D8F")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (2, 1), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD7DC")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F7F8")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(table)
    document.build(story)
    output.seek(0)
    return output
