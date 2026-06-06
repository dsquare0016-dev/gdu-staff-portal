import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserRole } from '@/types';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  permissions: string[];
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string, selectedRole?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isICT: boolean;
  isTechnicalAssistant: boolean;
  isAdmin: boolean;
  isAccounts: boolean;
  isDirector: boolean;
  isStaff: boolean;
  isAdhoc: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (module: string, action?: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Helper: wrap a Supabase PostgrestBuilder into a real Promise
 * so that Promise.race works correctly.
 */
function toRealPromise<T>(builder: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    builder.then(resolve, reject);
  });
}

/**
 * Helper: race a Supabase query against a timeout.
 * Returns { data, error } on success, throws on timeout.
 */
async function queryWithTimeout<T>(
  builder: PromiseLike<{ data: T; error: any }>,
  timeoutMs: number,
  label: string
): Promise<{ data: T; error: any }> {
  const queryPromise = toRealPromise(builder);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([queryPromise, timeoutPromise]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Flag to skip onAuthStateChange profile fetch when signIn already handles it
  const signInHandledRef = useRef(false);

  useEffect(() => {
    let active = true;
    let lastFetchedUserId: string | null = null;

    const handleSession = async (currentSession: Session | null) => {
      if (!active) return;
      
      if (currentSession?.user) {
        const currentUser = currentSession.user;
        setSession(currentSession);
        setUser(currentUser);
        
        // Skip profile fetch if signIn already handled it
        if (signInHandledRef.current) {
          console.log('[Auth] Skipping onAuthStateChange profile fetch (signIn handled it)');
          signInHandledRef.current = false;
          return;
        }
        
        // Only fetch profile if user has changed
        if (lastFetchedUserId !== currentUser.id) {
          lastFetchedUserId = currentUser.id;
          await fetchProfileForContext(currentUser.id, currentUser.email);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setPermissions([]);
        lastFetchedUserId = null;
        setLoading(false);
      }
    };

    // Initialize session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] Initial session error:', error);
        if (active) {
          setAuthError(error.message);
          setLoading(false);
        }
        return;
      }
      if (active) {
        handleSession(session);
      }
    }).catch((err) => {
      console.error('[Auth] Critical error during session check:', err);
      if (active) {
        setAuthError(err.message || 'Failed to initialize authentication');
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change event:', event);
        if (active) {
          if (event === 'SIGNED_OUT') {
            setAuthError(null);
          }
          await handleSession(session);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Context-level profile fetch used by onAuthStateChange and initial session check.
   * Uses specific columns and proper Promise wrapping for reliability.
   */
  const fetchProfileForContext = async (userId: string, email?: string) => {
    if (!userId) return;
    
    try {
      console.log('[Auth] Context profile fetch for user:', userId);
      
      let profileData: any = null;

      // Strategy 1: Query by ID (Priority)
      try {
        const { data, error } = await queryWithTimeout(
          supabase.from('profiles')
            .select('id,email,full_name,role,is_active,avatar_url')
            .eq('id', userId)
            .maybeSingle(),
          15000,
          'Profile query by ID'
        );
        if (error) {
          console.warn('[Auth] Context profile by ID error:', error.message);
        } else {
          profileData = data;
        }
      } catch (e: any) {
        console.warn('[Auth] Context profile by ID failed/timed out:', e.message);
      }

      // Strategy 2: Query by email (Fallback)
      if (!profileData && email) {
        try {
          const { data, error } = await queryWithTimeout(
            supabase.from('profiles')
              .select('id,email,full_name,role,is_active,avatar_url')
              .eq('email', email)
              .maybeSingle(),
            10000,
            'Profile query by email'
          );
          if (error) {
            console.warn('[Auth] Context profile by email error:', error.message);
          } else {
            profileData = data;
          }
        } catch (e: any) {
          console.warn('[Auth] Context profile by email failed/timed out:', e.message);
        }
      }

      if (!profileData) {
        console.warn('[Auth] No profile found in context fetch');
        // Let's retry once with a longer timeout before giving up
        console.log('[Auth] Retrying profile fetch in 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: retryData, error: retryError } = await queryWithTimeout(
          supabase.from('profiles')
            .select('id,email,full_name,role,is_active,avatar_url')
            .eq('id', userId)
            .maybeSingle(),
          20000,
          'Profile retry query'
        );
          
        if (retryData) {
          profileData = retryData;
        } else {
          setAuthError('No portal profile record found. Please contact an administrator.');
          setLoading(false);
          return;
        }
      }

      const isActive = profileData.is_active !== false;
      if (!isActive) {
        console.warn('[Auth] Account inactive');
        setAuthError('This account is inactive. Please contact your supervisor.');
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setAuthError(null);

      // Non-blocking background fetches
      void fetchStaffRecordBackground(userId);
      if (profileData?.role) {
        void fetchPermissions(profileData.role);
      }
      
      console.log('[Auth] Context profile fetch complete');
    } catch (error: any) {
      console.error('[Auth] fetchProfileForContext exception:', error.message);
      setAuthError(error.message || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch staff record in background (non-blocking).
   */
  const fetchStaffRecordBackground = async (userId: string) => {
    try {
      const staffData = (await queryWithTimeout(
        (supabase.from('staff_records') as any)
          .select('id')
          .eq('user_id', userId)
          .maybeSingle(),
        3000,
        'Staff record query'
      ) as any)?.data;
      if (staffData?.id) {
        setProfile(prev => prev ? { ...prev, staff_id: staffData.id } : null);
      }
    } catch (e) {
      console.warn('[Auth] Background staff record fetch skipped:', e);
    }
  };

  const fetchPermissions = async (roleSlug: string) => {
    try {
      console.log('[Auth] Fetching permissions for role:', roleSlug);
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('slug', roleSlug)
        .maybeSingle();

      if (roleError) {
        console.error('[Auth] Role fetch error:', roleError);
        return;
      }

      if (roleData) {
        const { data: permData, error: permError } = await supabase
          .from('role_permissions')
          .select('permissions(name)')
          .eq('role_id', (roleData as any).id);

        if (permError) {
          console.error('[Auth] Permissions fetch error:', permError);
          return;
        }

        if (permData) {
          const permList = permData
            .map((p: any) => p.permissions?.name)
            .filter(Boolean);
          console.log('[Auth] Permissions loaded:', permList.length);
          setPermissions(permList);
        }
      } else {
        console.warn(`[Auth] Role with slug ${roleSlug} not found in database.`);
        setPermissions([]);
      }
    } catch (error) {
      console.error('[Auth] Error fetching permissions:', error);
      setPermissions([]);
    }
  };

  const normalizeRole = (role: string | null | undefined): string => {
    if (!role) return '';
    const r = role.toLowerCase().replace(/[\s_-]/g, '');
    if (r === 'superadmin' || r === 'super_admin' || r === 'superadminaccount') return 'super_admin';
    if (r === 'admin' || r === 'administrator') return 'admin';
    if (r === 'staff' || r === 'staffuser') return 'staff';
    if (r === 'dg' || r === 'director' || r === 'directorgeneral') return 'dg';
    if (r === 'ta' || r === 'technicalassistant' || r === 'technicaladviser') return 'technical_assistant';
    if (r === 'accounts' || r === 'account' || r === 'accountant') return 'accounts';
    if (r === 'ict' || r === 'support' || r === 'ictsupport') return 'ict';
    return role.toLowerCase().replace(/\s+/g, '_');
  };

  const signIn = async (emailOrId: string, password: string, selectedRole?: UserRole) => {
    console.log('[Auth] === SIGN IN START ===');
    console.log('[Auth] Input:', emailOrId, '| Role:', selectedRole);
    
    setLoading(true);
    setAuthError(null);

    try {
      let email = emailOrId.toLowerCase().trim();
      
      // Support Staff ID login: if input doesn't look like an email, treat as Staff ID
      if (!email.includes('@')) {
        console.log('[Auth] Input looks like Staff ID. Looking up email...');
        const { data: staffData, error: staffError } = await supabase
          .from('staff_records')
          .select('email')
          .eq('readable_id', emailOrId.toUpperCase().trim())
          .maybeSingle();
        
        if (staffError) {
          console.error('[Auth] Staff ID lookup error:', staffError.message);
          setLoading(false);
          return { error: new Error('Error looking up Staff ID. Please try again.') };
        }
        
        if (!staffData?.email) {
          console.error('[Auth] Staff ID not found:', emailOrId);
          setLoading(false);
          return { error: new Error('Staff ID not found. Please check and try again.') };
        }
        
        email = staffData.email;
        console.log('[Auth] Staff ID found. Email:', email);
      }

      // Strict role validation for superadmin email
      if (email === 'superadmin@portal.gdu.gov.ng' && selectedRole !== 'super_admin') {
        setLoading(false);
        return { error: new Error("This account is not authorized for the selected role. Please select Super Admin.") };
      }

      // Step 1: Authenticate with Supabase
      console.log('[Auth] Step 1: signInWithPassword...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) {
        console.error('[Auth] Auth failed:', authError.message);
        setLoading(false);
        return { error: authError };
      }

      if (!authData.user) {
        console.error('[Auth] No user returned');
        setLoading(false);
        return { error: new Error('Authentication failed - no user returned') };
      }

      const authedUser = authData.user;
      console.log('[Auth] Step 1 DONE. User ID:', authedUser.id);
      console.log('AUTH_SUCCESS');

      // Tell onAuthStateChange to skip its own profile fetch
      signInHandledRef.current = true;

      // Step 2: Fetch profile with improved reliability
      console.log('[Auth] Step 2: Fetching profile...');
      let profileData: any = null;

      // Strategy 1: Query by ID (Priority)
      try {
        const { data, error } = await queryWithTimeout(
          supabase.from('profiles')
            .select('id,email,full_name,role,is_active,avatar_url')
            .eq('id', authedUser.id)
            .maybeSingle(),
          15000,
          'SignIn profile by ID'
        );
        console.log('[Auth] Profile by ID result:', data ? 'found' : 'null', 'error:', error?.message || 'none');
        if (!error && data) profileData = data;
      } catch (e: any) {
        console.warn('[Auth] Profile by ID failed/timed out:', e.message);
      }

      // Strategy 2: Query by email (Fallback)
      if (!profileData && authedUser.email) {
        console.log('[Auth] Fallback: profile by email...');
        try {
          const { data, error } = await queryWithTimeout(
            supabase.from('profiles')
              .select('id,email,full_name,role,is_active,avatar_url')
              .eq('email', authedUser.email)
              .maybeSingle(),
            10000,
            'SignIn profile by email'
          );
          console.log('[Auth] Profile by email result:', data ? 'found' : 'null', 'error:', error?.message || 'none');
          if (!error && data) profileData = data;
        } catch (e: any) {
          console.warn('[Auth] Profile by email failed/timed out:', e.message);
        }
      }

      // Final Retry if still nothing
      if (!profileData) {
        console.log('[Auth] Final retry for profile...');
        try {
          const { data, error } = await queryWithTimeout(
            supabase.from('profiles')
              .select('id,email,full_name,role,is_active,avatar_url')
              .eq('id', authedUser.id)
              .maybeSingle(),
            15000,
            'SignIn profile final retry'
          );
          if (!error && data) profileData = data;
        } catch (e) {
          console.error('[Auth] Final retry failed');
        }
      }

      if (!profileData) {
        console.error('[Auth] No profile found for user:', authedUser.id);
        await supabase.auth.signOut().catch(() => {});
        setLoading(false);
        return { error: new Error('Login successful, but no profile record was found. Please contact an administrator.') };
      }

      console.log('[Auth] Step 2 DONE. Profile:', JSON.stringify(profileData));
      console.log('PROFILE_FOUND');

      // Step 3: Verify role
      console.log('[Auth] Step 3: Verifying role...');
      if (!profileData.is_active && profileData.is_active !== undefined && profileData.is_active !== null) {
        console.warn('[Auth] Account inactive');
        await supabase.auth.signOut().catch(() => {});
        setLoading(false);
        return { error: new Error('This account is inactive. Please contact your supervisor.') };
      }

      const normalizedDbRole = normalizeRole(profileData.role);
      const normalizedSelectedRole = normalizeRole(selectedRole);
      console.log('[Auth] DB role:', normalizedDbRole, '| Selected:', normalizedSelectedRole);

      if (normalizedSelectedRole && normalizedDbRole !== normalizedSelectedRole) {
        console.warn('[Auth] Role mismatch');
        await supabase.auth.signOut().catch(() => {});
        setLoading(false);
        const dbRoleLabel = (profileData.role || '').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        return { 
          error: new Error(`This account is not authorized for the selected role. Your assigned role is ${dbRoleLabel}.`) 
        };
      }

      console.log('[Auth] Step 3 DONE. Role verified.');
      console.log('ROLE_VERIFIED');

      // Step 4: Set auth state and navigate
      console.log('[Auth] Step 4: Setting state and navigating...');
      console.log('REDIRECTING_TO_DASHBOARD');
      
      setSession(authData.session);
      setUser(authedUser);
      setProfile(profileData);
      setAuthError(null);
      setLoading(false);

      // Non-blocking background fetches
      void fetchStaffRecordBackground(authedUser.id);
      if (profileData.role) {
        void fetchPermissions(profileData.role);
      }

      console.log('[Auth] === SIGN IN COMPLETE - REDIRECTING ===');
      navigate({ to: '/dashboard', replace: true });
      
      // We can't easily log DASHBOARD_LOADED here as it happens on the next page, 
      // but the navigation call is the final step in the login process.
      // We'll add the log in the dashboard layout or index.

      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Unexpected signIn error:', err);
      setLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
      setPermissions([]);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
      }
      
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
    }
  };

  const isSuperAdmin = profile?.role === 'super_admin';
  const isICT = profile?.role === 'ict' || isSuperAdmin;
  const isTechnicalAssistant = profile?.role === 'technical_assistant' || isSuperAdmin;
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isAccounts = profile?.role === 'accounts' || isTechnicalAssistant || isSuperAdmin;
  const isDirector = profile?.role === 'dg' || profile?.role === 'technical_assistant' || isSuperAdmin;
  const isStaff = profile?.role === 'staff' || profile?.role === 'adhoc';
  const isAdhoc = profile?.role === 'adhoc';

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return roles.includes(profile.role);
  };

  const canAccess = (module: string, action: string = 'view') => {
    if (isSuperAdmin) return true;
    
    // Check database-driven permissions
    const permissionName = `${module}:${action}`;
    const moduleWildcard = `${module}:*`;
    const globalWildcard = `*:*`;

    return permissions.includes(permissionName) || 
           permissions.includes(moduleWildcard) || 
           permissions.includes(globalWildcard);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        permissions,
        loading,
        authError,
        signIn,
        signOut,
        isSuperAdmin,
        isICT,
        isTechnicalAssistant,
        isAdmin,
        isAccounts,
        isDirector,
        isStaff,
        isAdhoc,
        hasRole,
        canAccess,
        refreshProfile: async () => {
          if (user) await fetchProfileForContext(user.id, user.email);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}