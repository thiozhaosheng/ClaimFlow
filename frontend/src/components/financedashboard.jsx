import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet.jsx";
import { useFinanceInsights, claimInRange } from "../hooks/useFinanceInsights.js";
import { formatSGD } from "../utils/helpers.js";
import "./finance-workspace.css";

// Ranked spend-by-category row: the bar's LENGTH carries the magnitude.
// The icon that used to sit at the head of each row is gone — a wine glass
// beside the words "Client Entertainment", once per row, is a picture of the
// text next to it, and it was the last thing in the app still pulling from the
// eleven-hue category palette.
function CategorySpendRow({ category, amount, max, onOpen }) {
  const pct = max > 0 ? Math.max(4, Math.round((amount / max) * 100)) : 0;
  // A real <button>: the figure opens the claims it was summed from. These
  // rows were the first thing a manager clicked and the click did nothing —
  // "when I click into the numbers I am to see the details" is the whole ask.
  return (
    <button
      type="button"
      className="spend-row spend-row-open"
      onClick={onOpen}
      title="See the claims behind this figure"
    >
      <div className="spend-row-main">
        <div className="spend-row-head">
          <span className="spend-row-name">{category}</span>
          <span className="spend-row-amount">{formatSGD(amount)}</span>
        </div>
        <div className="spend-row-track">
          <div className="spend-row-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </button>
  );
}

/** One computed sentence under a chart: the driver, named, with its figure.
    A trend that cannot say which week mattered or why is decoration. */
function PanelStory({ children }) {
  if (!children) return null;
  return <p className="fin-story">{children}</p>;
}

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

// The same three words PolicyFlag puts on a claim row. This file said "Routed
// to human" where every other screen says "Needs review", so one outcome had
// two names depending on which page you were on.
const POLICY_LABELS = {
  "auto-approve": "In policy",
  "route-to-human": "Needs review",
  block: "Blocked",
};

// Needs review is where two thirds of claims land. Amber on it is amber on the
// ordinary case, which is how a colour stops meaning anything.
const POLICY_VARIANT = {
  "auto-approve": "success",
  "route-to-human": "secondary",
  block: "destructive",
};

// One hue, six steps, largest share first. See --chart-* in index.css for why
// a ramp rather than a hue per category — and for what this replaced, which was
// four design tokens (two of them status colours that mean something) plus four
// hardcoded iOS system colours.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
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

