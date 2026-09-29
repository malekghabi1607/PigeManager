from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Coffret, Pige
from app.services.coffrets import coffret_name, generer_piges


VISIBLE_COFFRETS = [
    (Decimal("0.50"), Decimal("1.00"), 11),
    (Decimal("1.00"), Decimal("2.00"), 13),
    (Decimal("2.00"), Decimal("3.00"), 13),
    (Decimal("3.00"), Decimal("4.00"), 13),
    (Decimal("4.00"), Decimal("5.00"), 13),
    (Decimal("5.00"), Decimal("6.00"), 13),
    (Decimal("6.00"), Decimal("7.00"), 13),
    (Decimal("7.00"), Decimal("8.00"), 13),
    (Decimal("8.00"), Decimal("9.00"), 13),
    (Decimal("9.00"), Decimal("10.00"), 13),
    (Decimal("10.00"), Decimal("10.50"), 9),
    (Decimal("10.50"), Decimal("11.00"), 9),
    (Decimal("11.00"), Decimal("11.50"), 9),
    (Decimal("11.50"), Decimal("12.00"), 9),
    (Decimal("12.00"), Decimal("12.50"), 9),
    (Decimal("12.50"), Decimal("13.00"), 9),
    (Decimal("13.00"), Decimal("13.50"), 9),
    (Decimal("13.50"), Decimal("14.00"), 9),
    (Decimal("14.50"), Decimal("15.00"), 9),
    (Decimal("15.00"), Decimal("15.50"), 9),
    (Decimal("15.50"), Decimal("16.00"), 9),
    (Decimal("16.00"), Decimal("16.50"), 9),
    (Decimal("16.50"), Decimal("17.00"), 9),
    (Decimal("17.00"), Decimal("17.50"), 9),
    (Decimal("17.50"), Decimal("18.00"), 9),
    (Decimal("18.00"), Decimal("18.50"), 9),
    (Decimal("18.50"), Decimal("19.00"), 9),
]


def seed() -> tuple[int, int]:
    Base.metadata.create_all(bind=engine)
    coffrets_count = 0
    piges_count = 0

    with SessionLocal() as db:
        for start, end, columns in VISIBLE_COFFRETS:
            nom = coffret_name(start, end)
            coffret = db.scalar(select(Coffret).where(Coffret.nom == nom))
            if coffret is None:
                coffret = Coffret(nom=nom)
                db.add(coffret)
                db.flush()
                coffrets_count += 1

            for code, position_ligne, position_colonne in generer_piges(start, end, columns):
                pige = db.scalar(
                    select(Pige).where(
                        Pige.coffret_id == coffret.id,
                        Pige.code == code,
                    )
                )

                if pige is None:
                    pige = Pige(coffret_id=coffret.id, code=code)
                    db.add(pige)
                    piges_count += 1

                pige.quantite_initiale = 1
                pige.position_ligne = position_ligne
                pige.position_colonne = position_colonne

        db.commit()

    return coffrets_count, piges_count


if __name__ == "__main__":
    coffrets, piges = seed()
    print(f"Coffrets ajoutes : {coffrets}")
    print(f"Piges ajoutees : {piges}")
