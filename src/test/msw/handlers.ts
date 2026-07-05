import { http, HttpResponse } from 'msw'
import type {
  ApiEnvelope,
  AuditReadinessResponse,
  CredentialRecord,
  DocumentsResponse,
  MeData,
  UploadResponse,
} from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────
// Wrap any data in the backend's response envelope
function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data, error: null, correlationId: 'test-id' }
}

function fail(code: string, message: string): ApiEnvelope<null> {
  return { success: false, data: null, error: { code, message }, correlationId: 'test-id' }
}

// ── Fixtures — shapes and field names from src/types/api.ts ──────────────

const MOCK_AUDIT_READINESS = ok<AuditReadinessResponse>({
  TenantId: 'rsc_prod_001',
  ReadinessPercentage: 40,
  TotalMandatory: 5,
  MandatoryPresent: 2,
  Requirements: [
    {
      DocumentTypeCode: 'SQS-001',
      DocumentTypeName: 'Safety Management Plan',
      IsMandatory: true,
      Status: 'Valid',
      ExpiryDate: '2027-03-28',
      EntityKey: 'RSC-COMP-001',
    },
    {
      DocumentTypeCode: 'SQS-005',
      DocumentTypeName: 'Emergency Response Plan',
      IsMandatory: true,
      Status: 'Expiring',
      ExpiryDate: '2026-06-30',
      EntityKey: 'RSC-COMP-001',
    },
    {
      DocumentTypeCode: 'SQS-002',
      DocumentTypeName: 'Incident Report',
      IsMandatory: true,
      Status: 'Missing',
      ExpiryDate: null,
      EntityKey: null,
    },
  ],
  Expiring: [
    {
      DocumentTypeCode: 'SQS-005',
      DocumentTypeName: 'Emergency Response Plan',
      IsMandatory: true,
      Status: 'Expiring',
      ExpiryDate: '2026-06-30',
      EntityKey: 'RSC-COMP-001',
    },
  ],
  Missing: [
    {
      DocumentTypeCode: 'SQS-002',
      DocumentTypeName: 'Incident Report',
      IsMandatory: true,
      Status: 'Missing',
      ExpiryDate: null,
      EntityKey: null,
    },
  ],
  GeneratedAt: '2026-06-11T12:00:00.0000000Z',
})

const MOCK_DOCUMENTS = ok<DocumentsResponse>({
  entityKey: 'RSC-COMP-001',
  count: 1,
  documents: [
    {
      documentId: '01KSN02DVCWXDV7C19JFWQ2TZC',
      Category: 'SQS',
      TypeCode: 'SQS-001',
      TypeName: 'Safety Management Plan',
      EntityKey: 'RSC-COMP-001',
      FileName: 'SQS-001-safety-management-plan-test.pdf',
      ContentType: 'application/pdf',
      Status: 'Indexed',
      ExpiryDate: '2027-03-28',
      UploadedBy: 'Bheki@rscarriers.co.za',
      UploadedAt: '2026-05-27T15:15:25.174889+00:00',
      LastModifiedAt: '2026-05-27T15:15:29.5078707+00:00',
      downloadUrl: null,
    },
  ],
})

const MOCK_UPLOAD_SUCCESS = ok<UploadResponse>({
  documentId: '01KTVPPTW0Q6QG09GGNPWTPR1S',
  orchestrationId: '5cf41cf0e58845439fd16ecbbc4b84d2',
  status: 'Uploaded',
})

// ── Credential verification fixtures (R6) ─────────────────────────────────
const MOCK_CREDENTIAL_VERIFIED: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEF',
  studentId:          'SLI-STU-001',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Verified',
  expiryDate:         null,
  uploadedAt:         '2026-01-15T09:00:00.000+02:00',
  fileName:           'completion-certificate-stu001.pdf',
}

const MOCK_CREDENTIAL_PENDING: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEG',
  studentId:          'SLI-STU-002',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Pending',
  expiryDate:         null,
  uploadedAt:         '2026-06-14T11:30:00.000+02:00',
  fileName:           'completion-certificate-stu002.pdf',
}

const MOCK_CREDENTIAL_EXPIRED: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEH',
  studentId:          'SLI-STU-003',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Expired',
  expiryDate:         '2025-12-31',
  uploadedAt:         '2025-01-10T08:00:00.000+02:00',
  fileName:           'completion-certificate-stu003.pdf',
}

