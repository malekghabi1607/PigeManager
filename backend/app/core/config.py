from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "PigeControl API"
    database_path: Path = Path(__file__).resolve().parents[2] / "pigecontrol.db"
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )
    # Mac lui-meme + appareils du reseau local (telephone, tablette sur le meme Wi-Fi).
    cors_origin_regex: str = (
        r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+"
        r"|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):517[0-9]"
    )

    @property
    def database_url(self) -> str:
        url = os.environ.get("DATABASE_URL", "").strip()
        if url:
            if url.startswith(("postgres://", "postgresql://")):
                return "postgresql+psycopg://" + url.split("://", 1)[1]
            return url
        return f"sqlite:///{self.database_path}"

    # Lus a chaque acces, comme DATABASE_URL, pour suivre l'environnement du processus.
    @property
    def atelier_pin(self) -> str:
        return os.environ.get("ATELIER_PIN", "").strip()

    @property
    def secret_key(self) -> str:
        return os.environ.get("SECRET_KEY", "").strip()

    @property
    def static_dir(self) -> str:
        return os.environ.get("STATIC_DIR", "").strip()


settings = Settings()

