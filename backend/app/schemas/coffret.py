from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CoffretRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    total_piges: int = 0
    code_debut: float | None = None
    code_fin: float | None = None


class CoffretCreate(BaseModel):
    # Bornes et colonnes sont validees par le service, pour des messages en francais.
    code_debut: Decimal
    code_fin: Decimal
    colonnes: int = 12
    nom: str | None = None


class CoffretCreateResult(CoffretRead):
    avertissements: list[str] = []
