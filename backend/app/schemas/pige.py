from pydantic import BaseModel, ConfigDict


class PigeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    coffret_id: int
    code: str
    quantite_initiale: int
    quantite_manquante: int
    statut: str
    position_ligne: int
    position_colonne: int
