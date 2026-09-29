from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.coffret import Coffret
    from app.models.controle import Controle


class Pige(Base):
    __tablename__ = "pige"
    __table_args__ = (
        CheckConstraint("quantite_initiale >= 0", name="ck_pige_quantite_initiale_positive"),
        CheckConstraint("position_ligne > 0", name="ck_pige_position_ligne_positive"),
        CheckConstraint("position_colonne > 0", name="ck_pige_position_colonne_positive"),
        UniqueConstraint("coffret_id", "code", name="uq_pige_coffret_code"),
        UniqueConstraint(
            "coffret_id",
            "position_ligne",
            "position_colonne",
            name="uq_pige_coffret_position",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    coffret_id: Mapped[int] = mapped_column(
        ForeignKey("coffret.id"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    quantite_initiale: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    position_ligne: Mapped[int] = mapped_column(Integer, nullable=False)
    position_colonne: Mapped[int] = mapped_column(Integer, nullable=False)

    coffret: Mapped["Coffret"] = relationship(back_populates="piges")
    controles: Mapped[list["Controle"]] = relationship(
        back_populates="pige",
        cascade="all, delete-orphan",
    )
