import type {
  Besoin,
  Coffret,
  CoffretCree,
  CoffretPayload,
  Controle,
  ControlePayload,
  ExportFormat,
  ExportLot,
  HistoriqueControle,
  Pige,
  Utilisateur,
  UtilisateurPayload,
} from '../types/api'

// En production, l'interface et l'API sont servies sur la meme origine HTTPS.
// En developpement, Vite utilise le backend sur le port 8000.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? '' : `${window.location.protocol}//${window.location.hostname}:8000`)

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    let message = `Erreur API ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') {
        message = body.detail
      }
    } catch {
      // Keep the generic message when the backend did not return JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
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
  })
}

export function getBesoins(): Promise<Besoin[]> {
  return request<Besoin[]>('/besoins')
}

export function getHistorique(): Promise<HistoriqueControle[]> {
  return request<HistoriqueControle[]>('/historique')
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

export function getExportUrl(lotId: number, format: ExportFormat): string {
  return `${API_BASE_URL}/exports/${lotId}/${format}`
}
