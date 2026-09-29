from enum import Enum


class ControleStatut(str, Enum):
    PRESENTE = "PRESENTE"
    INSUFFISANTE = "INSUFFISANTE"
    MANQUANTE = "MANQUANTE"


def compute_controle_status(quantite_manquante: int, quantite_initiale: int) -> ControleStatut:
    if quantite_manquante <= 0:
        return ControleStatut.PRESENTE
    if quantite_manquante >= quantite_initiale:
        return ControleStatut.MANQUANTE
    return ControleStatut.INSUFFISANTE
