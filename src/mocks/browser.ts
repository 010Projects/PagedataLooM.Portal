import { setupWorker } from 'msw/browser'
import { handlers } from '@/test/msw/handlers'

// Browser-side MSW worker. Shares the same handler array as the test server
// (src/test/msw/server.ts) so mocked responses stay identical across both.
export const worker = setupWorker(...handlers)
