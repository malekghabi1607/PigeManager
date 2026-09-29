from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.controle import Controle


class Utilisateur(Base):
    __tablename__ = "utilisateur"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="controleur")

    controles: Mapped[list["Controle"]] = relationship(back_populates="utilisateur")

