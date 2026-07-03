import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Program from './Program'
import type { GenerateResult } from '../features/programme/GenerateProgrammeView'

const testUser = { id: 'test-user' }
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: testUser }),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../services/programmeService', () => ({
  getActiveProgramme: () => Promise.resolve({ data: null, error: null }),
  getProgrammePhases: () => Promise.resolve({ data: [], error: null }),
  getProgrammeDays: () => Promise.resolve({ data: [], error: null }),
  getProgrammeConfig: () => Promise.resolve({ data: null, error: null }),
  upsertProgrammeConfig: () => Promise.resolve({ data: null, error: null }),
}))

vi.mock('../services/programmeManager', () => ({
  rehydrateProgramme: () => Promise.resolve({ success: true }),
  deleteAllUserData: () => Promise.resolve({ success: true }),
}))

vi.mock('../features/programme/GenerateProgrammeView', () => ({
  default: () => <div>GENERATE_STUB</div>,
}))

vi.mock('../features/programme/ProgrammePreview', () => ({
  default: ({ result }: { result: GenerateResult }) => <div>PREVIEW_STUB goal={result.goal}</div>,
}))

const previewResult: GenerateResult = {
  odinResult: { phases: [] },
  goal: 'hypertrophy',
  equipment: 'full_gym',
  startDate: '2026-07-03',
}

describe('Program - onboarding hand-off preview survives StrictMode double-invoke', () => {
  it('keeps the freshly-generated previewResult after mount, even under StrictMode', async () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={[{ pathname: '/program', state: { previewResult } }]}>
          <Program />
        </MemoryRouter>
      </StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByText(/PREVIEW_STUB/)).toBeInTheDocument()
    })
    expect(screen.queryByText('GENERATE_STUB')).not.toBeInTheDocument()
  })
})
