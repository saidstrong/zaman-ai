'use client';

interface ChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface ChartMiniProps {
  data: ChartData[];
  size?: number;
}

export function ChartMini({ data, size = 120 }: ChartMiniProps) {
  const radius = (size - 20) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  let cumulativePercentage = 0;

  const createArcPath = (percentage: number, startPercentage: number) => {
    const startAngle = (startPercentage / 100) * 360 - 90;
    const endAngle = ((startPercentage + percentage) / 100) * 360 - 90;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          const path = createArcPath(item.percentage, cumulativePercentage);
          cumulativePercentage += item.percentage;
          
          return (
            <path
              key={index}
              d={path}
              fill={item.color}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          );
        })}
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center transform rotate-90">
          <div className="text-lg font-semibold text-z-ink tabular-nums">
            {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()} ₸
          </div>
          <div className="text-xs text-z-ink-2">Итого</div>
        </div>
      </div>
    </div>
  );
}
