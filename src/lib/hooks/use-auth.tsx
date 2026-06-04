import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserRole } from '@/types';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  permissions: string[];
  loading: boolean;
  signIn: (email: string, password: string, selectedRole?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isICT: boolean;
  isTA: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Also get staff_id from staff_records
      const { data: staffData } = await supabase
        .from('staff_records')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const newProfile = {
        ...profileData,
        staff_id: staffData?.id
      };
      
      setProfile(newProfile);
      
      // Update last seen
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);

      // Fetch permissions for the role
      if (profileData?.role) {
        await fetchPermissions(profileData.role);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (roleSlug: string) => {
    try {
      // Get role id first
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('slug', roleSlug)
        .maybeSingle();

      if (roleData) {
        const { data: permData } = await supabase
          .from('role_permissions')
          .select('permissions(name)')
          .eq('role_id', roleData.id);

        if (permData) {
          const permList = permData
            .map((p: any) => p.permissions?.name)
            .filter(Boolean);
          setPermissions(permList);
        }
      } else {
        console.warn(`Role with slug ${roleSlug} not found in database.`);
        // Fallback or empty permissions
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    }
  };

  const signIn = async (email: string, password: string, selectedRole?: UserRole) => {
    // Attempt real Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email: email.toLowerCase().trim(), 
      password 
    });

    if (authError) return { error: authError };

    if (authData.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (selectedRole && profileData && profileData.role !== selectedRole) {
        await supabase.auth.signOut();
        return { 
          error: { 
            message: "Invalid User Role Selected. Please ensure you selected the proper role for this login." 
          } 
        };
      }

      await fetchProfile(authData.user.id);
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token'); // Clear standard supabase token just in case
      }
      
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
    }
  };

  const isSuperAdmin = profile?.role === 'super_admin';
  const isICT = profile?.role === 'ict' || isSuperAdmin;
  const isTA = profile?.role === 'ta' || isSuperAdmin;
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isAccounts = profile?.role === 'accounts' || isSuperAdmin;
  const isDirector = profile?.role === 'dg' || profile?.role === 'ta' || isSuperAdmin;
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
        signIn,
        signOut,
        isSuperAdmin,
        isICT,
        isAdmin,
        isAccounts,
        isDirector,
        isStaff,
        isAdhoc,
        hasRole,
        canAccess,
        refreshProfile: async () => {
          if (user) await fetchProfile(user.id);
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