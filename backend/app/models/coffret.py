from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.pige import Pige


class Coffret(Base):
    __tablename__ = "coffret"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    piges: Mapped[list["Pige"]] = relationship(
        back_populates="coffret",
        cascade="all, delete-orphan",
    )
