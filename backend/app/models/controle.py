from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.pige import Pige
    from app.models.utilisateur import Utilisateur


class Controle(Base):
    __tablename__ = "controle"
    __table_args__ = (
        CheckConstraint("quantite_manquante >= 0", name="ck_controle_quantite_manquante_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pige_id: Mapped[int] = mapped_column(
        ForeignKey("pige.id"),
        nullable=False,
        index=True,
    )
    utilisateur_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("utilisateur.id"),
        nullable=True,
        index=True,
    )
    statut: Mapped[str] = mapped_column(String(30), nullable=False)
    quantite_manquante: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    pige: Mapped["Pige"] = relationship(back_populates="controles")
    utilisateur: Mapped[Optional["Utilisateur"]] = relationship(back_populates="controles")
