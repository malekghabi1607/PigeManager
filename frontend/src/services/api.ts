import type {
  BesoinGroupe,
  Coffret,
  CoffretCree,
  CoffretPayload,
  Controle,
  ControlePayload,
  ExportFormat,
  ExportLot,
  Historique,
  Pige,
  ResetResultat,
  Utilisateur,
  UtilisateurPayload,
} from '../types/api'
import { effacerStockage, ecrireStockage, lireStockage } from '../utils/stockage'

// En production, l'interface et l'API sont servies sur la meme origine HTTPS.
// En developpement, Vite utilise le backend sur le port 8000.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? '' : `${window.location.protocol}//${window.location.hostname}:8000`)

// Jeton du code atelier, garde entre deux visites. Le serveur le refuse (401)
// quand il a expire ou que le code a change.
const CLE_JETON = 'pigecontrol.jeton'
let jeton = lireStockage(CLE_JETON)
let surSessionExpiree: (() => void) | undefined

export const aUnJeton = () => Boolean(jeton)

export function definirJeton(valeur: string) {
  jeton = valeur || null
  if (valeur) {
    ecrireStockage(CLE_JETON, valeur)
  } else {
    effacerStockage(CLE_JETON)
  }
}

export function onSessionExpiree(callback: () => void) {
  surSessionExpiree = callback
}

async function messageErreur(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') {
      return body.detail
    }
  } catch {
    // Keep the generic message when the backend did not return JSON.
  }
  return `Erreur API ${response.status}`
}

async function envoyer(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    // Un mauvais code sur /auth/pin n'est pas une session expiree.
    if (response.status === 401 && path !== '/auth/pin') {
      definirJeton('')
      surSessionExpiree?.()
    }
    throw new Error(await messageErreur(response))
  }
  return response
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await envoyer(path, options)
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export function getAuthStatut(): Promise<{ protection: boolean }> {
  return request<{ protection: boolean }>('/auth/statut')
}

export function envoyerCodeAtelier(pin: string): Promise<{ jeton: string }> {
  return request<{ jeton: string }>('/auth/pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

export function getCoffrets(): Promise<Coffret[]> {
  return request<Coffret[]>('/coffrets')
}

export function deleteCoffret(coffretId: number): Promise<void> {
  return request<void>(`/coffrets/${coffretId}`, { method: 'DELETE' })
}

export function createCoffret(payload: CoffretPayload): Promise<CoffretCree> {
  return request<CoffretCree>('/coffrets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function connectUtilisateur(payload: UtilisateurPayload): Promise<Utilisateur> {
  return request<Utilisateur>('/utilisateurs/connexion', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPigesByCoffret(coffretId: number): Promise<Pige[]> {
  return request<Pige[]>(`/coffrets/${coffretId}`)
}

export function createControle(payload: ControlePayload): Promise<Controle> {
  return request<Controle>('/controle', {
    method: 'POST',
    body: JSON.stringify(payload),
    // La sauvegarde continue meme si l'onglet se ferme juste apres.
    keepalive: true,
  })
}

export function getBesoinsGroupes(): Promise<BesoinGroupe[]> {
  return request<BesoinGroupe[]>('/besoins/groupes')
}

export function getHistorique(jours: number): Promise<Historique> {
  return request<Historique>(`/historique?jours=${jours}`)
}

export function getExports(): Promise<ExportLot[]> {
  return request<ExportLot[]>('/exports')
}

export function createExport(utilisateurId: number): Promise<ExportLot> {
  return request<ExportLot>('/exports', {
    method: 'POST',
    body: JSON.stringify({ utilisateur_id: utilisateurId }),
  })
}

export async function getExportFichier(lotId: number, format: ExportFormat): Promise<Blob> {
  return (await envoyer(`/exports/${lotId}/${format}`)).blob()
}

export function getResetApercu(): Promise<ResetResultat> {
  return request<ResetResultat>('/reset/apercu')
}

export function resetPiges(utilisateurId: number): Promise<ResetResultat> {
  return request<ResetResultat>('/reset', {
    method: 'POST',
    body: JSON.stringify({ utilisateur_id: utilisateurId }),
  })
}
