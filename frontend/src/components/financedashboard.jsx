import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ListChecks,
  Receipt,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";
import { Skeleton } from "./ui/skeleton.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.jsx";
import { Sheet, SheetContent } from "./ui/sheet.jsx";
import { useFinanceInsights } from "../hooks/useFinanceInsights.js";
import { formatSGD } from "../utils/helpers.js";

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

const POLICY_LABELS = {
  "auto-approve": "Auto-approved",
  "route-to-human": "Routed to human",
  block: "Blocked",
};

const POLICY_VARIANT = {
  "auto-approve": "success",
  "route-to-human": "warning",
  block: "destructive",
};

const CHART_COLORS = [
  "var(--accent)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "#af52de",
  "#ff6a00",
  "#5856d6",
  "#34c759",
];

function formatPct(n) {
  if (n === null || n === undefined || !isFinite(n)) return null;
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(0)}%`;
}

function StatTile({ icon: Icon, label, value, delta, hint, onClick }) {
  const positive = delta != null && delta >= 0;
  const interactive = typeof onClick === "function";
  return (
    <Card
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={
        interactive
          ? "cursor-pointer transition hover:shadow-ds-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tracking-tight tabular-nums">
          {value}
        </div>
        {delta != null && (
          <div
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              positive ? "text-success-text" : "text-danger-text"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span>{formatPct(delta)}</span>
            <span className="text-muted-foreground font-normal">
              vs previous period
            </span>
          </div>
        )}
        {hint && !delta && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
        {interactive && (
          <div className="mt-1 text-[10px] text-text-tertiary">
            Click to see contributing claims
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PolicyBar({ label, value, total, variant }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const barColor =
    variant === "success"
      ? "bg-success"
      : variant === "warning"
        ? "bg-warning"
        : "bg-destructive";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value} <span className="opacity-60">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-ds-md border border-border-subtle bg-popover shadow-ds-md p-3 text-xs">
      {label && <div className="font-semibold mb-1">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const DRILL_DEFS = {
  count: {
    title: "All claims in range",
    filter: (c) => true,
  },
  spend: {
    title: "Claims contributing to total spend",
    filter: (c) => true,
  },
  disbursed: {
    title: "Disbursed (paid) claims",
    filter: (c) => c.status === "Paid",
  },
  inflight: {
    title: "In-flight claims (Pending or Endorsed)",
    filter: (c) => c.status === "Pending" || c.status === "Endorsed",
  },
};

function claimInRange(claim, range, now = new Date()) {
  if (range === "all") return true;
  const d = new Date(claim.date);
  if (Number.isNaN(d.getTime())) return false;
  const days = Math.floor((now - d) / 86_400_000);
  if (range === "30d") return days <= 30;
  if (range === "90d") return days <= 90;
  if (range === "ytd") return d >= new Date(now.getFullYear(), 0, 1);
  return true;
}

export default function FinanceDashboard({ claims, loading }) {
  const [range, setRange] = useState("30d");
  const [subTab, setSubTab] = useState("overview");
  const [drillKey, setDrillKey] = useState(null);
  const insights = useFinanceInsights(claims, range);

  // unique claims only (latest record per id)
  const uniqueClaims = useMemo(() => {
    const map = new Map();
    for (const c of claims || []) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return [...map.values()];
  }, [claims]);

  const uniqueInsights = useFinanceInsights(uniqueClaims, range);
  const view = uniqueInsights;

  const claimsInRange = useMemo(() => {
    const now = new Date();
    return uniqueClaims.filter((c) => claimInRange(c, range, now));
  }, [uniqueClaims, range]);

  const drillClaims = useMemo(() => {
    if (!drillKey) return [];
    const def = DRILL_DEFS[drillKey];
    return claimsInRange.filter(def.filter);
  }, [drillKey, claimsInRange]);

  const drillTotal = drillClaims.reduce((s, c) => s + (c.amount || 0), 0);

  const policyTotal =
    (view.policyCounts["auto-approve"] || 0) +
    (view.policyCounts["route-to-human"] || 0) +
    (view.policyCounts["block"] || 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* range selector + SG context strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center rounded-full border border-border-subtle bg-subtle px-2 py-0.5 font-medium text-text-secondary">
            SGD · GST 9%
          </span>
          <span>Figures include GST where applicable</span>
        </div>
        <div className="w-44">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spend">Spend</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Receipt}
          label="Total claims"
          value={view.totals.count.toLocaleString()}
          delta={view.totals.countDelta}
          onClick={() => setDrillKey("count")}
        />
        <StatTile
          icon={TrendingUp}
          label="Total spend"
          value={formatSGD(view.totals.spend)}
          delta={view.totals.spendDelta}
          onClick={() => setDrillKey("spend")}
        />
        <StatTile
          icon={Wallet}
          label="Disbursed"
          value={formatSGD(view.totals.disbursed)}
          hint={`${view.totals.disbursedCount} paid claims`}
          onClick={() => setDrillKey("disbursed")}
        />
        <StatTile
          icon={Clock}
          label="In flight"
          value={(view.totals.pendingEndorsement + view.totals.awaitingPayout).toString()}
          hint={`${view.totals.pendingEndorsement} pending · ${view.totals.awaitingPayout} awaiting payout`}
          onClick={() => setDrillKey("inflight")}
        />
      </div>

      {/* submission trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submission &amp; disbursement trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Weekly volume across the selected range
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {view.submissionTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No data in this range yet
            </div>
          ) : (
            <div className="h-48 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={view.submissionTrend}>
                  <defs>
                    <linearGradient id="grad-sub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-dis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="week"
                    fontSize={11}
                    tick={{ fill: "var(--text-tertiary)" }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={false}
                  />
                  <YAxis
                    fontSize={11}
                    tick={{ fill: "var(--text-tertiary)" }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="submitted"
                    name="Submitted"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#grad-sub)"
                  />
                  <Area
                    type="monotone"
                    dataKey="disbursed"
                    name="Disbursed"
                    stroke="var(--success)"
                    strokeWidth={2}
                    fill="url(#grad-dis)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="spend" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Spend by department</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Top {Math.min(8, view.byDepartment.length)} departments by total spend
            </p>
          </CardHeader>
          <CardContent>
            {view.byDepartment.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No spend in this range
              </div>
            ) : (
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={view.byDepartment.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      fontSize={11}
                      tick={{ fill: "var(--text-tertiary)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
                      }
                    />
                    <YAxis
                      dataKey="department"
                      type="category"
                      fontSize={11}
                      tick={{ fill: "var(--text-secondary)" }}
                      axisLine={false}
                      tickLine={false}
                      width={92}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--bg-subtle)" }}
                      content={
                        <ChartTooltip formatter={(v) => formatSGD(v)} />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      name="Spend"
                      fill="var(--accent)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Share of total spend by claim category
            </p>
          </CardHeader>
          <CardContent>
            {view.byCategory.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No spend in this range
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={view.byCategory}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={48}
                      outerRadius={88}
                      paddingAngle={1}
                      stroke="var(--bg-card)"
                      strokeWidth={2}
                    >
                      {view.byCategory.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v) => formatSGD(v)} />
                      }
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Policy outcomes</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                What the approval policy would do with each claim in this range
              </p>
            </div>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {policyTotal === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No claims to evaluate in this range
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <PolicyBar
                  label="Auto-approved"
                  value={view.policyCounts["auto-approve"] || 0}
                  total={policyTotal}
                  variant="success"
                />
                <PolicyBar
                  label="Routed to human"
                  value={view.policyCounts["route-to-human"] || 0}
                  total={policyTotal}
                  variant="warning"
                />
                <PolicyBar
                  label="Blocked"
                  value={view.policyCounts.block || 0}
                  total={policyTotal}
                  variant="destructive"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Top rules hit
                </div>
                <ul className="space-y-2">
                  {view.topPolicyReasons.map((r) => (
                    <li
                      key={`${r.outcome}-${r.ruleId}`}
                      className="flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <code className="text-[11px] text-foreground">
                          {r.ruleId}
                        </code>
                        <div className="mt-0.5">
                          <Badge variant={POLICY_VARIANT[r.outcome]}>
                            {POLICY_LABELS[r.outcome]}
                          </Badge>
                        </div>
                      </div>
                      <span className="tabular-nums font-medium pt-0.5">
                        {r.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Top claimants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {view.topClaimants.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data</div>
            ) : (
              <ul className="space-y-2">
                {view.topClaimants.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">
                        {c.count} claim{c.count === 1 ? "" : "s"}
                      </span>
                      <span className="tabular-nums font-semibold">
                        {formatSGD(c.total)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Status distribution</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {view.statusDistribution.map((s) => {
                const variantMap = {
                  Pending: "warning",
                  Endorsed: "default",
                  Paid: "success",
                  Rejected: "destructive",
                };
                return (
                  <li
                    key={s.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <Badge variant={variantMap[s.status]}>{s.status}</Badge>
                    <span className="tabular-nums font-semibold">
                      {s.count}
                    </span>
                  </li>
                );
              })}
              <li className="pt-2 border-t border-border-subtle flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Avg claim value
                </span>
                <span className="tabular-nums font-semibold">
                  {formatSGD(view.totals.avgClaim)}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>

      {/* drill-down sheet for stat tiles */}
      <Sheet open={!!drillKey} onOpenChange={(o) => !o && setDrillKey(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {drillKey && (
            <div className="flex h-full flex-col">
              <div className="px-5 py-4 border-b border-border-subtle">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-text-tertiary">
                  Breakdown
                </div>
                <h3 className="text-base font-semibold tracking-tight mt-0.5">
                  {DRILL_DEFS[drillKey].title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {drillClaims.length} claim{drillClaims.length === 1 ? "" : "s"}
                  {" · "}
                  Total {formatSGD(drillTotal)}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {drillClaims.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No claims in this slice
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {drillClaims
                      .slice()
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-ds-md border border-border-subtle bg-card px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold tabular-nums">
                                {c.id}
                              </span>
                              <span
                                className={`badge-custom badge-${c.status.toLowerCase()}`}
                              >
                                {c.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-secondary truncate">
                              {c.employee} · {c.type} · {c.date}
                            </div>
                          </div>
                          <span className="text-sm font-bold tabular-nums">
                            {formatSGD(c.amount)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
