export interface BackendHealth {
  status: string
  application: string
  environment: string
}

export interface DatabaseHealth {
  status: string
  database: string
  database_name: string
}

async function getJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/api-backend${endpoint}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`${endpoint} returned HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getBackendHealth() {
  return getJson<BackendHealth>('/health')
}

export function getDatabaseHealth() {
  return getJson<DatabaseHealth>('/health/database')
}
