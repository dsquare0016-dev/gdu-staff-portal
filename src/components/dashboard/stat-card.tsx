import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
    success: 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20',
    warning: 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20',
    danger: 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20',
  };

  const iconStyles = {
    default: 'bg-primary/20 text-primary',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    danger: 'bg-red-500/20 text-red-500',
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden border backdrop-blur-sm hover:shadow-lg transition-all duration-300',
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">{value}</h3>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded',
                    trend.isPositive
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-red-500/10 text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center shadow-lg',
              iconStyles[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="border backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}