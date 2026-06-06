import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBranding() {
  return useQuery({
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      // Try to get from portal_branding_settings first
      let { data: branding, error } = await supabase
        .from('portal_branding_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (!branding) {
        // Fallback to branding_settings if available
        const { data: bData } = await supabase
          .from('branding_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        branding = bData;
      }
      
      return branding || {
        portal_name: 'GDU Staff Portal',
        hero_title: 'GOVERNMENT DELIVERY UNIT (GDU)',
        hero_subtitle: 'KOGI STATE GOVERNMENT',
        hero_tagline: '…Confluence of Opportunities',
        primary_color: '#1a3a5c',
        secondary_color: '#d4a017'
      };
    },
  });
}
