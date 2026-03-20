'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

const supabase = createClient()

async function fetchProfile(userId: string): Promise<Profile | null> {
  const fetchPromise = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('[fetchProfile] Error fetching profile:', {
          userId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        return null
      }
      return data as Profile | null
    })

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.warn('[fetchProfile] Timeout after 6s for userId:', userId)
      resolve(null)
    }, 6000)
  )

  return Promise.race([fetchPromise, timeoutPromise])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Safety net: always unblock after 10s
    const globalTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 10000)

    const init = async () => {
      // Step 1: get current session synchronously (doesn't wait for server)
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id)
        if (mounted) setProfile(profileData)
      }

      if (mounted) {
        clearTimeout(globalTimeout)
        setLoading(false)
      }
    }

    init()

    // Step 2: subscribe to live auth changes (sign in / sign out events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id)
          if (mounted) setProfile(profileData)
        } else {
          setProfile(null)
        }

        if (mounted) {
          clearTimeout(globalTimeout)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(globalTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
