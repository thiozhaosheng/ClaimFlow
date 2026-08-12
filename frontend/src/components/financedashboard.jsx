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
  Car,
  Utensils,
  Wine,
  Package,
  Plane,
  GraduationCap,
  Heart,
  Dumbbell,
  Users,
  Tag,
} from "lucide-react";
import { Badge } from "./ui/badge.jsx";
import { categoryColor } from "../lib/categoryColors.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";
import { Skeleton } from "./ui/skeleton.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.jsx";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet.jsx";
import { useFinanceInsights } from "../hooks/useFinanceInsights.js";
import { formatSGD } from "../utils/helpers.js";
import "./finance-workspace.css";

// Maps the icon keys from categoryColors.js to lucide components.
const CAT_ICON = {
  car: Car,
  utensils: Utensils,
  wine: Wine,
  package: Package,
  plane: Plane,
  graduation: GraduationCap,
  heart: Heart,
  dumbbell: Dumbbell,
  users: Users,
  tag: Tag,
};

// Ranked spend-by-category row: neutral category icon + proportional bar so
// the LENGTH (not a random hue) encodes magnitude. One accent color only.
function CategorySpendRow({ category, amount, max }) {
  const meta = categoryColor(category);
  const Icon = CAT_ICON[meta.icon] || Tag;
  const pct = max > 0 ? Math.max(4, Math.round((amount / max) * 100)) : 0;
  return (
    <div className="spend-row">
      <span className="spend-row-icon">
        <Icon className="h-4 w-4" />
      </span>
      <div className="spend-row-main">
        <div className="spend-row-head">
          <span className="spend-row-name">{category}</span>
          <span className="spend-row-amount">{formatSGD(amount)}</span>
        </div>
        <div className="spend-row-track">
          <div className="spend-row-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

const POLICY_LABELS = {
  "auto-approve": "In policy",
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

/**
 * One figure on the metric strip.
 *
 * Was a floating card with a tinted icon chip and a 2xl number — four of them
 * in a row, which is how a marketing dashboard opens, not how a finance team
 * reads a statement header. The figures now sit on one ruled band and keep
 * every behaviour they had: each one drills into the claims behind it, by
 * pointer or by keyboard, because it is a real <button>.
 */
function MetricItem({ label, value, delta, hint, onClick }) {
  const pct = formatPct(delta);
  return (
    <button
      type="button"
      className="metric-item metric-item-action"
      onClick={onClick}
      title="See the contributing claims"
    >
      <span className="metric-item-label">{label}</span>
      <span className="metric-item-value">{value}</span>
      <span className="metric-item-sub">
        {pct ? (
          <>
            <span
              className={`metric-delta ${
                delta >= 0 ? "metric-delta-up" : "metric-delta-down"
              }`}
            >
              {pct}
            </span>{" "}
            vs previous period
          </>
        ) : (
          hint || ""
        )}
      </span>
    </button>
  );
}

function PolicyMeter({ label, value, total, tone }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="fin-meter">
      <div className="fin-meter-head">
        <span>{label}</span>
        <span className="fin-meter-value">
          {value} · {pct}%
        </span>
      </div>
      <div className="fin-meter-track">
        <div
          className={`fin-meter-fill fin-meter-fill-${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="fin-tooltip">
      {label && <div className="fin-tooltip-label">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name} className="fin-tooltip-row">
          <span
            className="fin-tooltip-swatch"
            style={{ background: entry.color }}
          />
          <span className="fin-tooltip-name">{entry.name}</span>
          <span className="fin-tooltip-value">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A panel head: title on the left, an optional plain note on the right. */
function PanelHead({ title, note }) {
  return (
    <div className="data-panel-head">
      <h3 className="data-panel-title">{title}</h3>
      {note && <span className="data-panel-note">{note}</span>}
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
      <div className="finance-ws">
        <Skeleton className="h-9" />
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="finance-ws">
      {/* Scope of the figures on the left, the range they cover on the right —
          the two things you check before you trust a number. */}
      <div className="fin-contextbar">
        <div className="flex items-center gap-2">
          <span className="fin-chip">SGD · GST 9%</span>
          <span className="fin-context-note">
            Figures include GST where applicable
          </span>
        </div>
        <div className="w-44">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="fin-select-trigger" aria-label="Date range">
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

        <TabsContent value="overview" className="space-y-3">
          <div className="metric-strip">
            <MetricItem
              label="Total claims"
              value={view.totals.count.toLocaleString()}
              delta={view.totals.countDelta}
              onClick={() => setDrillKey("count")}
            />
            <MetricItem
              label="Total spend"
              value={formatSGD(view.totals.spend)}
              delta={view.totals.spendDelta}
              onClick={() => setDrillKey("spend")}
            />
            <MetricItem
              label="Disbursed"
              value={formatSGD(view.totals.disbursed)}
              hint={`${view.totals.disbursedCount} paid claims`}
              onClick={() => setDrillKey("disbursed")}
            />
            <MetricItem
              label="In flight"
              value={(
                view.totals.pendingEndorsement + view.totals.awaitingPayout
              ).toString()}
              hint={`${view.totals.pendingEndorsement} pending · ${view.totals.awaitingPayout} awaiting payout`}
              onClick={() => setDrillKey("inflight")}
            />
          </div>

          {/* Two panels side by side on a wide screen. Stacked full-width they
              pushed the dashboard 150px past the fold while leaving half the row
              empty — the composition and the fit were the same problem. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Spend by category — ranked bars (length encodes magnitude) */}
            {view.byCategory && view.byCategory.length > 0 && (
              <section className="data-panel">
                <PanelHead
                  title="Spend by category"
                  note="Total per category in range"
                />
                <div className="fin-panel-body">
                  {/* Five, not eight: the long tail of tiny categories pushed
                      the dashboard past the fold, and a category with S$12 in
                      it is not what finance opens this page to see. */}
                  <div className="fin-panel-rows">
                    {view.byCategory.slice(0, 5).map((c) => (
                      <CategorySpendRow
                        key={c.category}
                        category={c.category}
                        amount={c.amount}
                        max={view.byCategory[0].amount}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* submission trend */}
            <section className="data-panel">
              <PanelHead
                title="Submission and disbursement trend"
                note="Weekly volume in range"
              />
              <div className="fin-panel-body">
                {view.submissionTrend.length === 0 ? (
                  <div className="fin-panel-empty">No data in this range yet</div>
                ) : (
                  <div className="fin-chart">
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
                          width={32}
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
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="spend" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="data-panel">
              <PanelHead
                title="Spend by department"
                note={`Top ${Math.min(8, view.byDepartment.length)} by total spend`}
              />
              <div className="fin-panel-body">
                {view.byDepartment.length === 0 ? (
                  <div className="fin-panel-empty fin-panel-empty-tall">
                    No spend in this range
                  </div>
                ) : (
                  <div className="fin-chart fin-chart-tall">
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
                          content={<ChartTooltip formatter={(v) => formatSGD(v)} />}
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
              </div>
            </section>

            <section className="data-panel">
              <PanelHead
                title="Category mix"
                note="Share of total spend by category"
              />
              <div className="fin-panel-body">
                {view.byCategory.length === 0 ? (
                  <div className="fin-panel-empty fin-panel-empty-tall">
                    No spend in this range
                  </div>
                ) : (
                  <div className="fin-chart fin-chart-tall">
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
                          content={<ChartTooltip formatter={(v) => formatSGD(v)} />}
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
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="policy" className="space-y-3">
          <section className="data-panel">
            <PanelHead
              title="Policy outcomes"
              note="What the approval policy would do with each claim in range"
            />
            <div className="fin-panel-body">
              {policyTotal === 0 ? (
                <div className="fin-panel-empty">
                  No claims to evaluate in this range
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <PolicyMeter
                      label="In policy"
                      value={view.policyCounts["auto-approve"] || 0}
                      total={policyTotal}
                      tone="success"
                    />
                    <PolicyMeter
                      label="Routed to human"
                      value={view.policyCounts["route-to-human"] || 0}
                      total={policyTotal}
                      tone="warning"
                    />
                    <PolicyMeter
                      label="Blocked"
                      value={view.policyCounts.block || 0}
                      total={policyTotal}
                      tone="danger"
                    />
                  </div>
                  <div>
                    <div className="fin-subhead">Top rules hit</div>
                    <ul className="fin-list">
                      {view.topPolicyReasons.map((r) => (
                        <li key={`${r.outcome}-${r.ruleId}`}>
                          <span className="min-w-0 flex items-center gap-2">
                            <span className="fin-rule-id">{r.ruleId}</span>
                            <Badge variant={POLICY_VARIANT[r.outcome]}>
                              {POLICY_LABELS[r.outcome]}
                            </Badge>
                          </span>
                          <span className="fin-num">{r.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="data-panel">
              <PanelHead title="Top claimants" note="By total spend in range" />
              <div className="fin-panel-body">
                {view.topClaimants.length === 0 ? (
                  <div className="fin-panel-empty">No claims in this range</div>
                ) : (
                  <ul className="fin-list">
                    {view.topClaimants.map((c) => (
                      <li key={c.name}>
                        <span>{c.name}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="fin-list-meta">
                            {c.count} claim{c.count === 1 ? "" : "s"}
                          </span>
                          <span className="fin-num">{formatSGD(c.total)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="data-panel">
              <PanelHead title="Status distribution" note="Claims in range" />
              <div className="fin-panel-body">
                <ul className="fin-list">
                  {view.statusDistribution.map((s) => {
                    const variantMap = {
                      Pending: "warning",
                      Endorsed: "default",
                      Paid: "success",
                      Rejected: "destructive",
                    };
                    return (
                      <li key={s.status}>
                        <Badge variant={variantMap[s.status]}>{s.status}</Badge>
                        <span className="fin-num">{s.count}</span>
                      </li>
                    );
                  })}
                  <li>
                    <span className="fin-list-meta">Average claim value</span>
                    <span className="fin-num">{formatSGD(view.totals.avgClaim)}</span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </TabsContent>
      </Tabs>

      {/* drill-down sheet for the metric strip */}
      <Sheet open={!!drillKey} onOpenChange={(o) => !o && setDrillKey(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {drillKey && (
            <div className="finance-ws-drill">
              <div className="fin-drill-head">
                <div className="fin-drill-eyebrow">Breakdown</div>
                <SheetTitle asChild>
                  <h2 className="fin-drill-title">{DRILL_DEFS[drillKey].title}</h2>
                </SheetTitle>
                <p className="fin-drill-sub">
                  {drillClaims.length} claim{drillClaims.length === 1 ? "" : "s"}
                  {" · "}
                  Total {formatSGD(drillTotal)}
                </p>
              </div>
              <div className="fin-drill-body">
                {drillClaims.length === 0 ? (
                  <p className="fin-drill-empty">No claims in this slice</p>
                ) : (
                  <ul className="list-none m-0 p-0">
                    {drillClaims
                      .slice()
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((c) => (
                        <li key={c.id} className="fin-drill-row">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="data-ref">{c.id}</span>
                              <span
                                className={`badge-custom badge-${c.status.toLowerCase()}`}
                              >
                                {c.status}
                              </span>
                            </div>
                            <div className="fin-drill-meta">
                              {c.employee} · {c.type} · {c.date}
                            </div>
                          </div>
                          <span className="fin-drill-amount">
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
