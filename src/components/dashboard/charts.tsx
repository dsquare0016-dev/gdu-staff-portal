import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartIcon, Loader2 } from 'lucide-react';

const COLORS = [
  'var(--primary)',
  'var(--gold)',
  '#16a34a',
  '#db2777',
  '#f59e0b',
  '#7c3aed',
];

interface PieChartCardProps {
  title: string;
  description?: string;
  data: { name: string; value: number; color?: string }[];
  className?: string;
  isLoading?: boolean;
}

export function PieChartCard({ title, description, data, className, isLoading }: PieChartCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className={cn('border backdrop-blur-sm h-[400px]', className)}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Loading data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0 && safeData.some(d => d.value > 0);

  return (
    <Card className={cn('border backdrop-blur-sm', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[280px] text-center space-y-2">
            <div className="p-3 bg-muted rounded-full">
              <PieChartIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={safeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {safeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface BarChartCardProps {
  title: string;
  description?: string;
  data: any[];
  className?: string;
  bars: { dataKey: string; color: string; name: string }[];
  isLoading?: boolean;
}

export function BarChartCard({ title, description, data, className, bars, isLoading }: BarChartCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className={cn('border backdrop-blur-sm h-[400px]', className)}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Loading data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const safeData = Array.isArray(data) ? data : [];
  const safeBars = Array.isArray(bars) ? bars : [];
  const hasData = safeData.length > 0;

  return (
    <Card className={cn('border backdrop-blur-sm', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[280px] text-center space-y-2">
            <div className="p-3 bg-muted rounded-full">
              <BarChartIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              {safeBars.map((bar) => (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  fill={bar.color}
                  name={bar.name}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface AreaChartCardProps {
  title: string;
  description?: string;
  data: { name: string; [key: string]: string | number }[];
  areas: { dataKey: string; color: string; name: string }[];
  className?: string;
  isLoading?: boolean;
}

export function AreaChartCard({
  title,
  description,
  data,
  areas,
  className,
  isLoading,
}: AreaChartCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className={cn('border backdrop-blur-sm h-[420px]', className)}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Loading data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const safeData = Array.isArray(data) ? data : [];
  const safeAreas = Array.isArray(areas) ? areas : [];
  const hasData = safeData.length > 0;

  return (
    <Card className={cn('border backdrop-blur-sm', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-2">
            <div className="p-3 bg-muted rounded-full">
              <LineChartIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={safeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                {safeAreas.map((area) => (
                  <linearGradient key={`gradient-${area.dataKey}`} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={area.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={area.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {safeAreas.map((area) => (
                <Area
                  key={area.dataKey}
                  type="monotone"
                  dataKey={area.dataKey}
                  name={area.name}
                  stroke={area.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${area.dataKey})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}