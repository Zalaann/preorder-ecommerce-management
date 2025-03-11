'use client';

import React from 'react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  index: string;
  categories: string[];
  colors: string[];
  valueFormatter?: (value: number) => string;
  yAxisWidth?: number;
  height?: number;
}

export function BarChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value: number) => value.toString(),
  yAxisWidth = 50,
  height = 300,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey={index}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ strokeWidth: 0 }}
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          width={yAxisWidth}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ strokeWidth: 0 }}
          tickFormatter={valueFormatter}
          className="text-gray-500 dark:text-gray-400"
        />
        <Tooltip
          content={({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {payload[0].payload[index]}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
                        {valueFormatter(payload[0].value as number)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        {categories.map((category, i) => (
          <Bar
            key={category}
            dataKey={category}
            fill={`var(--${colors[i % colors.length]}-500)`}
            radius={[4, 4, 0, 0]}
            className="fill-primary"
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
} 