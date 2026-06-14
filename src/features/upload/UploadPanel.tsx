import { useState, useRef } from 'react'
import { useDocumentUpload } from '@/hooks/useCompliance'
import type { DocumentCategory } from '@/types/api'
import { getThreadColor, getCategoryLabel } from '@/lib/thread-color'
import { PipelineStatus } from './PipelineStatus'

// Backend-validated category codes (Task 0 discovery)
const CATEGORIES: DocumentCategory[] = [
  'FLT', 'DRV', 'LDX', 'SQS', 'COM', 'ACC', 'BEE',
]

interface UploadPanelProps {
  entityKey: string
  onClose: () => void
}

export function UploadPanel({ entityKey, onClose }: UploadPanelProps) {
  const [file, setFile]         = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>('SQS')
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useDocumentUpload()

  const handleUpload = async () => {
    if (!file) return
    try {
      const result = await uploadMutation.mutateAsync({ entityKey, category, file })
      setUploadedId(result.documentId)
    } catch (e) {
      console.error('Upload failed:', e)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(13,31,60,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 8, width: 440,
        fontFamily: '"IBM Plex Sans", sans-serif',
        overflow: 'hidden',
      }}>
        {/* Thread stripe */}
        <div style={{ height: 3, display: 'flex' }}>
          {['#312E7A','#1E40AF','#065F46','#92400E','#7F1D1D'].map((c) => (
            <div key={c} style={{ flex: 1, background: c }} />
          ))}
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{
              fontFamily: '"IBM Plex Sans"', fontSize: 16, fontWeight: 700,
              color: '#0D1F3C', margin: 0, letterSpacing: '-0.02em', flex: 1,
            }}>
              Upload document
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94A3B8', fontSize: 18, lineHeight: 1, padding: 4,
              }}
            >
              ×
            </button>
          </div>

          {/* Entity key (read-only) */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{
              fontSize: 10, fontWeight: 600, color: '#475569', margin: '0 0 4px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Entity
            </p>
            <div style={{
              padding: '8px 10px', background: '#F8FAFC',
              border: '0.5px solid #E2E8F0', borderRadius: 4,
              fontSize: 12, color: '#64748B', fontFamily: '"IBM Plex Mono"',
            }}>
              {entityKey}
            </div>
          </div>

          {/* Category selector */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{
              fontSize: 10, fontWeight: 600, color: '#475569', margin: '0 0 6px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Document category
            </p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = cat === category
                const color = getThreadColor(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                      fontSize: 11, fontWeight: 500, fontFamily: '"IBM Plex Sans"',
                      border: `1px solid ${isSelected ? color : '#E2E8F0'}`,
                      background: isSelected ? `${color}18` : 'transparent',
                      color: isSelected ? color : '#94A3B8',
                    }}
                  >
                    {getCategoryLabel(cat)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* File selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{
              fontSize: 10, fontWeight: 600, color: '#475569', margin: '0 0 4px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Document file (PDF)
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1.5px dashed ${file ? '#1E40AF' : '#E2E8F0'}`,
                borderRadius: 6, padding: '1.25rem', textAlign: 'center',
                cursor: 'pointer', background: file ? '#EFF6FF' : '#FAFAFA',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, fontWeight: 500 }}>
                  {file.name}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                  Click to select a PDF
                </p>
              )}
            </div>
          </div>

          {/* Upload result — poll the pipeline until the document is indexed */}
          {uploadedId && (
            <PipelineStatus entityKey={entityKey} documentId={uploadedId} />
          )}

          {/* Actions */}
          {!uploadedId && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 4, border: '0.5px solid #CBD5E1',
                  background: 'transparent', fontSize: 12, color: '#475569',
                  cursor: 'pointer', fontFamily: '"IBM Plex Sans"',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploadMutation.isPending}
                style={{
                  padding: '8px 16px', borderRadius: 4, border: 'none',
                  background: !file || uploadMutation.isPending ? '#E2E8F0' : '#0D1F3C',
                  color: !file || uploadMutation.isPending ? '#94A3B8' : '#FFFFFF',
                  fontSize: 12, fontWeight: 600, cursor: !file ? 'default' : 'pointer',
                  fontFamily: '"IBM Plex Sans"',
                }}
              >
                {uploadMutation.isPending ? 'Uploading…' : 'Upload document'}
              </button>
            </div>
          )}

          {uploadMutation.isError && (
            <p style={{ fontSize: 11, color: '#DC2626', marginTop: 8, marginBottom: 0 }}>
              {uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : 'Upload failed. Check the console for details.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
