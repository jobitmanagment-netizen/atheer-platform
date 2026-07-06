export default function FearGreedGauge({ value, classification }) {
  const angle = (value / 100) * 180 - 90;

  const getColor = (v) => {
    if (v < 25) return '#CF304A';
    if (v < 45) return '#F0B90B';
    if (v < 55) return '#848E9C';
    if (v < 75) return '#03A66D';
    return '#03A66D';
  };

  const color = getColor(value);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-24">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1E2329" strokeWidth="14" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(value / 100) * 251.2} 251.2`} />
          <line x1="100" y1="100" x2={100 + 70 * Math.cos((angle - 90) * Math.PI / 180)}
                y2={100 + 70 * Math.sin((angle - 90) * Math.PI / 180)} stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill={color} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-black" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-sm font-bold mt-1" style={{ color }}>{classification}</span>
    </div>
  );
}