
export interface AuthenticatedUser {
  id: string
  email: string
  full_name: string
  is_verified: boolean
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
}

export interface NetworkScope {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: 'active' | 'disabled'
  cidr_ranges: string[]
  created_at: string
  updated_at: string
}

export type DiscoveryProfile =
  | 'host_discovery'
  | 'tcp_service_discovery'

export type DiscoveryScanStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface DiscoveryScan {
  id: number
  organization_id: string
  network_scope_id: string
  target: string
  scan_type: string
  status: DiscoveryScanStatus
  started_at: string
  completed_at: string | null
  error_message: string | null
  scanner_name: string | null
  scanner_version: string | null
}

export interface DiscoveryScanList {
  items: DiscoveryScan[]
  total: number
}

export interface MonitoringStats {
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'failed'
  interface: string | null
  captured_packets: number
  queued_packets: number
  processed_packets: number
  dropped_packets: number
  ignored_packets: number
  processing_errors: number
  queue_size: number
}

export interface NIDSAlert {
  id: string
  rule_id: string
  name: string
  severity: string
  occurred_at: string
  source_ip: string
  destination_ip: string
  description: string
  evidence: string
  status: 'open' | 'acknowledged' | 'resolved'
}

export interface NIDSAlertList {
  items: NIDSAlert[]
  total: number
}

export class BackendRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'BackendRequestError'
    this.status = status
  }
}

async function authenticatedRequest<T>(
  endpoint: string,
  idToken: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api-backend/api/v1${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)

    let detail = `Backend request failed (HTTP ${response.status}).`
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const rawDetail = (body as { detail: unknown }).detail
      if (typeof rawDetail === 'string') {
        detail = rawDetail
      } else if (Array.isArray(rawDetail)) {
        detail = rawDetail
          .map((item: { msg?: string; loc?: string[] }) =>
            item.msg ? `${item.loc?.slice(-1)[0] ?? 'field'}: ${item.msg}` : JSON.stringify(item),
          )
          .join('; ')
      }
    }

    throw new BackendRequestError(detail, response.status)
  }

  return response.json() as Promise<T>
}

export function synchronizeUser(
  fullName: string,
  idToken: string,
): Promise<AuthenticatedUser> {
  return authenticatedRequest<AuthenticatedUser>(
    '/auth/sync',
    idToken,
    {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName }),
    },
  )
}

export function getAuthenticatedUser(
  idToken: string,
): Promise<AuthenticatedUser> {
  return authenticatedRequest<AuthenticatedUser>(
    '/auth/me',
    idToken,
  )
}

export function getOrganizations(
  idToken: string,
): Promise<Organization[]> {
  return authenticatedRequest<Organization[]>(
    '/organizations',
    idToken,
  )
}

export function createOrganization(
  name: string,
  slug: string,
  idToken: string,
): Promise<Organization> {
  return authenticatedRequest<Organization>(
    '/organizations',
    idToken,
    {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    },
  )
}

export function getNetworkScopes(
  organizationId: string,
  idToken: string,
): Promise<NetworkScope[]> {
  return authenticatedRequest<NetworkScope[]>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes`,
    idToken,
  )
}

export function createNetworkScope(
  organizationId: string,
  name: string,
  description: string,
  cidrRanges: string[],
  idToken: string,
): Promise<NetworkScope> {
  return authenticatedRequest<NetworkScope>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes`,
    idToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description.trim() || null,
        cidr_ranges: cidrRanges,
      }),
    },
  )
}

export function createDiscoveryScan(
  organizationId: string,
  scopeId: string,
  targetCidr: string,
  profile: DiscoveryProfile,
  idToken: string,
): Promise<DiscoveryScan> {
  return authenticatedRequest<DiscoveryScan>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/scans`,
    idToken,
    {
      method: 'POST',
      body: JSON.stringify({
        target_cidr: targetCidr,
        profile,
      }),
    },
  )
}

export function getDiscoveryScans(
  organizationId: string,
  scopeId: string,
  idToken: string,
  limit = 50,
  offset = 0,
): Promise<DiscoveryScanList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return authenticatedRequest<DiscoveryScanList>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/scans?${query.toString()}`,
    idToken,
  )
}

export function getMonitoringStatus(organizationId: string, scopeId: string, idToken: string) {
  return authenticatedRequest<MonitoringStats>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/monitoring/status`, idToken,
  )
}

export function startMonitoring(organizationId: string, scopeId: string, networkInterface: string, idToken: string) {
  return authenticatedRequest<MonitoringStats>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/monitoring/start`, idToken,
    { method: 'POST', body: JSON.stringify({ interface: networkInterface }) },
  )
}

export function stopMonitoring(organizationId: string, scopeId: string, idToken: string) {
  return authenticatedRequest<MonitoringStats>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/monitoring/stop`, idToken,
    { method: 'POST' },
  )
}

export function getNIDSAlerts(organizationId: string, scopeId: string, idToken: string) {
  return authenticatedRequest<NIDSAlertList>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/nids-alerts?limit=50`, idToken,
  )
}

export function updateNIDSAlertStatus(organizationId: string, scopeId: string, alertId: string, status: NIDSAlert['status'], idToken: string) {
  return authenticatedRequest<NIDSAlert>(
    `/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(scopeId)}/nids-alerts/${encodeURIComponent(alertId)}/status`, idToken,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  )
}
