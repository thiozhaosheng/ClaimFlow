"use client";

import { useMemo, useState, useEffect, useId } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { useSession } from "@/lib/session-context";
import { formatSGD } from "@/core/domain/money";
import { cn } from "@/lib/cn";
import { getEmployeeAvatar } from "@/core/domain/avatars";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  ShieldAlert,
  Download,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Settings,
  Share2,
  FileText,
  Cpu,
  Users,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

// ==========================================================================
// GENERIC SUB-COMPONENTS
// ==========================================================================

function Sparkline({ data, width = 100, height = 32, stroke = "var(--accent)" }: { data: number[]; width?: number; height?: number; stroke?: string }) {
  const id = useId();
  const sparkGradientId = `spark-grad-${id.replace(/:/g, "")}`;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const coordinates = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 4) + 2;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const pathD = coordinates.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${coordinates[coordinates.length - 1].x} ${height} L ${coordinates[0].x} ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 select-none">
      <defs>
        <linearGradient id={sparkGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${sparkGradientId})`} />
      <motion.path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* End glowing tip dot */}
      <circle
        cx={coordinates[coordinates.length - 1].x}
        cy={coordinates[coordinates.length - 1].y}
        r="2"
        fill={stroke}
      />
    </svg>
  );
}

function GaugeChart({ value, label }: { value: number; label: string }) {
  const radius = 35;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius; // ~219.9
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--success)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-xl font-black text-fg">{value}%</span>
          <span className="text-[7.5px] font-bold text-fg-secondary uppercase tracking-widest mt-1 text-center max-w-[65px]">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// EMPLOYEE PERSPECTIVE VIEWS
// ==========================================================================

interface DonutCategory {
  key: string;
  label: string;
  amount: number;
  pct: number;
  color: string;
}

function InteractiveDonutChart({ onSelectCategory, selectedCategory }: { onSelectCategory: (cat: string | null) => void; selectedCategory: string | null }) {
  const categories: DonutCategory[] = [
    { key: "Client Entertainment", label: "Client Entertainment", amount: 346.90, pct: 83.5, color: "#4f46e5" },
    { key: "Transport", label: "Transport", amount: 23.10, pct: 5.6, color: "#fbbf24" },
    { key: "Office Supplies", label: "Office Supplies", amount: 45.50, pct: 10.9, color: "#ec4899" },
  ];

  const total = 415.50;
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~238.76

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 py-4">
      <div className="relative w-40 h-40 shrink-0 select-none">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border-strong)" strokeWidth={strokeWidth} className="opacity-20" />
          {categories.map((cat, idx) => {
            const offset = circumference - (cat.pct / 100) * circumference;
            const rotation = (accumulatedPercent / 100) * 360;
            accumulatedPercent += cat.pct;

            const isHovered = selectedCategory === cat.key;

            return (
              <motion.circle
                key={cat.key}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.8, delay: idx * 0.15, ease: "easeOut" }}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={cat.color}
                strokeWidth={isHovered ? strokeWidth + 2.5 : strokeWidth}
                strokeDasharray={circumference}
                strokeLinecap="round"
                className="transform origin-center cursor-pointer transition-all duration-200"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  opacity: selectedCategory && !isHovered ? 0.35 : 1
                }}
                onClick={() => onSelectCategory(selectedCategory === cat.key ? null : cat.key)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
          <span className="text-xl font-black text-fg">
            S${selectedCategory ? categories.find(c => c.key === selectedCategory)?.amount.toFixed(2) : total.toFixed(2)}
          </span>
          <span className="text-[8px] font-black text-fg-secondary uppercase tracking-widest mt-1 text-center max-w-[80px] truncate">
            {selectedCategory ? selectedCategory : "Total Spend"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-grow w-full">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <div
              key={cat.key}
              onClick={() => onSelectCategory(isSelected ? null : cat.key)}
              className={cn(
                "flex items-center justify-between border-b border-border/40 dark:border-white/5 pb-2 cursor-pointer transition-all duration-200 p-2 rounded-xl hover:bg-zinc-500/5",
                isSelected ? "bg-zinc-500/10 dark:bg-white/5 font-extrabold scale-[1.01] border-transparent" : "opacity-70"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-bold text-fg">{cat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-fg">S${cat.amount.toFixed(2)}</span>
                <span className="text-[10px] text-fg-secondary font-medium">({cat.pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractiveAreaChart({
  selectedPoint,
  onSelectPoint
}: {
  selectedPoint: string | null;
  onSelectPoint: (day: string | null) => void;
}) {
  const data = [
    { day: "01 Jun", val: 28.50 },
    { day: "10 Jun", val: 51.60 },
    { day: "15 Jun", val: 97.10 },
    { day: "25 Jun", val: 415.50 }
  ];

  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; val: number; x: number; y: number } | null>(null);

  const width = 500;
  const height = 180;
  
  const maxVal = 500;
  const minVal = 0;
  const range = maxVal - minVal;

  const coordinates = data.map((d, idx) => {
    const x = (idx / (data.length - 1)) * (width - 60) + 45;
    const y = height - ((d.val - minVal) / range) * (height - 50) - 25;
    return { ...d, x, y };
  });

  const linePath = coordinates.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - 25} L ${coordinates[0].x} ${height - 25} Z`;

  return (
    <div className="relative w-full h-[220px] select-none py-2">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full overflow-visible"
        onClick={() => {
          if (hoveredPoint) {
            onSelectPoint(selectedPoint === hoveredPoint.day ? null : hoveredPoint.day);
          }
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = ((e.clientX - rect.left) / rect.width) * width;
          
          let closest = coordinates[0];
          let minDist = Math.abs(coordinates[0].x - mouseX);
          for (let i = 1; i < coordinates.length; i++) {
            const dist = Math.abs(coordinates[i].x - mouseX);
            if (dist < minDist) {
              closest = coordinates[i];
              minDist = dist;
            }
          }
          setHoveredPoint(closest);
        }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dashed Grid Lines & Y-axis Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - ratio * (height - 50) - 25;
          const labelVal = ratio * maxVal;
          return (
            <g key={ratio} className="opacity-70">
              <line
                x1="45"
                y1={y}
                x2={width - 15}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                className="opacity-40"
              />
              <text 
                x="35" 
                y={y + 3} 
                fill="currentColor" 
                className="text-[9px] font-bold fill-fg-tertiary font-mono" 
                textAnchor="end"
              >
                S${labelVal}
              </text>
            </g>
          );
        })}

        {/* Area Background */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line Path */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.75"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Dots */}
        {coordinates.map((p, idx) => {
          const isSelected = selectedPoint === p.day;
          return (
            <g key={idx}>
              {isSelected && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="7.5"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? "4.5" : "3.5"}
                fill={isSelected ? "var(--accent)" : "var(--card)"}
                stroke="url(#lineGradient)"
                strokeWidth="2"
                className="transition-all duration-200 cursor-pointer"
              />
            </g>
          );
        })}

        {/* X-axis Labels */}
        {coordinates.map((p, idx) => (
          <text
            key={idx}
            x={p.x}
            y={height - 5}
            fill="currentColor"
            className="text-[9px] font-bold fill-fg-tertiary"
            textAnchor="middle"
          >
            {p.day}
          </text>
        ))}

        {/* Hover vertical bar / ping */}
        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1="10"
              x2={hoveredPoint.x}
              y2={height - 25}
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              className="opacity-50"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="6.5"
              fill="var(--accent)"
              className="animate-ping opacity-25"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill="var(--accent)"
            />
          </>
        )}
      </svg>

      {/* HTML tooltip floating */}
      {hoveredPoint && (
        <div 
          className="absolute bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-border dark:border-white/5 rounded-xl px-2.5 py-1.5 shadow-pop text-[10px] leading-tight font-bold pointer-events-none flex flex-col gap-0.5"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 25}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="text-fg-secondary font-medium">{hoveredPoint.day}</span>
          <span className="text-fg text-xs">S${hoveredPoint.val.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// MANAGER PERSPECTIVE VIEWS
// ==========================================================================

function TeamBarChart({
  selectedEmployee,
  onSelectEmployee
}: {
  selectedEmployee: string | null;
  onSelectEmployee: (name: string | null) => void;
}) {
  const data = [
    { name: "Aisyah Rahman", spend: 1120.00, count: 5, color: "#4f46e5" },
    { name: "Lim Wei", spend: 640.00, count: 3, color: "#10b981" },
    { name: "John Doe", spend: 450.00, count: 4, color: "#fbbf24" },
    { name: "Sarah Tan", spend: 415.50, count: 4, color: "#ec4899" },
    { name: "Clara Ng", spend: 320.00, count: 2, color: "#8b5cf6" },
  ];

  const maxSpend = 1200;

  return (
    <div className="flex flex-col gap-4.5 py-4">
      {data.map((item, idx) => {
        const isSelected = selectedEmployee === item.name;
        const hasSelection = selectedEmployee !== null;
        
        return (
          <div 
            key={item.name} 
            onClick={() => onSelectEmployee(isSelected ? null : item.name)}
            className={cn(
              "flex flex-col gap-1.5 text-left cursor-pointer p-2 -mx-2 rounded-xl transition-all duration-200 hover:bg-zinc-500/5 select-none",
              isSelected ? "bg-zinc-500/10 dark:bg-white/5 font-extrabold scale-[1.01]" : hasSelection ? "opacity-45" : "opacity-100"
            )}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-fg flex items-center gap-1.5">
                <img
                  src={getEmployeeAvatar(item.name)}
                  alt={item.name}
                  className="h-4.5 w-4.5 rounded-full object-cover border border-border"
                />
                {item.name}
              </span>
              <span className="text-fg-secondary font-mono">
                S${item.spend.toFixed(2)} <span className="text-[9px] text-fg-tertiary font-sans font-medium">({item.count} claims)</span>
              </span>
            </div>
            <div className="w-full bg-border-strong dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.spend / maxSpend) * 100}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                style={{ backgroundColor: item.color }}
                className={cn("h-full rounded-full shadow-sm", isSelected ? "shadow-[0_0_12px_rgba(99,102,241,0.4)]" : "")}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================================================
// FINANCE PERSPECTIVE VIEWS
// ==========================================================================

function MonthlyDisbursementsChart({
  selectedMonth,
  onSelectMonth
}: {
  selectedMonth: string | null;
  onSelectMonth: (month: string | null) => void;
}) {
  const data = [
    { month: "Jan", val: 1100, pct: "35%" },
    { month: "Feb", val: 1450, pct: "46%" },
    { month: "Mar", val: 1800, pct: "57%" },
    { month: "Apr", val: 2200, pct: "70%" },
    { month: "May", val: 1950, pct: "62%" },
    { month: "Jun", val: 2800, pct: "90%" },
  ];

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3 py-2 relative">
      <div className="h-[160px] flex items-end justify-between gap-3 border-b border-border pb-2 pt-6 px-4">
        {data.map((item, idx) => {
          const isSelected = selectedMonth === item.month;
          const hasSelection = selectedMonth !== null;

          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative select-none">
              <div 
                className={cn(
                  "w-full bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] hover:bg-indigo-500/[0.08] dark:hover:bg-indigo-500/[0.04] rounded-t-lg transition-all relative cursor-pointer h-full flex items-end",
                  isSelected ? "bg-indigo-500/10 dark:bg-indigo-500/15" : hasSelection ? "opacity-45" : "opacity-100"
                )}
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
                onClick={() => onSelectMonth(isSelected ? null : item.month)}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: item.pct }}
                  transition={{ type: "spring", stiffness: 120, damping: 15 }}
                  className={cn(
                    "w-full bg-gradient-to-t from-indigo-500 to-sky-400 rounded-t-lg shadow-sm",
                    isSelected ? "shadow-[0_0_12px_rgba(99,102,241,0.45)]" : ""
                  )}
                />
              </div>
              <span className={cn("text-[10px] font-bold text-fg-tertiary", isSelected ? "text-accent font-black" : "")}>{item.month}</span>
            </div>
          );
        })}
      </div>

      <div className="h-8 text-center flex items-center justify-center text-xs font-semibold">
        {hoveredBar !== null ? (
          <motion.span 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-fg font-mono"
          >
            Disbursed in {data[hoveredBar].month}: <span className="text-accent font-black">S${data[hoveredBar].val.toFixed(2)}</span>
          </motion.span>
        ) : selectedMonth ? (
          <span className="text-accent font-black">Selected: {selectedMonth} disbursements queue &middot; Click log on right</span>
        ) : (
          <span className="text-fg-tertiary font-medium">Click on the bars to inspect ledger payouts</span>
        )}
      </div>
    </div>
  );
}

function CitibankTrafficChart() {
  const data = [12, 14, 18, 11, 15, 13, 14];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const width = 500;
  const height = 180;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 60) + 45;
    const y = height - ((val - 8) / 12) * (height - 50) - 25;
    return { x, y, val, day: days[idx] };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - 25} L ${points[0].x} ${height - 25} Z`;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="relative w-full h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="citiAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="citiLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="citiGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dashed Grid Lines & Y-axis Labels */}
          {[0, 0.5, 1].map((ratio) => {
            const y = height - ratio * (height - 50) - 25;
            const labelVal = 8 + ratio * 12; // 8 ms to 20 ms
            return (
              <g key={ratio} className="opacity-70">
                <line
                  x1="45"
                  y1={y}
                  x2={width - 15}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                  className="opacity-40"
                />
                <text 
                  x="35" 
                  y={y + 3} 
                  fill="currentColor" 
                  className="text-[9px] font-bold fill-fg-tertiary font-mono" 
                  textAnchor="end"
                >
                  {labelVal} ms
                </text>
              </g>
            );
          })}

          {/* Area Background */}
          <path d={areaPath} fill="url(#citiAreaGradient)" />

          {/* Line Path */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="url(#citiLineGradient)" 
            strokeWidth="2.75" 
            strokeLinecap="round" 
            filter="url(#citiGlow)"
          />

          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="var(--card)"
              stroke="url(#citiLineGradient)"
              strokeWidth="2"
            />
          ))}

          {/* X-axis Labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 5}
              fill="currentColor"
              className="text-[9px] font-bold fill-fg-tertiary"
              textAnchor="middle"
            >
              {p.day}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] font-bold text-fg-secondary bg-white/[0.02] dark:bg-black/[0.08] p-3 rounded-xl border border-border/40 dark:border-white/5">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Citi FAST Gateway: Connected</span>
        <span>Avg Latency: <span className="font-mono text-pink-600 dark:text-pink-400">13.8 ms</span></span>
        <span>MAS Node: Synced</span>
      </div>
    </div>
  );
}

function TreasurySimulator() {
  const initialReserves = 48138.00;
  const [velocity, setVelocity] = useState<number>(350);
  const [depletionDate, setDepletionDate] = useState("");

  const daysLeft = Math.floor(initialReserves / velocity);

  useEffect(() => {
    const dateStr = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    setTimeout(() => {
      setDepletionDate(dateStr);
    }, 0);
  }, [daysLeft]);

  return (
    <div className="bg-white/[0.02] dark:bg-black/[0.08] rounded-2xl border border-border/50 dark:border-white/5 p-4 mt-2 text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-fg uppercase tracking-wider">Treasury Runway Simulator</h3>
          <p className="text-[10px] text-fg-secondary font-medium mt-0.5">Project daily burn rate limits</p>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
          daysLeft > 60 ? "bg-success-bg text-success-fg" : daysLeft > 30 ? "bg-warning-bg text-warning-fg" : "bg-danger-bg text-danger-fg"
        )}>
          {daysLeft} Days Runway
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-fg-secondary">Daily Burn Velocity</span>
            <span className="text-fg font-mono">S${velocity} / day</span>
          </div>
          <input
            type="range"
            min="100"
            max="3000"
            step="50"
            value={velocity}
            onChange={(e) => setVelocity(Number(e.target.value))}
            className="w-full h-1.5 bg-border-strong dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-medium">
          <div className="p-3 bg-white/[0.04] dark:bg-zinc-900/40 rounded-xl border border-border/40 dark:border-white/5">
            <span className="text-[9px] text-fg-secondary uppercase font-bold tracking-wider block">Est. Depletion</span>
            <span className="text-xs font-bold text-fg mt-1 block">
              {depletionDate}
            </span>
          </div>
          <div className="p-3 bg-white/[0.04] dark:bg-zinc-900/40 rounded-xl border border-border/40 dark:border-white/5">
            <span className="text-[9px] text-fg-secondary uppercase font-bold tracking-wider block">Required top-up</span>
            <span className="text-xs font-bold text-fg mt-1 block">
              S${(velocity * 30).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] text-fg-tertiary font-medium">/ mo</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportPanel() {
  const [exportFormat, setExportFormat] = useState<string>("PDF");
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStepText, setExportStepText] = useState<string>("");

  const handleExport = () => {
    setExporting(true);
    setExportProgress(5);
    setExportStepText("Opening secure stream...");

    setTimeout(() => {
      setExportProgress(35);
      setExportStepText("Auditing cryptographic block hashes...");
    }, 600);

    setTimeout(() => {
      setExportProgress(75);
      setExportStepText("Structuring general ledger mappings...");
    }, 1300);

    setTimeout(() => {
      setExportProgress(100);
      setExportStepText("Download complete!");
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
      }, 1500);
    }, 2100);
  };

  return (
    <div className="bg-white/[0.02] dark:bg-black/[0.08] rounded-2xl border border-border/50 dark:border-white/5 p-4 mt-2 text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-fg uppercase tracking-wider">Treasury Ledger Export</h3>
          <p className="text-[10px] text-fg-secondary font-medium mt-0.5">Generate audited extracts</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {["PDF", "CSV", "JSON"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={cn(
                "flex-1 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                exportFormat === fmt
                  ? "bg-accent border-accent text-accent-fg shadow-sm"
                  : "border-border bg-card text-fg-secondary hover:bg-zinc-500/5"
              )}
            >
              {fmt}
            </button>
          ))}
        </div>

        {!exporting ? (
          <button
            onClick={handleExport}
            className="w-full bg-accent text-accent-fg py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-accent-hover active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Generate {exportFormat} Ledger
          </button>
        ) : (
          <div className="bg-white/[0.04] dark:bg-zinc-900/40 rounded-xl p-3 border border-border/40 dark:border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-fg-secondary">{exportStepText}</span>
              <span className="text-fg font-mono">{exportProgress}%</span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-350 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EXPLORE_CLAIMS = [
  { id: "CLM-1042", title: "Client Dinner", amount: 318.40, category: "Client Entertainment", date: "25 Jun", employee: "Sarah Tan", details: "IRAS threshold limit trigger (> S$300). Needs meeting attendee list declared to pass L2 manual audit.", status: "flagged" },
  { id: "CLM-1010", title: "Client Coffee", amount: 28.50, category: "Client Entertainment", date: "01 Jun", employee: "Sarah Tan", details: "Audit check complete. Automatically matched transaction history.", status: "cleared" },
  { id: "CLM-1033", title: "Transport", amount: 23.10, category: "Transport", date: "10 Jun", employee: "Sarah Tan", details: "Audit check complete. Distance matched GPS parameters automatically.", status: "cleared" },
  { id: "CLM-1025", title: "Office Supplies", amount: 45.50, category: "Office Supplies", date: "15 Jun", employee: "Sarah Tan", details: "Office printer ink cartridges. Receipt details verified by OCR.", status: "cleared" }
];

function PersonalCompliancePanel() {
  const metrics = [
    { label: "Receipt Coverage", val: "100%", desc: "Compliant on all claims", color: "var(--success)" },
    { label: "Filing Recency", val: "12d avg", desc: "SLA target under 30 days", color: "var(--success)" },
    { label: "Transit Deduplication", val: "0 flagged", desc: "No duplicates found", color: "var(--success)" },
    { label: "L2 Audit Accuracy", val: "94.1%", desc: "1 pending review", color: "var(--warning)" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      {metrics.map((m, idx) => (
        <Card key={idx} className="p-4 text-left flex items-start gap-3 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md">
          <span 
            className="h-2 w-2 rounded-full mt-1.5 shrink-0 animate-pulse" 
            style={{ backgroundColor: m.color }}
          />
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-fg-secondary uppercase tracking-wider">{m.label}</span>
              <span className="text-sm font-black text-fg font-mono">{m.val}</span>
            </div>
            <p className="text-[10px] text-fg-tertiary mt-1 font-semibold truncate">{m.desc}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DepartmentBudgetPanel() {
  const spent = 12450.00;
  const total = 20000.00;
  const pct = (spent / total) * 100;

  return (
    <Card className="p-6 text-left flex flex-col gap-4 mt-6 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-bold tracking-tight text-fg flex items-center gap-1.5">
          <TrendingUp className="h-4.5 w-4.5 text-accent animate-pulse" />
          Q2 Budget Allocation Review
        </h3>
        <span className="text-[10px] font-black text-fg-secondary uppercase tracking-widest">
          Operations Pod
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-fg-secondary">Allocated Budget Spent</span>
          <span className="text-fg font-mono">
            S${spent.toLocaleString()} / <span className="text-fg-tertiary">S${total.toLocaleString()}</span>
          </span>
        </div>
        <div className="w-full bg-border-strong dark:bg-zinc-800 h-3 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-indigo-500 through-sky-400 to-emerald-400 rounded-full"
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-bold text-fg-tertiary uppercase mt-1">
          <span>{pct.toFixed(1)}% Consumed</span>
          <span>S${(total - spent).toLocaleString()} Remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-zinc-500/5 p-3 rounded-xl border border-border/50">
          <span className="text-[9px] font-bold text-fg-tertiary uppercase tracking-wider block">Average Spend / Claim</span>
          <span className="text-sm font-black text-fg font-mono mt-1 block">S$200.80</span>
        </div>
        <div className="bg-zinc-500/5 p-3 rounded-xl border border-border/50">
          <span className="text-[9px] font-bold text-fg-tertiary uppercase tracking-wider block">Compliance Approvals</span>
          <span className="text-sm font-black text-emerald-500 font-mono mt-1 block">85.7%</span>
        </div>
      </div>
    </Card>
  );
}

function FastClearingConsole() {
  const [logs, setLogs] = useState<string[]>([
    "FAST Gateway handshake established.",
    "Citibank central settlement pipeline listening..."
  ]);

  useEffect(() => {
    const messages = [
      "Citibank SG ledger synchronized successfully.",
      "FAST settlement clearing: Block verified #128292.",
      "Reconciled payouts: reserve balance matches ledger.",
      "Audit matches: 128 block hashes verified.",
      "Citibank API handshake response: 200 OK (11ms latency).",
      "Reserve limits: treasury health checklist verified."
    ];

    const interval = setInterval(() => {
      setLogs(prev => {
        const nextLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${messages[Math.floor(Math.random() * messages.length)]}`];
        if (nextLogs.length > 5) nextLogs.shift();
        return nextLogs;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-6 text-left flex flex-col gap-4 mt-6 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="text-sm font-bold tracking-tight text-fg flex items-center gap-1.5">
          <Cpu className="h-4.5 w-4.5 text-pink-500 animate-pulse" />
          Citibank FAST API Clearing Diagnostics
        </h3>
        <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest animate-pulse">
          Online
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { name: "Citibank SG", latency: "11ms", status: "Healthy" },
          { name: "Citibank HK", latency: "14ms", status: "Healthy" },
          { name: "Citibank MY", latency: "18ms", status: "Healthy" },
          { name: "Citibank ID", latency: "22ms", status: "Healthy" },
        ].map((endpoint) => (
          <div key={endpoint.name} className="bg-zinc-500/5 p-3 rounded-xl border border-border/50 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-fg-secondary">{endpoint.name}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-mono font-black text-fg">{endpoint.latency}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-black/80 dark:bg-black/90 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-zinc-400 flex flex-col gap-1 min-h-[95px] overflow-hidden select-none">
        {logs.map((log, idx) => (
          <div key={idx} className="truncate">
            <span className="text-emerald-500">&gt;</span> {log}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ==========================================================================
// MAIN PAGE VIEW
// ==========================================================================

export default function ReportsPage() {
  const { user } = useSession();
  
  useEffect(() => {
    document.title = "Analytics & Diagnostics | ClaimFlow";
  }, []);
  
  const activePerspective = user?.role || "Employee";

  // Selected Category filter for Employee Donut
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Selected date point on line chart
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  // Selected employee for TeamBarChart
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Selected month for MonthlyDisbursementsChart
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Active chart tab (0 vs 1)
  const [chartTab, setChartTab] = useState<number>(0);

  // Reset selections when active view tab or role changes
  useEffect(() => {
    setTimeout(() => {
      setSelectedCategory(null);
      setSelectedPoint(null);
      setSelectedEmployee(null);
      setSelectedMonth(null);
    }, 0);
  }, [chartTab, activePerspective]);

  const handleSelectCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    setSelectedPoint(null);
  };

  const handleSelectPoint = (day: string | null) => {
    setSelectedPoint(day);
    setSelectedCategory(null);
  };

  const reportData = useMemo(() => {
    if (activePerspective === "Employee") {
      return {
        eyebrow: "Personal Insights",
        title: "Expense Breakdown",
        subtitle: "Analyze your personal reimbursement filings and category consumption.",
        stats: [
          { label: "Submitted This Month", value: "S$415.50", desc: "Total 4 claims filed", sparkData: [28.5, 28.5, 51.6, 51.6, 97.1, 97.1, 415.5] },
          { label: "Reimbursed Successfully", value: "S$97.10", desc: "3 claims settled via PayNow", sparkData: [28.5, 28.5, 51.6, 51.6, 97.1, 97.1, 97.1], stroke: "var(--success)" },
          { label: "Pending Approvals", value: "S$318.40", desc: "1 claim queued", sparkData: [0, 0, 0, 0, 0, 0, 318.4], stroke: "var(--warning)" },
        ],
        chartTitle: "Expense Distribution",
        chartTabs: ["Category Share", "Spending Timeline"]
      };
    } else if (activePerspective === "Approving Officer") {
      return {
        eyebrow: "Department Metrics",
        title: "Operations Budget Review",
        subtitle: "Monitor active team expenditure limits and approve rate patterns.",
        stats: [
          { label: "Operations Spend", value: "S$12,450.00", desc: "62.2% of Q2 budget consumed", sparkData: [2000, 3500, 5000, 7800, 9500, 11000, 12450] },
          { label: "Active Team Headcount", value: "5 Employees", desc: "Operations pod filers", sparkData: [5, 5, 5, 5, 5, 5, 5] },
          { label: "Approval Cycle SLA", value: "12 mins avg", desc: "SLA target under 15 mins", sparkData: [24, 20, 18, 15, 14, 13, 12], stroke: "var(--success)" },
        ],
        chartTitle: "Team Expenditures",
        chartTabs: ["Member Breakdown", "Department Health"]
      };
    } else {
      return {
        eyebrow: "SME Treasury Operations",
        title: "Corporate Payouts Ledger",
        subtitle: "Audit disbursement volumes, Citibank API pipelines, and reserves.",
        stats: [
          { label: "Weekly FAST Payouts", value: "S$1,862.00", desc: "Disbursed via corporate FAST API", sparkData: [300, 500, 200, 900, 100, 400, 1862] },
          { label: "Citibank Cash Reserves", value: "S$48,138.00", desc: "Treasury limit: S$50,000.00", sparkData: [50000, 49800, 49200, 48800, 48400, 48138], stroke: "var(--warning)" },
          { label: "Ledger Audit Match", value: "100.00%", desc: "128 block hashes verified", sparkData: [100, 100, 100, 100, 100, 100, 100], stroke: "var(--success)" },
        ],
        chartTitle: "Disbursements & Gateway Traffic",
        chartTabs: ["Monthly cash flow", "Citi API Latency"]
      };
    }
  }, [activePerspective]);

  const renderActiveChart = () => {
    if (activePerspective === "Employee") {
      return chartTab === 0 
        ? <InteractiveDonutChart onSelectCategory={handleSelectCategory} selectedCategory={selectedCategory} />
        : <InteractiveAreaChart selectedPoint={selectedPoint} onSelectPoint={handleSelectPoint} />;
    } else if (activePerspective === "Approving Officer") {
      return chartTab === 0
        ? <TeamBarChart selectedEmployee={selectedEmployee} onSelectEmployee={setSelectedEmployee} />
        : (
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6 text-left">
            <GaugeChart value={94} label="Compliance SLA" />
            <div className="flex flex-col gap-2 max-w-xs text-xs font-medium">
              <span className="text-fg font-bold">Policy Clearance Audits</span>
              <p className="text-fg-secondary leading-normal">
                Out of 14 claims evaluated this month, 12 met all instant-approval criteria. 2 required human review flags.
              </p>
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold mt-1">
                <CheckCircle2 className="h-4 w-4" /> 0 Fraud instances detected
              </div>
            </div>
          </div>
        );
    } else {
      return chartTab === 0
        ? <MonthlyDisbursementsChart selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
        : <CitibankTrafficChart />;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={reportData.eyebrow}
        title={reportData.title}
        subtitle={reportData.subtitle}
      />

      <div className="flex flex-col gap-6">
        {/* Statistics Grid with Sparklines */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {reportData.stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="bg-white/40 dark:bg-zinc-900/30 backdrop-blur-md p-4.5 rounded-2xl border border-border dark:border-white/5 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-grow text-left">
                <span className="text-[10px] font-extrabold text-fg-secondary uppercase tracking-wider block truncate">
                  {stat.label}
                </span>
                <span className="text-2xl font-black text-fg mt-1 block tracking-tight truncate">
                  {stat.value}
                </span>
                <span className="text-xs text-fg-secondary font-medium mt-1 block truncate">
                  {stat.desc}
                </span>
              </div>
              <Sparkline data={stat.sparkData} stroke={stat.stroke} />
            </motion.div>
          ))}
        </div>

        {/* 2-Column Responsive Layout */}
        <div id="reports-analytics-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Chart card (takes 2 columns) */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-3">
                <div className="flex flex-col text-left">
                  <h2 className="text-sm font-extrabold tracking-tight text-fg flex items-center gap-1.5">
                    <BarChart3 className="h-4.5 w-4.5 text-accent" />
                    {reportData.chartTitle}
                  </h2>
                  <span className="text-[10px] text-fg-secondary font-medium mt-0.5">
                    Click on chart elements to filter and inspect transactions in the sidebar.
                  </span>
                </div>
                
                {/* Chart Tab selectors */}
                <div className="flex gap-1.5 bg-surface dark:bg-zinc-900/60 p-0.5 rounded-xl border border-border/60 dark:border-white/5 w-fit">
                  {reportData.chartTabs.map((tab, idx) => (
                    <button
                      key={tab}
                      onClick={() => setChartTab(idx)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        chartTab === idx
                          ? "bg-card text-fg shadow-sm"
                          : "text-fg-tertiary hover:text-fg-secondary"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activePerspective}-${chartTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderActiveChart()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>

            {activePerspective === "Employee" && <PersonalCompliancePanel />}
            {activePerspective === "Approving Officer" && <DepartmentBudgetPanel />}
            {activePerspective === "Finance Admin" && <FastClearingConsole />}
          </div>

          {/* Right sidebar details cards (takes 1 column) */}
          <div className="flex flex-col gap-6">
            {activePerspective === "Employee" && (
              <Card className="p-6 text-left">
                {(selectedPoint || selectedCategory) ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-border/85 pb-2.5 mb-4">
                      <h2 className="text-sm font-extrabold tracking-tight text-fg flex items-center gap-2">
                        <BarChart3 className="h-4.5 w-4.5 text-accent" />
                        {selectedPoint ? `Details: ${selectedPoint}` : `Details: ${selectedCategory}`}
                      </h2>
                      <button 
                        onClick={() => { setSelectedPoint(null); setSelectedCategory(null); }}
                        className="text-[10px] font-black text-accent hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {EXPLORE_CLAIMS.filter(c => 
                        (selectedPoint && c.date === selectedPoint) || 
                        (selectedCategory && c.category === selectedCategory)
                      ).map(c => (
                        <div 
                          key={c.id} 
                          className={cn(
                            "border p-4 rounded-[20px] flex items-start gap-3.5 select-none text-left transition-colors duration-200",
                            c.status === "flagged"
                              ? "bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border-rose-500/5"
                              : "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border-emerald-500/5"
                          )}
                        >
                          {c.status === "flagged" ? (
                            <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-450 shrink-0 mt-0.5" />
                          )}
                          <div className="leading-tight">
                            <span className="text-sm font-extrabold text-fg block">{c.id} &middot; {c.title}</span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] font-bold text-fg-secondary bg-white/40 dark:bg-black/40 px-1.5 py-0.5 rounded border border-border/40 dark:border-white/5">
                                {c.category}
                              </span>
                              <span className="text-[10px] font-mono font-black text-fg">S${c.amount.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-fg-secondary mt-2.5 leading-normal font-medium">
                              {c.details}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-fg border-b border-border/85 pb-2.5 flex items-center gap-1.5">
                      <ShieldAlert className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                      Compliance & Exception Review
                    </h2>
                    <div className="flex flex-col gap-4 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-fg-secondary">Policy Audit Score</span>
                        <span className="text-emerald-500 text-xs font-black">94.1/100</span>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border border-rose-500/5 p-4 rounded-[20px] flex items-start gap-3.5 select-none text-left">
                          <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-450 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="text-sm font-extrabold text-fg block">CLM-1042 · Client Dinner</span>
                            <p className="text-xs text-fg-secondary mt-1.5 leading-normal font-medium">
                              IRAS threshold limit trigger (&gt; S$300). Needs meeting attendee list declared to pass L2 manual audit.
                            </p>
                          </div>
                        </div>

                        <div className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/5 p-4 rounded-[20px] flex items-start gap-3.5 select-none text-left">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-450 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="text-sm font-extrabold text-fg block">CLM-1033 · Transport</span>
                            <p className="text-xs text-fg-secondary mt-1.5 leading-normal font-medium">
                              Audit check complete. Distance matched GPS parameters automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {activePerspective === "Approving Officer" && (
              <Card className="p-6 text-left">
                {selectedEmployee ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-border/85 pb-2.5 mb-4">
                      <h2 className="text-sm font-extrabold tracking-tight text-fg flex items-center gap-1.5">
                        <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                        Alerts: {selectedEmployee}
                      </h2>
                      <button 
                        onClick={() => setSelectedEmployee(null)}
                        className="text-[10px] font-black text-accent hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {selectedEmployee === "Sarah Tan" && (
                        <div className="bg-rose-500/5 border border-rose-500/15 p-4 rounded-[20px] flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between font-bold text-fg">
                            <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> IRAS limit trigger</span>
                            <span className="text-[10px] font-bold text-fg-tertiary">CLM-1042</span>
                          </div>
                          <p className="text-[11px] text-fg-secondary leading-normal mt-1.5 font-medium">
                            Client meeting dinner exceeds S$300 threshold. Ops review required before Finance releases funds.
                          </p>
                        </div>
                      )}
                      
                      {selectedEmployee === "Lim Wei" && (
                        <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-[20px] flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between font-bold text-fg">
                            <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Late night transit</span>
                            <span className="text-[10px] font-bold text-fg-tertiary">CLM-1090</span>
                          </div>
                          <p className="text-[11px] text-fg-secondary leading-normal mt-1.5 font-medium">
                            Transit claim filed on Sunday 03:00 AM. Awaiting weekend travel authorization document.
                          </p>
                        </div>
                      )}

                      {selectedEmployee !== "Sarah Tan" && selectedEmployee !== "Lim Wei" && (
                        <div className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/5 p-4 rounded-[20px] flex items-start gap-3 select-none text-left">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          <div className="leading-tight">
                            <span className="text-sm font-extrabold text-fg block">No warnings active</span>
                            <p className="text-xs text-fg-secondary mt-1.5 leading-normal font-medium">
                              All filed claims for {selectedEmployee} are compliant and cleared L1 verification.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-fg border-b border-border/85 pb-2.5 flex items-center gap-1.5">
                      <ShieldAlert className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                      Policy Trigger Warning Queue
                    </h2>
                    <div className="flex flex-col gap-3 mt-4">
                      <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-[20px] flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between font-bold text-fg">
                          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Late night transit</span>
                          <span>Lim Wei</span>
                        </div>
                        <p className="text-[11px] text-fg-secondary leading-normal mt-1.5 font-medium">
                          CLM-1090 transit claim filed on Sunday 03:00 AM. Awaiting weekend travel authorization document.
                        </p>
                      </div>
                      
                      <div className="bg-rose-500/5 border border-rose-500/15 p-4 rounded-[20px] flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between font-bold text-fg">
                          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> IRAS limit trigger</span>
                          <span>Sarah Tan</span>
                        </div>
                        <p className="text-[11px] text-fg-secondary leading-normal mt-1.5 font-medium">
                          CLM-1042 client meeting dinner exceeds S$300 threshold. Ops review required before Finance releases funds.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {activePerspective === "Finance Admin" && (
              <Card className="p-5 flex flex-col gap-4 text-left">
                {selectedMonth ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-border/85 pb-2.5 mb-4">
                      <h2 className="text-sm font-extrabold tracking-tight text-fg flex items-center gap-1.5">
                        <Cpu className="h-4.5 w-4.5 text-pink-500" />
                        Payout Ledger: {selectedMonth}
                      </h2>
                      <button 
                        onClick={() => setSelectedMonth(null)}
                        className="text-[10px] font-black text-accent hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/5 p-4 rounded-[20px] flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-fg">
                          <span className="text-emerald-600 dark:text-emerald-450 font-extrabold">FAST Cleared API</span>
                          <span className="font-mono text-fg-secondary font-bold">
                            {selectedMonth === "Jun" ? "S$2,800.00" : selectedMonth === "May" ? "S$1,950.00" : "S$1,800.00"}
                          </span>
                        </div>
                        <p className="text-[11px] text-fg-secondary leading-normal font-medium">
                          Citibank transaction batch ID: <code className="font-mono bg-white dark:bg-black px-1 py-0.5 rounded border border-border">TXN-{selectedMonth.toUpperCase()}-99</code>. Cleared central bank settlement ledger.
                        </p>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-900 border border-border/50 p-4 rounded-[20px] flex flex-col gap-1 text-xs">
                        <span className="font-bold text-fg-secondary">Disbursement Summary</span>
                        <div className="flex justify-between items-center text-[10px] mt-1.5 text-fg-tertiary">
                          <span>Clearing gateway:</span>
                          <span className="font-mono">Citibank FAST API</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-fg-tertiary">
                          <span>Avg processing latency:</span>
                          <span className="font-mono">13.8 ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-sm font-bold tracking-tight text-fg border-b border-border/85 pb-2.5 flex items-center gap-1.5">
                      <Cpu className="h-4.5 w-4.5 text-pink-500 animate-pulse" />
                      Treasury Diagnostics
                    </h2>
                    <TreasurySimulator />
                    <ExportPanel />
                  </>
                )}
              </Card>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
