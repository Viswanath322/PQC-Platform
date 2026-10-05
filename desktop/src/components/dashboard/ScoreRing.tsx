export function ScoreRing({ value, size = 104 }: { value: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Score ${value} of 100`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth="8"
          fill="none"
          stroke="hsl(214 32% 88%)"
        />
        {/* Progress with soft glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          stroke="hsl(var(--primary))"
          className="transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.35))" }}
        />
      </svg>
      <div className="tabular absolute inset-0 grid place-items-center text-[20px] font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
