// localStorage peut etre indisponible (navigation privee, donnees bloquees) :
// chaque acces est protege et l'application fonctionne sans lui.

export function lireStockage(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle)
  } catch {
    return null
  }
}

export function ecrireStockage(cle: string, valeur: string): void {
  try {
    window.localStorage.setItem(cle, valeur)
  } catch {
    // La valeur reste seulement en memoire pour cette session.
  }
}

export function effacerStockage(cle: string): void {
  try {
    window.localStorage.removeItem(cle)
  } catch {
    // Rien a effacer si le stockage est indisponible.
  }
}
