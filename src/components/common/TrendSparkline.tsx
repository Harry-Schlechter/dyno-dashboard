import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface TrendSparklineProps {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
  width?: number | string;
}

const TrendSparkline: React.FC<TrendSparklineProps> = ({
  data,
  dataKey,
  color = '#5B8DEF',
  height = 40,
  width = '100%',
}) => {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendSparkline;
