import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PortalLoaderProps {
  className?: string;
  showText?: boolean;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function PortalLoader({ 
  className, 
  showText = true, 
  message = "Loading portal...",
  size = "md"
}: PortalLoaderProps) {
  const { data: branding } = useQuery({
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_branding_settings')
        .select('logo_url')
        .eq('id', 1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-24 w-24",
    lg: "h-32 w-32"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <img 
          src={branding?.logo_url || "/logo.png"} 
          alt="GDU Logo" 
          className={cn(sizeClasses[size], "object-contain animate-bubble relative z-10")}
        />
      </div>
      
      {showText && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold tracking-[0.2em] text-primary animate-pulse uppercase">
            {message === "Loading portal..." ? "GDU Portal" : message}
          </p>
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
