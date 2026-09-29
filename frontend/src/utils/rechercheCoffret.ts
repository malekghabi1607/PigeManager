import type { Coffret } from '../types/api'

const nombre = String.raw`\d+(?:[.,]\d+)?`
const plage = new RegExp(`^(${nombre})(?:\\s*[àa/–-]\\s*|\\s+)(${nombre})$`, 'i')

export function rechercherCoffrets(coffrets: Coffret[], saisie: string): Coffret[] {
  const recherche = saisie.trim()
  if (!recherche) return [...coffrets]

  const bornes = recherche.match(plage)
  if (bornes) {
    const valeurs = bornes.slice(1).map((valeur) => Number(valeur.replace(',', '.')))
    const debut = Math.min(...valeurs)
    const fin = Math.max(...valeurs)
    const estExact = (coffret: Coffret) => coffret.code_debut === debut && coffret.code_fin === fin
    return coffrets
      .filter((coffret) => coffret.code_debut !== null && coffret.code_fin !== null &&
        (estExact(coffret) || Math.max(coffret.code_debut, debut) < Math.min(coffret.code_fin, fin)))
      .sort((a, b) => Number(estExact(b)) - Number(estExact(a)))
  }

  if (new RegExp(`^${nombre}$`).test(recherche)) {
    const code = Number(recherche.replace(',', '.'))
    return coffrets.filter((coffret) => coffret.code_debut !== null && coffret.code_fin !== null &&
      coffret.code_debut <= code && code <= coffret.code_fin)
  }

  // Les saisies numeriques incompletes ne correspondent a aucune plage.
  if (/\d/.test(recherche)) return []
  return coffrets.filter((coffret) => coffret.nom.toLowerCase().includes(recherche.toLowerCase()))
}

export function nomCourtCoffret(nom: string): string {
  const correspondance = nom.match(new RegExp(`^COFFRET\\s+PIGES\\s+(${nombre})\\s+[ÀA]\\s+(${nombre})$`, 'i'))
  return correspondance ? `${correspondance[1]} → ${correspondance[2]}` : nom
}
