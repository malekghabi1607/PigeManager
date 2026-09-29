from collections.abc import Iterator
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import bad_request, conflict, not_found
from app.models import Coffret, Controle, ExportLigne, Pige
from app.schemas import CoffretCreate, CoffretCreateResult, CoffretRead

PAS = Decimal("0.01")
MAX_COLONNES = 20
MAX_PIGES = 500


def format_code(value: Decimal) -> str:
    return f"{value:.2f}".replace(".", ",")


def coffret_name(start: Decimal, end: Decimal) -> str:
    return f"COFFRET PIGES {format_code(start)} À {format_code(end)}"


def iter_codes(start: Decimal, end: Decimal) -> Iterator[Decimal]:
    current = start
    while current <= end:
        yield current
        current += PAS


def generer_piges(start: Decimal, end: Decimal, colonnes: int) -> list[tuple[str, int, int]]:
    """(code, position_ligne, position_colonne) de chaque pige, de 0,01 en 0,01."""
    return [
        (format_code(code), index // colonnes + 1, index % colonnes + 1)
        for index, code in enumerate(iter_codes(start, end))
    ]


def list_coffrets(db: Session) -> list[CoffretRead]:
    statement = (
        select(Coffret.id, Coffret.nom, Pige.code)
        .outerjoin(Coffret.piges)
        .order_by(Coffret.id)
    )
    coffrets: dict[int, CoffretRead] = {}
    for row in db.execute(statement):
        if row.id not in coffrets:
            coffrets[row.id] = CoffretRead(id=row.id, nom=row.nom)
        coffret = coffrets[row.id]
        if row.code is not None:
            code = float(row.code.replace(",", "."))
            coffret.total_piges += 1
            coffret.code_debut = code if coffret.code_debut is None else min(coffret.code_debut, code)
            coffret.code_fin = code if coffret.code_fin is None else max(coffret.code_fin, code)
    return list(coffrets.values())


def _valider(data: CoffretCreate) -> None:
    debut, fin = data.code_debut, data.code_fin
    if not (debut.is_finite() and fin.is_finite()):
        raise bad_request("Les numéros doivent être des nombres.")
    if debut <= 0:
        raise bad_request("Le premier numéro doit être supérieur à 0.")
    if debut >= fin:
        raise bad_request("Le premier numéro doit être plus petit que le dernier.")
    if debut != debut.quantize(PAS) or fin != fin.quantize(PAS):
        raise bad_request("Les numéros ont au plus 2 décimales (ex. : 14,25).")
    if not 1 <= data.colonnes <= MAX_COLONNES:
        raise bad_request(f"Le nombre de colonnes doit être compris entre 1 et {MAX_COLONNES}.")
    nombre = int((fin - debut) / PAS) + 1
    if nombre > MAX_PIGES:
        raise bad_request(f"Un coffret contient au plus {MAX_PIGES} piges (ici {nombre}).")


def _avertissements(existants: list[CoffretRead], debut: float, fin: float) -> list[str]:
    # Une borne commune (ex. 14,00 pour 13,50 → 14,00) n'est pas un chevauchement.
    return [
        f"La plage chevauche le coffret « {coffret.nom.capitalize()} »."
        for coffret in existants
        if coffret.code_debut is not None
        and coffret.code_fin is not None
        and max(coffret.code_debut, debut) < min(coffret.code_fin, fin)
    ]


def create_coffret(db: Session, data: CoffretCreate) -> CoffretCreateResult:
    _valider(data)
    nom = " ".join((data.nom or "").split()).upper() or coffret_name(data.code_debut, data.code_fin)
    if len(nom) > 100:
        raise bad_request("Le nom est trop long (100 caractères au plus).")

    existants = list_coffrets(db)
    # Comparaison en Python : LOWER() de SQLite ignore les lettres accentuees.
    if any(coffret.nom.casefold() == nom.casefold() for coffret in existants):
        raise conflict(f"Le coffret « {nom.capitalize()} » existe déjà.")

    coffret = Coffret(
        nom=nom,
        piges=[
            Pige(code=code, quantite_initiale=1, position_ligne=ligne, position_colonne=colonne)
            for code, ligne, colonne in generer_piges(data.code_debut, data.code_fin, data.colonnes)
        ],
    )
    db.add(coffret)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict(f"Le coffret « {nom.capitalize()} » existe déjà.") from None

    return CoffretCreateResult(
        id=coffret.id,
        nom=coffret.nom,
        total_piges=len(coffret.piges),
        code_debut=float(data.code_debut),
        code_fin=float(data.code_fin),
        avertissements=_avertissements(existants, float(data.code_debut), float(data.code_fin)),
    )


def delete_coffret(db: Session, coffret_id: int) -> None:
    coffret = db.get(Coffret, coffret_id)
    if coffret is None:
        raise not_found("Coffret introuvable")

    # Un coffret deja controle ou commande reste en base pour garder l'historique.
    piges = select(Pige.id).where(Pige.coffret_id == coffret_id)
    controles = db.scalar(select(func.count()).select_from(Controle).where(Controle.pige_id.in_(piges)))
    exports = db.scalar(select(func.count()).select_from(ExportLigne).where(ExportLigne.pige_id.in_(piges)))
    if controles or exports:
        raise conflict(
            f"Ce coffret a déjà {controles} contrôle(s) et {exports} ligne(s) d'export : "
            "il ne peut pas être supprimé, pour garder l'historique."
        )

    db.delete(coffret)
    db.commit()
