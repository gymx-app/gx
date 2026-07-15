import { colors, radius } from '../../../styles/tokens'

export const INPUT_STYLE: React.CSSProperties = {
  background: colors.surface2,
  border: `1.5px solid ${colors.border}`,
  borderRadius: radius.input,
}

export const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Australia',
  'Canada',
  'Singapore',
  'Germany',
  'France',
  'Netherlands',
  'New Zealand',
  'Ireland',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Pakistan',
  'Bangladesh',
  'Sri Lanka',
  'Nepal',
  'Philippines',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Vietnam',
  'Japan',
  'South Korea',
  'China',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'Italy',
  'Spain',
  'Portugal',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Brazil',
  'Mexico',
  'Argentina',
  'Egypt',
  'Turkey',
  'Israel',
  'Russia',
  'Other',
]

export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseFloat(value)
  return isNaN(n) ? null : n
}

export function numToStr(v: number | null | undefined): string {
  return v == null ? '' : String(v)
}
