// Shapes verified against the live backend (Task 0 discovery, 2026-06-11).
// Every endpoint wraps its payload in ApiEnvelope. Field casing is mixed
// (PascalCase domain fields, camelCase ids) — mirrored here as returned.

// ── Response envelope ─────────────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: ApiError | null
  correlationId: string
}

// ── Document types ────────────────────────────────────────────────────────

// Backend rejects anything else with INVALID_CATEGORY: "Allowed: FLT, DRV, LDX, SQS, COM, ACC, BEE."
export type DocumentCategory = 'FLT' | 'DRV' | 'LDX' | 'SQS' | 'COM' | 'ACC' | 'BEE'

// Observed progression: Uploaded → Indexed (success) or Failed.
// Intermediate statuses may exist; treat unknown non-terminal values as in-flight.
export type PipelineStatus = 'Uploaded' | 'Processing' | 'Indexed' | 'Failed'

export interface DocumentRecord {
  documentId: string
  Category: DocumentCategory | string
  TypeCode: string                 // 'PENDING' until classification completes
  TypeName: string | null
  EntityKey: string
  FileName: string
  ContentType: string
  Status: PipelineStatus | string
  ExpiryDate: string | null        // ISO date string or null
  UploadedBy: string
  UploadedAt: string
  LastModifiedAt: string
  downloadUrl: string | null
}

export interface DocumentsResponse {
  entityKey: string
  count: number
  documents: DocumentRecord[]
}

// ── Audit readiness ───────────────────────────────────────────────────────

export type RequirementStatus = 'Valid' | 'Expiring' | 'Expired' | 'Missing'

export interface Requirement {
  DocumentTypeCode: string
  DocumentTypeName: string
  IsMandatory: boolean
  Status: RequirementStatus | string
  ExpiryDate: string | null
  EntityKey: string | null         // null when no document satisfies the requirement
}

export interface AuditReadinessResponse {
  TenantId: string
  ReadinessPercentage: number
  TotalMandatory: number
  MandatoryPresent: number
  Requirements: Requirement[]
  Expiring: Requirement[]
  Missing: Requirement[]
  GeneratedAt: string
}

// ── Completeness (B-017, live since Sprint 16) ────────────────────────────
// Confirmed shape from backend handover. Wrapped in ApiEnvelope like everything else.
export interface CompletenessResponse {
  entityKey:            string
  documentsRequired:    number
  documentsPresent:     number
  documentsExpiring:    number
  documentsExpired:     number
  documentsMissing:     number
  completenessPercent:  number
}

// ── Notification config (Journey 3) ───────────────────────────────────────
export interface NotificationConfig {
  tenantId:         string
  alertRecipients:  string[]
}

export interface NotificationConfigUpdate {
  alertRecipients: string[]
}

// ── Evidence pack ─────────────────────────────────────────────────────────

// Success responds with a binary download; failures respond with a JSON
// ApiEnvelope (e.g. NO_DOCUMENTS) — check Content-Type before treating as a file.
export interface EvidencePackRequest {
  entityKey: string
}

// ── Upload ────────────────────────────────────────────────────────────────

export interface DocumentUploadRequest {
  entityKey: string
  category: DocumentCategory
  file: File
}

// POST /api/documents/upload responds 202 Accepted
export interface UploadResponse {
  documentId: string
  orchestrationId: string
  status: PipelineStatus | string
}

// ── Credential verification (R6) ──────────────────────────────────────────
// GET /api/students/{studentId}/credentials — data is always an array.
// Empty array = student not found (HTTP 200, success: true). No 404 path.
export type CredentialVerificationStatus = 'Verified' | 'Expired' | 'Pending'

export interface CredentialRecord {
  documentId:         string
  studentId:          string
  documentTypeName:   string
  verificationStatus: CredentialVerificationStatus
  expiryDate:         string | null
  uploadedAt:         string
  fileName:           string
}

// ── Service types ─────────────────────────────────────────────────────────

export type ComplianceService = 'sqas' | 'accreditation' | 'bbbee'

export const SERVICE_CONFIG = {
  sqas: {
    label: 'SQAS',
    tenant: 'RS Carriers',
    threadColor: '#60A5FA',   // Regulatory dark (on navy)
    threadColorLight: '#1E40AF',
    auditReadinessPath: '/api/sqas/audit-readiness',
    evidencePackPath: '/api/sqas/evidence-pack',
  },
  accreditation: {
    label: 'Accreditation',
    tenant: 'Southern Labs',
    threadColor: '#34D399',   // Operational dark
    threadColorLight: '#065F46',
    auditReadinessPath: '/api/accreditation/audit-readiness',
    evidencePackPath: '/api/accreditation/evidence-pack',
  },
  bbbee: {
    label: 'B-BBEE',
    tenant: 'EmpowerDEX',
    threadColor: '#818CF8',   // Legal dark
    threadColorLight: '#312E7A',
    auditReadinessPath: '/api/bbbee/audit-readiness',
    evidencePackPath: '/api/bbbee/evidence-pack',
  },
} as const
