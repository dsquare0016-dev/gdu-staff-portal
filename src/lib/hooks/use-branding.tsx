import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBranding() {
  return useQuery({
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      // 1. Try to get from portal_branding_settings first (Primary)
      const { data: portalBranding, error: portalError } = await supabase
        .from('portal_branding_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (portalBranding) {
        return portalBranding;
      }

      // 2. Fallback to branding_settings if available (Legacy)
      try {
        const { data: legacyBranding } = await supabase
          .from('branding_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (legacyBranding) {
          return legacyBranding;
        }
      } catch (e) {
        console.warn('Legacy branding_settings table issue:', e);
      }
      
      // 3. Ultimate Fallback
      return {
        portal_name: 'GDU Staff Portal',
        hero_title: 'GOVERNMENT DELIVERY UNIT (GDU)',
        hero_subtitle: 'KOGI STATE GOVERNMENT',
        hero_tagline: '…Confluence of Opportunities',
        primary_color: '#1a3a5c',
        secondary_color: '#d4a017',
        logo_url: '/logo.png',
        favicon_url: '/favicon.ico'
      };
    },
  });
}
