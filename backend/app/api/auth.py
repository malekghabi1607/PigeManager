import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.core.auth import adresse_client, protection_active, verifier_code

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/auth")


class CodeAtelier(BaseModel):
    pin: str = Field(max_length=100)


class JetonRead(BaseModel):
    jeton: str


class StatutAuthRead(BaseModel):
    protection: bool


@auth_router.get("/statut", response_model=StatutAuthRead)
def get_statut() -> StatutAuthRead:
    # Permet a l'interface de sauter l'ecran du code quand aucun code n'est configure (local).
    return StatutAuthRead(protection=protection_active())


@auth_router.post("/pin", response_model=JetonRead)
def post_pin(code: CodeAtelier, request: Request) -> JetonRead:
    adresse = adresse_client(request)
    if not protection_active():
        return JetonRead(jeton="")
    jeton = verifier_code(code.pin, adresse)
    logger.info("Code atelier accepte pour %s", adresse)
    return JetonRead(jeton=jeton)
