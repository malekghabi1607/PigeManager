from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.pige import Pige
    from app.models.utilisateur import Utilisateur


class ExportLot(Base):
    """Un export de la liste des besoins : les piges qu'il contient ne sont plus a commander."""

    __tablename__ = "export_lot"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    utilisateur_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("utilisateur.id"),
        nullable=True,
    )
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    lignes: Mapped[list["ExportLigne"]] = relationship(
        back_populates="lot",
        cascade="all, delete-orphan",
    )
    utilisateur: Mapped[Optional["Utilisateur"]] = relationship()


class ExportLigne(Base):
    __tablename__ = "export_ligne"
    __table_args__ = (
        CheckConstraint("quantite > 0", name="ck_export_ligne_quantite_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("export_lot.id"), nullable=False, index=True)
    pige_id: Mapped[int] = mapped_column(ForeignKey("pige.id"), nullable=False, index=True)
    quantite: Mapped[int] = mapped_column(Integer, nullable=False)

    lot: Mapped[ExportLot] = relationship(back_populates="lignes")
    pige: Mapped["Pige"] = relationship()
