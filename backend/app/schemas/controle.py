from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer


def serialize_utc_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class ControleCreate(BaseModel):
    pige_id: int
    utilisateur_id: int
    quantite_manquante: int = Field(default=1, ge=0, le=99)


class ControleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pige_id: int
    utilisateur_id: Optional[int]
    statut: str
    quantite_manquante: int
    date: datetime

    @field_serializer("date")
    def serialize_date(self, value: datetime) -> str:
        return serialize_utc_datetime(value)


class BesoinRead(BaseModel):
    pige_id: int
    coffret_id: int
    coffret_nom: str
    code: str
    quantite_manquante: int
    quantite_deja_commandee: int
    quantite_a_commander: int


class BesoinDetailRead(BaseModel):
    pige_id: int
    coffret_nom: str
    quantite_a_commander: int
    quantite_deja_commandee: int


class BesoinGroupeRead(BaseModel):
    """Toutes les piges d'un meme code, quel que soit leur coffret."""

    code: str
    quantite_a_commander: int
    quantite_deja_commandee: int
    detail: list[BesoinDetailRead]


class ResetCreate(BaseModel):
    utilisateur_id: int


class ResetRead(BaseModel):
    piges: int
    pieces: int


class ExportCreate(BaseModel):
    utilisateur_id: int


class ExportLigneRead(BaseModel):
    pige_id: int
    coffret_nom: str
    code: str
    quantite: int


class ExportLotRead(BaseModel):
    id: int
    date: datetime
    utilisateur_nom: str
    lignes: list[ExportLigneRead]

    @field_serializer("date")
    def serialize_date(self, value: datetime) -> str:
        return serialize_utc_datetime(value)


class HistoriqueControleRead(BaseModel):
    id: int
    utilisateur_nom: str
    utilisateur_role: str
    coffret_nom: str
    code_pige: str
    statut: str
    quantite_manquante: int
    date: datetime

    @field_serializer("date")
    def serialize_date(self, value: datetime) -> str:
        return serialize_utc_datetime(value)
