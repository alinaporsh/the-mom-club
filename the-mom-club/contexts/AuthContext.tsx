import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Role = "guest" | "free" | "member" | "admin";

type AuthState = {
  session: { user: { id: string; email?: string } } | null;
  isLoading: boolean;
  isGuest: boolean;
  role: Role | null;
  profile: { 
    name: string | null;
    status: "pregnant" | "new_mom" | null;
    onboarding_completed_at: string | null;
  } | null;
};

const defaultState: AuthState = {
  session: null,
  isLoading: true,
  isGuest: false,
  role: null,
  profile: null,
};

const AuthContext = createContext<{
  state: AuthState;
  setGuest: () => void;
  refreshProfileAndRole: () => Promise<void>;
}>({
  state: defaultState,
  setGuest: () => {},
  refreshProfileAndRole: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  const refreshProfileAndRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState((s) => ({ ...s, profile: null, role: null }));
      return;
    }
    
    // For new signups, the profile might not exist yet (trigger delay)
    // For membership updates, we need to retry to ensure we get the latest role
    // Retry a few times to allow database changes to be reflected
    let profileRes = null;
    let membershipRes = null;
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      const [profileResult, membershipResult] = await Promise.all([
        supabase.from("profiles").select("name, status, onboarding_completed_at").eq("id", user.id).single(),
        supabase.from("memberships").select("role").eq("user_id", user.id).single(),
      ]);
      
      // Check if both queries succeeded
      const profileExists = profileResult.data && !profileResult.error;
      const membershipExists = membershipResult.data && !membershipResult.error;
      
      // If profile exists and membership query succeeded (even if no membership yet), we're done
      if (profileExists && (membershipExists || membershipResult.error?.code === "PGRST116")) {
        profileRes = profileResult;
        membershipRes = membershipResult;
        break;
      }
      
      // If profile doesn't exist and we're on first attempt, wait a bit for trigger
      if (retries === 0 && profileResult.error?.code === "PGRST116") {
        // PGRST116 = no rows returned, profile doesn't exist yet
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (retries > 0) {
        // On subsequent retries, wait less (for membership updates)
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      retries++;
    }
    
    // Set state with whatever we found
    // For membership: use the role from membership data if available, otherwise default to "free"
    // Important: Only default to "free" if membership query succeeded but returned no data
    // If membership query failed with an error (not PGRST116), we should retry or handle differently
    let role: Role = "free";
    if (membershipRes?.data?.role) {
      role = membershipRes.data.role as Role;
    } else if (membershipRes?.error && membershipRes.error.code !== "PGRST116") {
      // If there was an actual error (not just "no rows"), log it but still default to free
      console.warn("Membership query error:", membershipRes.error);
    }
    
    setState((s) => ({
      ...s,
      profile: profileRes?.data ?? null,
      role: role,
    }));
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setState((s) => ({
          ...s,
          session: { user: session.user },
          isLoading: false,
          isGuest: false,
        }));
        refreshProfileAndRole();
      } else {
        setState((s) => ({
          ...s,
          session: null,
          isLoading: false,
          profile: null,
          role: null,
          // Default to non-guest; explicit guest mode is enabled via setGuest().
          isGuest: false,
        }));
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState((s) => ({
        ...s,
        session: session ? { user: session.user } : null,
        profile: null,
        role: null,
        // Any real Supabase session means the user is not a guest.
        isGuest: session ? false : s.isGuest,
      }));
      if (session?.user) refreshProfileAndRole();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setGuest = () => {
    setState((s) => ({ ...s, isGuest: true, session: null, profile: null, role: "guest" }));
  };

  const value = {
    state: { ...state, role: state.isGuest ? "guest" : state.role },
    setGuest,
    refreshProfileAndRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useCanPost(): boolean {
  const { state } = useAuth();
  return state.role === "free" || state.role === "member" || state.role === "admin";
}

export function useCanBook(): boolean {
  const { state } = useAuth();
  return state.role === "member" || state.role === "admin";
}

export function useIsAdmin(): boolean {
  const { state } = useAuth();
  return state.role === "admin";
}
