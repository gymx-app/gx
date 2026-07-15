import { useState, useCallback, useMemo } from 'react'
import TopBar from '../components/layout/TopBar'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { BottomSheet } from '../components/ui'
import ProfileEditSheet from '../components/ProfileEditSheet'
import HealthDetailsSheet from '../components/HealthDetailsSheet'
import { colors } from '../styles/tokens'
import { Heart, Bell, ShieldCheck, Link, Trash2, LogOut, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { version } from '../../package.json'

const DESTRUCTIVE_COLOR = colors.error

function getInitials(email: string, fullName?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
    return parts[0]![0]!.toUpperCase()
  }
  return email[0]!.toUpperCase()
}

function getDisplayName(email: string, fullName?: string): string {
  if (fullName) return fullName
  return email.split('@')[0] ?? email
}

interface AccountRowProps {
  label: string
  icon: LucideIcon
  onPress: () => void
  destructive?: boolean | undefined
  showDivider?: boolean | undefined
}

function AccountRow({
  label,
  icon: Icon,
  onPress,
  destructive,
  showDivider = true,
}: AccountRowProps) {
  const iconColor = destructive ? DESTRUCTIVE_COLOR : colors.muted
  const textColor = destructive ? DESTRUCTIVE_COLOR : colors.text

  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 active:opacity-60 transition-opacity duration-100"
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: showDivider ? `1px solid ${colors.border}` : 'none',
        padding: '14px 16px',
        minHeight: 52,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon size={20} strokeWidth={1.5} color={iconColor} style={{ flexShrink: 0 }} />
      <span className="font-['DM_Sans'] text-[14px] flex-1 text-left" style={{ color: textColor }}>
        {label}
      </span>
      <ChevronRight size={16} color={colors.muted} style={{ flexShrink: 0 }} />
    </button>
  )
}

function SectionHeader({ children }: { children: string }) {
  return (
    <p
      className="font-['DM_Sans'] font-bold uppercase tracking-[2px]"
      style={{
        fontSize: 11,
        color: colors.muted,
        paddingTop: 24,
        paddingBottom: 8,
        paddingLeft: 4,
      }}
    >
      {children}
    </p>
  )
}

interface SectionConfig {
  title: string
  items: {
    label: string
    icon: LucideIcon
    onPress: () => void
    destructive?: boolean
  }[]
}

