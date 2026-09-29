export type Coffret = {
  id: number
  nom: string
  total_piges: number
  code_debut: number | null
  code_fin: number | null
}

export type CoffretPayload = {
  code_debut: number
  code_fin: number
  colonnes: number
  nom?: string
}

export type CoffretCree = Coffret & {
  avertissements: string[]
}

export type Pige = {
  id: number
  coffret_id: number
  code: string
  quantite_initiale: number
  quantite_manquante: number
  statut: 'PRESENTE' | 'MANQUANTE' | 'INSUFFISANTE'
  position_ligne: number
  position_colonne: number
}

export type ControlePayload = {
  pige_id: number
  utilisateur_id: number
  quantite_manquante: number
}

export type Controle = {
  id: number
  pige_id: number
  utilisateur_id: number | null
  statut: string
  quantite_manquante: number
  date: string
}

export type BesoinDetail = {
  pige_id: number
  coffret_nom: string
  quantite_a_commander: number
  quantite_deja_commandee: number
}

// Toutes les piges d'un meme code, quel que soit leur coffret.
export type BesoinGroupe = {
  code: string
  quantite_a_commander: number
  quantite_deja_commandee: number
  detail: BesoinDetail[]
}

export type ExportFormat = 'excel' | 'pdf'

export type ExportLigne = {
  pige_id: number
  coffret_nom: string
  code: string
  quantite: number
}

export type ExportLot = {
  id: number
  date: string
  utilisateur_nom: string
  lignes: ExportLigne[]
}

export type Utilisateur = {
  id: number
  nom: string
  role: string
}

export type UtilisateurPayload = {
  nom: string
}

export type HistoriqueControle = {
  id: number
  utilisateur_nom: string
  utilisateur_role: string
  coffret_nom: string
  code_pige: string
  statut: string
  quantite_manquante: number
  date: string
}
