import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserRole } from '@/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, selectedRole?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAccounts: boolean;
  isDirector: boolean;
  isStaff: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo session in session storage to persist across refreshes
    try {
      const savedDemoProfile = typeof window !== 'undefined' ? sessionStorage.getItem('gdu_demo_profile') : null;
      if (savedDemoProfile) {
        const parsedProfile = JSON.parse(savedDemoProfile);
        setProfile(parsedProfile);
        // Also set a mock user to satisfy any checks
        setUser({ id: parsedProfile.id, email: parsedProfile.email } as User);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error parsing demo profile:', e);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        const hasDemo = typeof window !== 'undefined' && !!sessionStorage.getItem('gdu_demo_profile');
        if (!hasDemo) {
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          const hasDemo = typeof window !== 'undefined' && !!sessionStorage.getItem('gdu_demo_profile');
          if (!hasDemo) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, selectedRole?: UserRole) => {
    // 1. Attempt real Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email: email.toLowerCase().trim(), 
      password 
    });

    if (!authError && authData.user) {
      // Successfully logged in via database
      await fetchProfile(authData.user.id);
      return { error: null };
    }

    // 2. Demo credentials bypass (fallback if not in DB or DB not set up)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check for common demo passwords or passwords that match the role
    const isDemoPassword = password === 'admin123' || 
                          password === 'accounts123' || 
                          password === 'dg123' || 
                          password === 'staff123' ||
                          password === 'ict123' ||
                          password === 'ta123' ||
                          password === 'superadmin123';

    if (isDemoPassword) {
      let role: UserRole = selectedRole || 'staff';
      let name = 'User (Demo)';

      // If no role selected, try to infer from email
      if (!selectedRole) {
        if (normalizedEmail.includes('superadmin')) role = 'super_admin';
        else if (normalizedEmail.includes('admin')) role = 'admin';
        else if (normalizedEmail.includes('accounts')) role = 'accounts';
        else if (normalizedEmail.includes('dg')) role = 'dg';
        else if (normalizedEmail.includes('ict')) role = 'ict';
        else if (normalizedEmail.includes('ta')) role = 'ta';
      }

      const roleNames: Record<UserRole, string> = {
        super_admin: 'Super Admin',
        admin: 'Administrator',
        accounts: 'Accounts Officer',
        dg: 'Director General',
        ta: 'Technical Adviser',
        ict: 'ICT Support',
        staff: 'Staff Member',
      };

      name = `${roleNames[role]} (Demo)`;

      const demoProfile: Profile = {
        id: "demo-id-" + role + "-" + Date.now(),
        email: normalizedEmail,
        full_name: name,
        role: role,
        avatar_url: null,
        phone: null,
        is_active: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setProfile(demoProfile);
      setUser({ id: demoProfile.id, email: demoProfile.email } as User);
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gdu_demo_profile', JSON.stringify(demoProfile));
      }
      return { error: null };
    }

    return { error: authError };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    sessionStorage.removeItem('gdu_demo_profile');
  };

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isAccounts = profile?.role === 'accounts' || isSuperAdmin;
  const isDirector = profile?.role === 'dg' || profile?.role === 'ta' || isSuperAdmin;
  const isStaff = profile?.role === 'staff';

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return roles.includes(profile.role);
  };

  const canAccess = (module: string, action: string) => {
    if (isSuperAdmin) return true;
    
    // Default permissions for other roles
    const rolePermissions: Record<string, Record<string, string[]>> = {
      admin: {
        staff: ['view', 'create', 'edit'],
        attendance: ['view', 'create', 'edit', 'verify', 'approve'],
        departments: ['view', 'create', 'edit'],
        announcements: ['view', 'create', 'edit'],
        reports: ['view'],
        payroll: ['view'],
        documents: ['view', 'create', 'edit'],
        '*': ['view'],
      },
      accounts: {
        payroll: ['view', 'create', 'edit'],
        allowances: ['view', 'create', 'edit'],
        attendance: ['view'],
      },
      dg: {
        staff: ['view'],
        attendance: ['view', 'create', 'edit'],
        payroll: ['view'],
        reports: ['view'],
      },
      ta: {
        staff: ['view'],
        attendance: ['view', 'create', 'edit'],
        reports: ['view', 'create'],
      },
      ict: {
        tickets: ['view', 'create', 'edit'],
        staff: ['view', 'create', 'edit'],
        attendance: ['view', 'create', 'edit'],
        documents: ['view', 'create', 'edit'],
      },
      staff: {
        profile: ['view', 'edit'],
        attendance: ['view'],
        payroll: ['view'],
        documents: ['view', 'create'],
      },
    };

    const userRole = profile?.role;
    if (!userRole || !rolePermissions[userRole]) return false;
    
    const rolePerms = rolePermissions[userRole];
    const modulePerms = rolePerms[module] || rolePerms['*'];
    
    if (!modulePerms) return false;
    return modulePerms.includes(action) || modulePerms.includes('*');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signOut,
        isSuperAdmin,
        isAdmin,
        isAccounts,
        isDirector,
        isStaff,
        hasRole,
        canAccess,
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