export default function Account() {
  const { user, signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmSheet, setConfirmSheet] = useState<'signout' | 'delete' | null>(null)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [healthDetailsOpen, setHealthDetailsOpen] = useState(false)
  const [displayProfile, setDisplayProfile] = useState<{ full_name: string } | null>(null)

  const handleSignOut = useCallback(async () => {
    setConfirmSheet(null)
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      setLoggingOut(false)
    }
  }, [signOut])

  const handleDeleteData = useCallback(async () => {
    setConfirmSheet(null)
    setLoggingOut(true)
    try {
      const uid = user?.id
      if (!uid) return

      const tables = [
        'exercise_logs',
        'warmup_logs',
        'checklist_logs',
        'workout_sessions',
        'body_metrics',
        'hydration_logs',
        'inbody_logs',
        'apple_health_logs',
        'body_measurements',
        'programme_config',
        'user_injuries',
        'user_chronic_conditions',
        'fitness_assessments',
        'programmes',
        'user_profiles',
      ] as const

      for (const table of tables) {
        await supabase.from(table).delete().eq('user_id', uid)
      }

      await signOut()
    } finally {
      setLoggingOut(false)
    }
  }, [user?.id, signOut])

  const sections: SectionConfig[] = useMemo(
    () => [
      {
        title: 'APP SETTINGS',
        items: [
          { label: 'Health Details', icon: Heart, onPress: () => setHealthDetailsOpen(true) },
          { label: 'Notifications', icon: Bell, onPress: () => {} },
          { label: 'Privacy', icon: ShieldCheck, onPress: () => {} },
        ],
      },
      {
        title: 'CONNECTED',
        items: [{ label: 'Linked Apps', icon: Link, onPress: () => {} }],
      },
      {
        title: 'ACCOUNT',
        items: [
          {
            label: 'Delete App Data',
            icon: Trash2,
            onPress: () => setConfirmSheet('delete'),
            destructive: true,
          },
          {
            label: loggingOut ? 'Signing out…' : 'Sign Out',
            icon: LogOut,
            onPress: () => setConfirmSheet('signout'),
            destructive: true,
          },
        ],
      },
    ],
    [loggingOut]
  )

  const email = user?.email ?? ''
  const fullName =
    displayProfile?.full_name ?? (user?.user_metadata?.full_name as string | undefined)
  const initials = getInitials(email, fullName)
  const displayName = getDisplayName(email, fullName)

  return (
    <>
      <TopBar title="ACCOUNT" />
      <div
        className="flex-1 overflow-y-auto px-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        {/* Profile card */}
        <button
          onClick={() => setProfileSheetOpen(true)}
          className="w-full flex items-center gap-4 active:opacity-70 transition-opacity duration-100 mt-4"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: '16px 16px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url as string}
              alt=""
              className="rounded-full"
              style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full font-['Bebas_Neue'] text-[20px] tracking-[1px]"
              style={{
                width: 48,
                height: 48,
                background: colors.accent,
                color: colors.white,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p
              className="font-['DM_Sans'] text-[16px] font-medium truncate"
              style={{ color: colors.text }}
            >
              {displayName}
            </p>
            <p className="font-['DM_Sans'] text-[13px] truncate" style={{ color: colors.muted }}>
              {email}
            </p>
          </div>
          <ChevronRight size={16} color={colors.muted} style={{ flexShrink: 0 }} />
        </button>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title}>
            <SectionHeader>{section.title}</SectionHeader>
            <div
              style={{
                background: colors.surface,
                borderRadius: 14,
                overflow: 'hidden',
                border: `1px solid ${colors.border}`,
              }}
            >
              {section.items.map((item, i) => (
                <AccountRow
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  onPress={item.onPress}
                  destructive={item.destructive}
                  showDivider={i < section.items.length - 1}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <footer className="text-center mt-12" style={{ opacity: 0.5 }}>
          <p className="font-['DM_Sans']" style={{ fontSize: 11, color: colors.muted }}>
            v{version} · Viking Wellness Technology Pvt. Ltd.
          </p>
        </footer>
      </div>

      {/* Sign Out confirmation */}
      <BottomSheet isOpen={confirmSheet === 'signout'} onClose={() => setConfirmSheet(null)}>
        <div className="p-6 text-center">
          <LogOut size={32} color={colors.muted} className="mx-auto mb-3" />
          <h3 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-text mb-2">
            SIGN OUT
          </h3>
          <p className="text-[13px] text-text-secondary mb-6">
            Are you sure you want to sign out? Your cached data will be cleared.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmSheet(null)}
              className="flex-1 py-3 font-['Bebas_Neue'] text-[16px] tracking-[1px] text-text-secondary active:opacity-70"
              style={{ background: colors.surface2, borderRadius: 12, border: 'none' }}
            >
              CANCEL
            </button>
            <button
              onClick={() => void handleSignOut()}
              className="flex-1 py-3 font-['Bebas_Neue'] text-[16px] tracking-[1px] text-text active:opacity-70"
              style={{ background: DESTRUCTIVE_COLOR, borderRadius: 12, border: 'none' }}
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete Data confirmation */}
      <BottomSheet isOpen={confirmSheet === 'delete'} onClose={() => setConfirmSheet(null)}>
        <div className="p-6 text-center">
          <Trash2 size={32} color={colors.error} className="mx-auto mb-3" />
          <h3 className="font-['Bebas_Neue'] text-[22px] tracking-[2px] text-text mb-2">
            DELETE ALL DATA
          </h3>
          <p className="text-[13px] text-text-secondary mb-6">
            This will permanently delete all your workout logs, programme data and body
            measurements. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmSheet(null)}
              className="flex-1 py-3 font-['Bebas_Neue'] text-[16px] tracking-[1px] text-text-secondary active:opacity-70"
              style={{ background: colors.surface2, borderRadius: 12, border: 'none' }}
            >
              CANCEL
            </button>
            <button
              onClick={() => void handleDeleteData()}
              className="flex-1 py-3 font-['Bebas_Neue'] text-[16px] tracking-[1px] text-text active:opacity-70"
              style={{ background: colors.error, borderRadius: 12, border: 'none' }}
            >
              DELETE
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Profile Edit Sheet */}
      <ProfileEditSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        onProfileUpdate={(profile) => setDisplayProfile(profile)}
      />

      {/* Health Details Sheet */}
      <HealthDetailsSheet open={healthDetailsOpen} onClose={() => setHealthDetailsOpen(false)} />
    </>
  )
}
