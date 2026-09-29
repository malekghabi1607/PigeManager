from pydantic import BaseModel, ConfigDict


class CoffretRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    total_piges: int = 0
    code_debut: float | None = None
    code_fin: float | None = None