// ── /api/me fixtures — the locked bootstrap contract ─────────────────────
// PlatformAdmin: tenantName null + []. Non-admin with [] is a DIFFERENT
// state (no services configured) — distinguished by isPlatformAdmin.
export const ME_FIXTURES = {
  tenantMultiService: {
    tenantId: 'rsc_prod_001',
    tenantName: 'RS Carriers',
    isPlatformAdmin: false,
    role: 'TenantAdmin',
    email: 'Bheki@rscarriers.co.za',
    subscribedServices: ['sqas', 'accreditation'],
  },
  tenantSingleService: {
    tenantId: 'rsc_prod_001',
    tenantName: 'RS Carriers',
    isPlatformAdmin: false,
    role: 'ComplianceUser',
    email: 'ops@rscarriers.co.za',
    subscribedServices: ['sqas'],
  },
  platformAdmin: {
    tenantId: 'platform',
    tenantName: null,
    isPlatformAdmin: true,
    role: 'PlatformAdmin',
    email: 'admin@pagedataloom.co.za',
    subscribedServices: [],
  },
  nonAdminNoServices: {
    tenantId: 'newco_prod_001',
    tenantName: 'NewCo Logistics',
    isPlatformAdmin: false,
    role: 'TenantUser',
    email: 'user@newco.co.za',
    subscribedServices: [],
  },
} satisfies Record<string, MeData>

export type MeVariant = keyof typeof ME_FIXTURES | 'failure'

// Per-test variant selection: server.use(meHandler('platformAdmin'))
export function meHandler(variant: MeVariant) {
  return http.get('*/api/me', () =>
    variant === 'failure'
      ? HttpResponse.json(
          fail('ME_LOOKUP_FAILED', 'Could not resolve the signed-in user.'),
          { status: 500 }
        )
      : HttpResponse.json(ok<MeData>(ME_FIXTURES[variant]))
  )
}

// ── Handlers ──────────────────────────────────────────────────────────────
// Unsubscribed services return the real backend code (SUBSCRIPTION_INACTIVE)
// with HTTP 403, exactly as observed in Portal-C discovery.
export const handlers = [
  // Default /api/me — tenant user with two services; tests override per variant
  meHandler('tenantMultiService'),

  http.get('*/api/sqas/audit-readiness', () =>
    HttpResponse.json(MOCK_AUDIT_READINESS)),

  http.get('*/api/accreditation/audit-readiness', () =>
    HttpResponse.json(
      fail('SUBSCRIPTION_INACTIVE', "Tenant 'rsc_prod_001' does not have an active subscription to service 'ACCREDITATION'."),
      { status: 403 }
    )),

  http.get('*/api/bbbee/audit-readiness', () =>
    HttpResponse.json(
      fail('SUBSCRIPTION_INACTIVE', "Tenant 'rsc_prod_001' does not have an active subscription to service 'BBBEE'."),
      { status: 403 }
    )),

  http.get('*/api/documents/:entityKey', () =>
    HttpResponse.json(MOCK_DOCUMENTS)),

  http.post('*/api/documents/upload', () =>
    HttpResponse.json(MOCK_UPLOAD_SUCCESS, { status: 202 })),

  http.post('*/api/sqas/evidence-pack', () =>
    HttpResponse.json(
      fail('NO_DOCUMENTS', 'No current SQS documents found for this tenant.'),
      { status: 404 }
    )),

  // B-017 completeness endpoint
  http.get('*/api/compliance/completeness/:entityKey', ({ params }) =>
    HttpResponse.json(ok({
      entityKey: params.entityKey,
      documentsRequired: 5,
      documentsPresent: 2,
      documentsExpiring: 1,
      documentsExpired: 0,
      documentsMissing: 3,
      completenessPercent: 40.0,
    }))),

  // Journey 3 notification config
  http.get('*/api/mgmt/tenants/:tenantId/notification-config', () =>
    HttpResponse.json(ok({
      tenantId: 'rsc_prod_001',
      alertRecipients: ['ops@rscarriers.co.za'],
    }))),

  http.put('*/api/mgmt/tenants/:tenantId/notification-config', async ({ request }) => {
    const body = await request.json() as { alertRecipients: string[] }
    return HttpResponse.json(ok({
      tenantId: 'rsc_prod_001',
      alertRecipients: body.alertRecipients,
    }))
  }),

  // R6 credential verification — not-found is HTTP 200 with an empty array
  http.get('*/api/students/:studentId/credentials', ({ params }) => {
    const studentId = String(params.studentId)
    if (studentId === 'SLI-STU-001') return HttpResponse.json(ok([MOCK_CREDENTIAL_VERIFIED]))
    if (studentId === 'SLI-STU-002') return HttpResponse.json(ok([MOCK_CREDENTIAL_PENDING]))
    if (studentId === 'SLI-STU-003') return HttpResponse.json(ok([MOCK_CREDENTIAL_EXPIRED]))
    return HttpResponse.json(ok<CredentialRecord[]>([]))
  }),
]