function PolicyMeter({ label, value, total, tone, onOpen }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <button
      type="button"
      className="fin-meter fin-meter-open"
      onClick={onOpen}
      disabled={!onOpen || value === 0}
      title={value > 0 ? "See the claims behind this figure" : undefined}
    >
      <div className="fin-meter-head">
        <span>{label}</span>
        <span className="fin-meter-value">
          {value} claims · {pct}%
        </span>
      </div>
      <div className="fin-meter-track">
        <div
          className={`fin-meter-fill fin-meter-fill-${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
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

export default function FinanceDashboard({ claims, auditLog = [], loading }) {
  const navigate = useNavigate();
  const [range, setRange] = useState("30d");
  const [subTab, setSubTab] = useState("overview");
  // Every figure on this dashboard opens the claims it was computed from —
  // a drill is just a titled list of those claims. It used to be four fixed
  // keys on the metric strip while every other number on the page was dead.
  const [drill, setDrill] = useState(null);

  // unique claims only (latest record per id)
  const uniqueClaims = useMemo(() => {
    const map = new Map();
    for (const c of claims || []) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return [...map.values()];
  }, [claims]);

  // The audit log carries the only record of WHEN a claim was paid — there is
  // no paidAt column — so the disbursement figures need it to mean anything.
  const uniqueInsights = useFinanceInsights(uniqueClaims, range, auditLog);
  const view = uniqueInsights;

  const claimsInRange = useMemo(() => {
    const now = new Date();
    return uniqueClaims.filter((c) => claimInRange(c, range, now));
  }, [uniqueClaims, range]);

  const openDrill = (title, list) => setDrill({ title, claims: list });

  const drillClaims = drill?.claims || [];
  const drillTotal = drillClaims.reduce((s, c) => s + (c.amount || 0), 0);

  const byCategoryOf = (name) =>
    claimsInRange.filter((c) => (c.type || "Other") === name);

  // Five slices and a remainder. The ramp has six steps; beyond that recharts
  // starts reusing colours, so two categories would be drawn the same. A long
  // tail is also not what finance opens this panel to see.
  const categoryMix = useMemo(() => {
    const all = view.byCategory || [];
    if (all.length <= 6) return all;
    const head = all.slice(0, 5);
    const restTotal = all.slice(5).reduce((s2, c) => s2 + c.amount, 0);
    return [...head, { category: `Other (${all.length - 5})`, amount: restTotal }];
  }, [view.byCategory]);

  const policyTotal =
    (view.policyCounts["auto-approve"] || 0) +
    (view.policyCounts["route-to-human"] || 0) +
    (view.policyCounts["block"] || 0);

  // ---- the story each chart owes its reader --------------------------------
  // One sentence per panel, every number computed from the same data the
  // chart draws. A chart shows the shape; the line names the driver — without
  // it the reader is left asking "so what" of a perfectly rendered trend.
  const pctOf = (part, whole) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

  const categoryStory = useMemo(() => {
    const cats = view.byCategory || [];
    if (cats.length === 0 || view.totals.spend <= 0) return null;
    const lead = cats[0];
    let line = `${lead.category} leads at ${pctOf(lead.amount, view.totals.spend)}% of spend.`;
    // The fastest riser vs the previous period — only stated when both
    // periods hold real figures, and only when the move is worth naming.
    let riser = null;
    for (const c of cats) {
      const before = view.byCategoryPrev?.get(c.category) || 0;
      if (before <= 0 || c.amount <= before) continue;
      const growth = (c.amount - before) / before;
      if (growth >= 0.15 && (!riser || growth > riser.growth)) {
        riser = { ...c, before, growth };
      }
    }
    if (riser) {
      line += ` ${riser.category} grew fastest — ${formatSGD(riser.before)} to ${formatSGD(riser.amount)} vs the previous period.`;
    }
    return line;
  }, [view.byCategory, view.byCategoryPrev, view.totals.spend]);

  const trendStory = view.heaviestWeek
    ? `Week of ${view.heaviestWeek.weekLabel} was the heaviest — ${view.heaviestWeek.submitted} claims for ${formatSGD(view.heaviestWeek.spend)}` +
      (view.heaviestWeek.topCategory
        ? `, led by ${view.heaviestWeek.topCategory} (${formatSGD(view.heaviestWeek.topCategoryAmount)}).`
        : ".")
    : null;

  const departmentStory = useMemo(() => {
    const depts = view.byDepartment || [];
    if (depts.length < 3 || view.totals.spend <= 0) return null;
    const topTwo = depts.slice(0, 2);
    const share = pctOf(
      topTwo.reduce((s, d) => s + d.amount, 0),
      view.totals.spend,
    );
    return `${topTwo[0].department} and ${topTwo[1].department} carry ${share}% of spend across ${depts.length} departments.`;
  }, [view.byDepartment, view.totals.spend]);

  // What "Other" folds away, named — a manager asking "what did we spend on
  // meals?" should not find the answer hidden inside a grey slice.
  const otherCategories = (view.byCategory || []).slice(5);
  const donutStory =
    otherCategories.length > 0
      ? `Other is ${otherCategories.map((c) => c.category).join(" and ")} — ${formatSGD(
          otherCategories.reduce((s, c) => s + c.amount, 0),
        )} together.`
      : null;

  const noRuleCount = useMemo(() => {
    let n = 0;
    for (const p of view.policyByClaim?.values() || []) {
      if (p.ruleId === "default") n += 1;
    }
    return n;
  }, [view.policyByClaim]);
  const policyStory =
    policyTotal > 0 && noRuleCount > 0
      ? `No rule matched ${noRuleCount} of ${policyTotal} claims — those decisions rest entirely on the approving officer.`
      : null;

  const topFiveCategories = new Set(
    (view.byCategory || []).slice(0, 5).map((c) => c.category),
  );
  const onSliceOpen = (data) => {
    const name = data?.name ?? data?.payload?.category;
    if (!name) return;
    if (String(name).startsWith("Other (")) {
      openDrill(
        `${name} — beyond the top five categories`,
        claimsInRange.filter((c) => !topFiveCategories.has(c.type || "Other")),
      );
    } else {
      openDrill(`${name} — claims in range`, byCategoryOf(name));
    }
  };

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
              onClick={() => openDrill("All claims in range", claimsInRange)}
            />
            <MetricItem
              label="Total spend"
              value={formatSGD(view.totals.spend)}
              delta={view.totals.spendDelta}
              onClick={() =>
                openDrill("Claims contributing to total spend", claimsInRange)
              }
            />
            <MetricItem
              label="Disbursed"
              value={formatSGD(view.totals.disbursed)}
              hint={`${view.totals.disbursedCount} paid claims`}
              onClick={() =>
                // Disbursement is counted on the day the money left, so its
                // drill-down is the same set the figure was computed from —
                // "Paid" claims SUBMITTED in range would not add up to it.
                openDrill(
                  "Disbursed (paid) claims",
                  uniqueClaims.filter((c) => view.disbursedIds.has(c.id)),
                )
              }
            />
            <MetricItem
              label="In flight"
              value={(
                view.totals.pendingEndorsement + view.totals.awaitingPayout
              ).toString()}
              hint={`${view.totals.pendingEndorsement} pending · ${view.totals.awaitingPayout} awaiting payout`}
              onClick={() =>
                openDrill(
                  "In-flight claims (Pending or Endorsed)",
                  claimsInRange.filter(
                    (c) => c.status === "Pending" || c.status === "Endorsed",
                  ),
                )
              }
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
                        onOpen={() =>
                          openDrill(
                            `${c.category} — claims in range`,
                            byCategoryOf(c.category),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
                <PanelStory>{categoryStory}</PanelStory>
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
                          dataKey="weekLabel"
                          fontSize={12}
                          tick={{ fill: "var(--text-tertiary)" }}
                          axisLine={{ stroke: "var(--border-subtle)" }}
                          tickLine={false}
                        />
                        <YAxis
                          fontSize={12}
                          tick={{ fill: "var(--text-tertiary)" }}
                          axisLine={{ stroke: "var(--border-subtle)" }}
                          tickLine={false}
                          width={32}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                          iconType="circle"
                          // Recharts paints the legend LABEL in the series
                          // colour. The coloured dot beside it already says
                          // which series this is, and the word inheriting the
                          // fill left "Disbursed" at 3.1:1 once that fill was
                          // lightened. The dot carries the colour; the word is
                          // ordinary text.
                          formatter={(value) => (
                            <span style={{ color: "var(--text-secondary)" }}>{value}</span>
                          )}
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="submitted"
                          name="Submitted"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          fill="url(#grad-sub)"
                        />
                        <Area
                          isAnimationActive={false}
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
              <PanelStory>{trendStory}</PanelStory>
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
                          fontSize={12}
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
                          fontSize={12}
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
                          isAnimationActive={false}
                          dataKey="amount"
                          name="Spend"
                          fill="var(--accent)"
                          radius={[0, 4, 4, 0]}
                          cursor="pointer"
                          onClick={(entry) => {
                            const dept =
                              entry?.department ?? entry?.payload?.department;
                            if (!dept) return;
                            openDrill(
                              `${dept} — claims in range`,
                              claimsInRange.filter(
                                (c) => (c.department || "Other") === dept,
                              ),
                            );
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <PanelStory>{departmentStory}</PanelStory>
            </section>

            <section className="data-panel">
              <PanelHead
                title="Category mix"
                note="Share of total spend by category"
              />
              <div className="fin-panel-body">
                {categoryMix.length === 0 ? (
                  <div className="fin-panel-empty fin-panel-empty-tall">
                    No spend in this range
                  </div>
                ) : (
                  <div className="fin-chart fin-chart-tall">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={categoryMix}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={48}
                          outerRadius={88}
                          paddingAngle={1}
                          stroke="var(--bg-card)"
                          strokeWidth={2}
                          cursor="pointer"
                          onClick={onSliceOpen}
                        >
                          {categoryMix.map((_, idx) => (
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
                          wrapperStyle={{ fontSize: 12 }}
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
              <PanelStory>{donutStory}</PanelStory>
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
                    {[
                      { key: "auto-approve", label: "In policy", tone: "success" },
                      { key: "route-to-human", label: "Needs review", tone: "neutral" },
                      { key: "block", label: "Blocked", tone: "danger" },
                    ].map(({ key, label, tone }) => (
                      <PolicyMeter
                        key={key}
                        label={label}
                        value={view.policyCounts[key] || 0}
                        total={policyTotal}
                        tone={tone}
                        onOpen={() =>
                          openDrill(
                            `${label} — what the policy would say per claim`,
                            claimsInRange.filter(
                              (c) => view.policyByClaim.get(c.id)?.outcome === key,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                  <div>
                    <div className="fin-subhead">Top rules hit</div>
                    <ul className="fin-list">
                      {view.topPolicyReasons.map((r) => (
                        <li key={`${r.outcome}-${r.ruleId}`}>
                          <button
                            type="button"
                            className="fin-list-open"
                            title="See the claims this rule matched"
                            onClick={() =>
                              openDrill(
                                `${r.label || r.ruleId} — claims this outcome covers`,
                                claimsInRange.filter((c) => {
                                  const p = view.policyByClaim.get(c.id);
                                  return (
                                    p &&
                                    p.outcome === r.outcome &&
                                    p.ruleId === r.ruleId
                                  );
                                }),
                              )
                            }
                          >
                            <span className="min-w-0 flex items-center gap-2">
                              <span className="fin-rule-id">{r.label || r.ruleId}</span>
                              <Badge variant={POLICY_VARIANT[r.outcome]}>
                                {POLICY_LABELS[r.outcome]}
                              </Badge>
                            </span>
                            <span className="fin-num">{r.count}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <PanelStory>{policyStory}</PanelStory>
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
                        <button
                          type="button"
                          className="fin-list-open"
                          title="See this person's claims in range"
                          onClick={() =>
                            openDrill(
                              `${c.name} — claims in range`,
                              claimsInRange.filter(
                                (x) => (x.employee || "Unknown") === c.name,
                              ),
                            )
                          }
                        >
                          <span>{c.name}</span>
                          <span className="flex items-baseline gap-2">
                            <span className="fin-list-meta">
                              {c.count} claim{c.count === 1 ? "" : "s"}
                            </span>
                            <span className="fin-num">{formatSGD(c.total)}</span>
                          </span>
                        </button>
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
                    // Same rule as the badges in the ledgers: colour marks the
                    // exception. Pending and Endorsed are where claims live.
                    const variantMap = {
                      Pending: "secondary",
                      Endorsed: "secondary",
                      Paid: "success",
                      Rejected: "destructive",
                    };
                    return (
                      <li key={s.status}>
                        <button
                          type="button"
                          className="fin-list-open"
                          title={`See the ${s.status.toLowerCase()} claims`}
                          onClick={() =>
                            openDrill(
                              `${s.status} claims in range`,
                              claimsInRange.filter((c) => c.status === s.status),
                            )
                          }
                        >
                          <Badge variant={variantMap[s.status]}>{s.status}</Badge>
                          <span className="fin-num">{s.count}</span>
                        </button>
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

      {/* Every figure's drill-down lands here: the claims it was computed
          from, each row opening its record. */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {drill && (
            <div className="finance-ws-drill">
              <div className="fin-drill-head">
                <div className="fin-drill-eyebrow">Breakdown</div>
                <SheetTitle asChild>
                  <h2 className="fin-drill-title">{drill.title}</h2>
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
                    {/* Each row is the claim it names: the breakdown listed 72
                        claims and opened none of them — a figure you could
                        click into, and then a dead end. NOTE: this comment
                        cannot sit inside the parenthesised map body below,
                        which is the same trap already documented in
                        approving.jsx. */}
                    {drillClaims
                      .slice()
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="fin-drill-row fin-drill-row-open"
                            onClick={() => navigate(`/claim/${c.id}`)}
                          >
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
                          </button>
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
