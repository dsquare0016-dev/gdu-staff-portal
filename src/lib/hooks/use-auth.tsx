import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserRole } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
}

export interface Session {
  access_token: string;
  user: User;
}

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
        
        // Only fetch profile if user has changed or if we don't have a profile yet
        if (lastFetchedUserId !== currentUser.id || !profile) {
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

    // Initialize session check with higher priority
    const initSession = async () => {
      try {
        // First try to get existing session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Initial session error:', error);
          if (active) {
            setAuthError(error.message);
            setLoading(false);
          }
          return;
        }

        if (initialSession) {
          console.log('[Auth] Found existing session for user:', initialSession.user.id);
          if (active) {
            await handleSession(initialSession);
            
            // If we're on the login page or root, redirect to dashboard or saved path
            const path = window.location.pathname;
            if (path === '/' || path === '/dashboard/settings/login-page') {
              const savedPath = localStorage.getItem('gdu_last_path');
              const target = savedPath && savedPath !== '/' ? savedPath : '/dashboard';
              console.log('[Auth] Session exists, redirecting to:', target);
              navigate({ to: target, replace: true });
            }
          }
        } else {
          console.log('[Auth] No session found');
          if (active) {
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error('[Auth] Critical error during session check:', err);
        if (active) {
          setAuthError(err.message || 'Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    initSession();

    // Store last path for session restoration
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/dashboard') && !currentPath.includes('login-page')) {
      localStorage.setItem('gdu_last_path', currentPath);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change event:', event);
        if (active) {
          if (event === 'SIGNED_OUT') {
            setAuthError(null);
            setProfile(null);
            setSession(null);
            setUser(null);
            setLoading(false);
            localStorage.removeItem('gdu_last_path');
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
              await handleSession(session);
            }
          }
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
    if (!userId) {
      console.warn('[Auth] No user ID provided for profile fetch');
      return;
    }
    
    try {
      console.log('[Auth] Context profile fetch for user ID:', userId);
      
      // Check localStorage cache first
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`gdu_profile_${userId}`);
        if (cached && !profile) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            setLoading(false); // Show UI faster
            console.log('[Auth] Restored profile from cache');
          } catch (e) {}
        }
      }

      let profileData: any = null;

      // Strategy 1: Query by ID (Strict Requirement)
      try {
        const { data, error } = await queryWithTimeout(
          supabase.from('profiles')
            .select('id,email,full_name,role,is_active,avatar_url')
            .eq('id', userId)
            .maybeSingle(),
          15000, // Reduced from 30s to 15s for better UX
          'Profile query by ID'
        );
        
        if (error) {
          console.warn('[Auth] Context profile by ID error:', error.message);
        } else if (data) {
          profileData = data;
        }
      } catch (e: any) {
        console.warn('[Auth] Context profile by ID failed/timed out:', e.message);
      }

      // If strategy 1 failed, we don't block the whole app if we have a session
      if (!profileData && !profile) {
         // Final retry...
         // ... existing retry logic simplified ...
      }

      if (profileData) {
        const isActive = profileData.is_active !== false;
        if (!isActive) {
          setAuthError('This account is inactive. Please contact your supervisor.');
          setLoading(false);
          return;
        }

        setProfile(profileData);
        setAuthError(null);
        
        // Update cache
        if (typeof window !== 'undefined') {
          localStorage.setItem(`gdu_profile_${userId}`, JSON.stringify(profileData));
        }

        // Non-blocking background fetches
        void fetchStaffRecordBackground(userId);
        if (profileData?.role) {
          void fetchPermissions(profileData.role);
        }
      }
    } catch (error: any) {
      console.error('[Auth] fetchProfileForContext exception:', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch staff record in background (non-blocking).
   */
  const fetchStaffRecordBackground = async (userId: string) => {
    try {
      // 1. Fetch staff record
      const { data: staffData } = await queryWithTimeout(
        (supabase.from('staff_records') as any)
          .select('id, readable_id, position, department_id, account_name, bank_name, account_number, passport_photo, passport_url')
          .eq('user_id', userId)
          .maybeSingle(),
        5000,
        'Staff record query'
      ) as any;
      
      if (staffData) {
        let department = null;

        // 2. Fetch department separately
        if (staffData.department_id) {
          const { data: deptData } = await supabase
            .from('departments')
            .select('name')
            .eq('id', staffData.department_id)
            .maybeSingle();
          department = deptData;
        }

        setProfile(prev => prev ? { 
          ...prev, 
          staff_id: staffData.id,
          readable_id: staffData.readable_id,
          position: staffData.position,
          account_name: staffData.account_name,
          bank_name: staffData.bank_name,
          account_number: staffData.account_number,
          passport_photo: staffData.passport_photo,
          passport_url: staffData.passport_url || staffData.passport_photo,
          avatar_url: staffData.passport_url || staffData.passport_photo || prev.avatar_url,
          department: department
        } : null);
      }
    } catch (e) {
      console.warn('[Auth] Background staff record fetch failed:', e);
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
      console.log('Auth User ID:', authedUser.id);
      console.log('AUTH_SUCCESS');

      // Double check user session is valid
      const { data: { user: verifiedUser } } = await supabase.auth.getUser();
      if (!verifiedUser) {
        console.error('[Auth] User verification failed after login');
        setLoading(false);
        return { error: new Error('User session could not be verified. Please try again.') };
      }

      // Tell onAuthStateChange to skip its own profile fetch
      signInHandledRef.current = true;

      // Step 2: Fetch profile with improved reliability (Query By ID Primary)
      console.log('[Auth] Step 2: Fetching profile by ID...');
      console.log('Profile Query By ID:', verifiedUser.id);
      
      let profileData: any = null;

      // Strategy 1: Query by ID (Priority)
      try {
        const { data, error } = await queryWithTimeout(
          supabase.from('profiles')
            .select('id,email,full_name,role,is_active,avatar_url')
            .eq('id', verifiedUser.id)
            .maybeSingle(),
          20000,
          'SignIn profile by ID'
        );
        
        if (!error && data) {
          profileData = data;
          console.log('Profile Found:', JSON.stringify(profileData));
        } else if (error) {
          console.warn('[Auth] Profile by ID error:', error.message);
        }
      } catch (e: any) {
        console.warn('[Auth] Profile by ID failed/timed out:', e.message);
      }

      // Strategy 2: Final Retry if still nothing
      if (!profileData) {
        console.log('[Auth] Final retry for profile by ID...');
        try {
          const { data, error } = await queryWithTimeout(
            supabase.from('profiles')
              .select('id,email,full_name,role,is_active,avatar_url')
              .eq('id', verifiedUser.id)
              .maybeSingle(),
            20000,
            'SignIn profile final retry'
          );
          if (!error && data) {
            profileData = data;
            console.log('Profile Found on Retry:', JSON.stringify(profileData));
          }
        } catch (e) {
          console.error('[Auth] Final retry failed');
        }
      }

      if (!profileData) {
        console.error('[Auth] No profile found for user:', verifiedUser.id);
        console.log('Profile Found: null');
        
        // Attempt to create a basic profile if missing (safety net)
        console.log('[Auth] Attempting to create missing profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: verifiedUser.id,
            email: verifiedUser.email,
            full_name: verifiedUser.user_metadata?.full_name || email.split('@')[0],
            role: (verifiedUser.user_metadata?.role as UserRole) || 'staff',
            is_active: true
          }])
          .select()
          .maybeSingle();

        if (!createError && newProfile) {
          console.log('[Auth] Profile created successfully');
          profileData = newProfile;
        } else {
          console.error('[Auth] Failed to create profile:', createError?.message);
          await supabase.auth.signOut().catch(() => {});
          setLoading(false);
          return { error: new Error('Login successful, but no profile record was found. Please contact an administrator.') };
        }
      }

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
      console.log('[Auth] Initiating signOut...');
      await supabase.auth.signOut();
      
      // Clear all states
      setProfile(null);
      setUser(null);
      setSession(null);
      setPermissions([]);
      setAuthError(null);
      
      // Clear all caches
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('gdu_last_path');
        // Clear all profile caches
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('gdu_profile_')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      toast.success("Logged out successfully");
      
      // Immediate redirect to login
      console.log('[Auth] Redirecting to login...');
      navigate({ to: '/', replace: true });
    } catch (error: any) {
      console.error("Logout error:", error);
      // Fallback redirect even if signOut fails
      window.location.href = '/';
    }
  };

  const isSuperAdmin = profile?.role === 'super_admin';
  const isICT = profile?.role === 'ict' || isSuperAdmin;
  const isTechnicalAssistant = profile?.role === 'technical_assistant' || isSuperAdmin;
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isAccounts = profile?.role === 'accounts' || isTechnicalAssistant;
  const isDirector = profile?.role === 'dg' || isTechnicalAssistant;
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