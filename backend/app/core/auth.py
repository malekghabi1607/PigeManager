"""Code d'acces d'atelier : un code partage echange contre un jeton signe (HMAC-SHA256).

Le code protege l'acces au site ; il ne prouve pas l'identite de chaque controleur.
"""

import hashlib
import hmac
import logging
import secrets
import threading
import time
from collections import deque

from fastapi import Header, HTTPException, Request, status

from app.core.config import settings

logger = logging.getLogger(__name__)

DUREE_JETON = 30 * 24 * 3600
MAX_ECHECS = 5
FENETRE_ECHECS = 15 * 60

# En local sans SECRET_KEY : cle aleatoire, les jetons ne survivent pas a un redemarrage.
_cle_locale = secrets.token_bytes(32)

# Compteur d'echecs par IP, en memoire : il repart a zero au redemarrage du serveur.
_echecs: dict[str, deque[float]] = {}
_verrou_echecs = threading.Lock()


def protection_active() -> bool:
    return bool(settings.atelier_pin)


def verifier_configuration() -> None:
    """Refuse de demarrer en production sans code ; previent en local."""
    if settings.static_dir and not (settings.atelier_pin and settings.secret_key):
        raise RuntimeError(
            "ATELIER_PIN et SECRET_KEY sont obligatoires en production (STATIC_DIR est defini). "
            "Definissez-les dans les variables d'environnement Render."
        )
    if not protection_active():
        logger.warning("ATELIER_PIN absent : l'API est accessible sans code (developpement local uniquement).")


def _cle() -> bytes:
    # Depend du code : changer ATELIER_PIN invalide tous les jetons existants.
    secret = settings.secret_key.encode() if settings.secret_key else _cle_locale
    return hmac.new(secret, f"pin:{settings.atelier_pin}".encode(), hashlib.sha256).digest()


def _signature(expiration: str) -> str:
    return hmac.new(_cle(), expiration.encode(), hashlib.sha256).hexdigest()


def creer_jeton() -> str:
    expiration = str(int(time.time()) + DUREE_JETON)
    return f"{expiration}.{_signature(expiration)}"


def jeton_valide(jeton: str) -> bool:
    expiration, _, signature = jeton.partition(".")
    if not expiration.isdigit() or not hmac.compare_digest(signature, _signature(expiration)):
        return False
    return int(expiration) > time.time()


def adresse_client(request: Request) -> str:
    # Render ajoute l'IP reelle en fin de X-Forwarded-For ; les entrees de gauche
    # viennent du client et peuvent etre inventees.
    transmise = request.headers.get("x-forwarded-for", "")
    if transmise.strip():
        return transmise.split(",")[-1].strip()
    return request.client.host if request.client else "inconnue"


def verifier_code(code: str, adresse: str) -> str:
    """Renvoie un jeton si le code est bon ; 401 sinon, 429 apres trop d'echecs."""
    maintenant = time.monotonic()
    with _verrou_echecs:
        echecs = _echecs.setdefault(adresse, deque())
        while echecs and maintenant - echecs[0] > FENETRE_ECHECS:
            echecs.popleft()
        if len(echecs) >= MAX_ECHECS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop d'essais. Réessayez dans 15 minutes.",
            )
        if not hmac.compare_digest(code.encode(), settings.atelier_pin.encode()):
            echecs.append(maintenant)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Code incorrect.")
        _echecs.pop(adresse, None)
    return creer_jeton()


def exiger_jeton(authorization: str | None = Header(default=None)) -> None:
    """Dependance FastAPI : exige 'Authorization: Bearer <jeton>' quand un code est configure."""
    if not protection_active():
        return
    schema, _, jeton = (authorization or "").partition(" ")
    if schema.lower() != "bearer" or not jeton_valide(jeton.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée, saisissez le code atelier.",
            headers={"WWW-Authenticate": "Bearer"},
        )
