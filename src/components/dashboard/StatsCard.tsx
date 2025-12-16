
import React, { type ReactNode } from 'react';
import { Card, CardContent } from '../ui/Card';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface StatsCardProps {
  title: string;
  value: string | number | ReactNode;
  icon: LucideIcon;
  trendData: number[];
  change: number;
  changeLabel?: string;
  chartColor?: string;
  pendingCount?: number;
  cancelledCount?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trendData,
  change,
  changeLabel = 'vs last month',
  chartColor = '#d4a574',
  pendingCount,
  cancelledCount
}) => {
  const sparklineData = trendData.map((val, i) => ({ i, val }));
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
          </div>
          <div className="p-2 bg-brand-light rounded-lg text-brand-primary dark:bg-gray-800 dark:text-white">
            <Icon size={20} />
          </div>
        </div>
        <div className="h-12 mt-2 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey="val" stroke={chartColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center text-xs border-t border-gray-50 dark:border-gray-800 pt-2 gap-2">
          {pendingCount !== undefined ? (
            <>
              <Badge variant="warning" className="mr-1">{pendingCount} Pending</Badge>
              {cancelledCount !== undefined && cancelledCount > 0 && (
                  <Badge variant="error" className="mr-1">{cancelledCount} Cancelled</Badge>
              )}
            </>
          ) : (
            <>
              <span className={`${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium flex items-center gap-1`}>
                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(change)}%
              </span>
              <span className="text-gray-400 ml-2">{changeLabel}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
