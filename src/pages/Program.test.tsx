import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Program from './Program'
import { ToastProvider } from '../hooks/useToast'
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
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

// OnboardingWizard now saves the generated programme to Supabase before
// navigating to /program (see useSaveProgramme), so by the time this page
// mounts, getActiveProgramme should already find it — this mock simulates
// that success case rather than "no active programme".
vi.mock('../services/programmeService', () => ({
  getActiveProgramme: () =>
    Promise.resolve({ data: { id: 'programme-1', name: 'My Programme' }, error: null }),
  getProgrammePhases: () => Promise.resolve({ data: [], error: null }),
  getProgrammeDays: () => Promise.resolve({ data: [], error: null }),
  getProgrammeConfig: () => Promise.resolve({ data: null, error: null }),
  upsertProgrammeConfig: () => Promise.resolve({ data: null, error: null }),
  updateProgrammeExerciseId: () => Promise.resolve({ data: null, error: null }),
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
  it('shows the freshly-generated preview instantly, then confirms it against Supabase, without ever falling back to the generate form — even under StrictMode', async () => {
    render(
      <StrictMode>
        <ToastProvider>
          <MemoryRouter
            initialEntries={[
              { pathname: '/program', state: { previewResult, alreadySaved: true } },
            ]}
          >
            <Program />
          </MemoryRouter>
        </ToastProvider>
      </StrictMode>
    )

    // Instant fallback: previewResult renders immediately while the
    // getActiveProgramme check (mocked to resolve async) is still in flight.
    expect(screen.getByText(/PREVIEW_STUB/)).toBeInTheDocument()
    expect(screen.queryByText('GENERATE_STUB')).not.toBeInTheDocument()

    // Once Supabase confirms the programme OnboardingWizard already saved,
    // the page hands off from the instant preview to the real programme view
    // — it never falls through to "no programme, please generate one".
    await waitFor(() => {
      expect(screen.getByText('My Programme')).toBeInTheDocument()
    })
    expect(screen.queryByText('GENERATE_STUB')).not.toBeInTheDocument()
  })
})
