export interface ScanEntry {
  date: string
  bodyFat: string
  weight: string
  muscleMass: string
  delta: string
  isBaseline: boolean
  details: {
    visceralFat: number
    bmr: number
    bodyWater: string
    fatMass: string
    boneMineral: string
    proteinMass: string
  }
  // Present only when the scan was logged from an uploaded file (photo/PDF).
  // Manually-entered scans have no source to view.
  source: { type: 'image' | 'pdf'; url: string } | null
}

export const mockScanHistory: ScanEntry[] = [
  {
    date: '22 Jun 2026',
    bodyFat: '18.4%',
    weight: '82.4kg',
    muscleMass: '68.2kg',
    delta: '-1.1% BF',
    isBaseline: false,
    details: {
      visceralFat: 9,
      bmr: 1840,
      bodyWater: '52%',
      fatMass: '15.2kg',
      boneMineral: '3.4kg',
      proteinMass: '13.1kg',
    },
    // ponytail: mock placeholder asset — real uploads will store the actual file
    source: { type: 'image', url: '/splash.png' },
  },
  {
    date: '24 May 2026',
    bodyFat: '19.5%',
    weight: '84.1kg',
    muscleMass: '67.4kg',
    delta: '-1.1% BF',
    isBaseline: false,
    details: {
      visceralFat: 10,
      bmr: 1815,
      bodyWater: '51%',
      fatMass: '16.4kg',
      boneMineral: '3.4kg',
      proteinMass: '12.9kg',
    },
    source: { type: 'pdf', url: '/splash.png' },
  },
  {
    date: '26 Apr 2026',
    bodyFat: '20.6%',
    weight: '85.9kg',
    muscleMass: '66.8kg',
    delta: 'Baseline',
    isBaseline: true,
    details: {
      visceralFat: 11,
      bmr: 1790,
      bodyWater: '50%',
      fatMass: '17.7kg',
      boneMineral: '3.3kg',
      proteinMass: '12.6kg',
    },
    // Manually logged — no uploaded file to view.
    source: null,
  },
]
