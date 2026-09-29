from pydantic import BaseModel, ConfigDict, Field


class UtilisateurCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    role: str = Field(default="controleur", min_length=1, max_length=50)


class UtilisateurRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    role: str
