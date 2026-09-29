import type { Coffret } from '../types/api'

const nombres = /\d+(?:[.,]\d+)?/g

function lireNombres(texte: string): number[] {
  return (texte.match(nombres) ?? []).map((valeur) => Number(valeur.replace(',', '.')))
}

// Bornes envoyees par l'API ; a defaut (ancienne API), celles ecrites dans le nom.
function plageCoffret(coffret: Coffret): [number, number] | undefined {
  if (coffret.code_debut != null && coffret.code_fin != null) {
    return [coffret.code_debut, coffret.code_fin]
  }
  const valeurs = lireNombres(coffret.nom)
  return valeurs.length >= 2 ? [Math.min(...valeurs), Math.max(...valeurs)] : undefined
}

// "1 à 2", "1-2", "10 à 10.5" : plage. "12.34" ou "1 à" (en cours de saisie) : un code.
export function rechercherCoffrets(coffrets: Coffret[], saisie: string): Coffret[] {
  const recherche = saisie.trim()
  if (!recherche) return [...coffrets]

  const valeurs = lireNombres(recherche)
  if (valeurs.length === 0) {
    return coffrets.filter((coffret) => coffret.nom.toLowerCase().includes(recherche.toLowerCase()))
  }

  if (valeurs.length === 1) {
    const [code] = valeurs
    return coffrets.filter((coffret) => {
      const bornes = plageCoffret(coffret)
      return bornes !== undefined && bornes[0] <= code && code <= bornes[1]
    })
  }

  const debut = Math.min(valeurs[0], valeurs[1])
  const fin = Math.max(valeurs[0], valeurs[1])
  const estExact = (coffret: Coffret) => {
    const bornes = plageCoffret(coffret)
    return bornes !== undefined && bornes[0] === debut && bornes[1] === fin
  }
  return coffrets
    .filter((coffret) => {
      const bornes = plageCoffret(coffret)
      return bornes !== undefined &&
        (estExact(coffret) || Math.max(bornes[0], debut) < Math.min(bornes[1], fin))
    })
    .sort((a, b) => Number(estExact(b)) - Number(estExact(a)))
}

// "COFFRET PIGES 0,50 À 1,00" -> { libelle: "Coffret piges", plage: "0,50 à 1,00" }.
export function decouperNomCoffret(nom: string): { libelle: string; plage?: string } {
  const correspondance = nom.match(/^(.*?)\s+(\d+(?:[.,]\d+)?\s+[àa]\s+\d+(?:[.,]\d+)?)$/i)
  if (!correspondance) return { libelle: afficherNomCoffret(nom) }
  return {
    libelle: afficherNomCoffret(correspondance[1]),
    plage: correspondance[2].toLocaleLowerCase('fr-FR'),
  }
}

// Les noms sont en majuscules dans la base : on les affiche en ecriture normale.
export function afficherNomCoffret(nom: string): string {
  const minuscules = nom.toLocaleLowerCase('fr-FR')
  return minuscules.charAt(0).toLocaleUpperCase('fr-FR') + minuscules.slice(1)
}
