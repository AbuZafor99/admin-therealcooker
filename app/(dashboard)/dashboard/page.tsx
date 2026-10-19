"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChartLine, Database, GraduationCap, IdCard, Landmark, ScanEye, Search, Server } from "lucide-react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccess } from "@/components/admin-access";
import { getExecutiveDashboard, getInfrastructure, type ExecutiveDashboard, type Infrastructure, type ServiceState } from "@/lib/operations";
import { apiError, cn } from "@/lib/utils";
import { bytes, card, dateTime, duration, MeterRow, MiniStat, muted, Note, number, Panel, percent, SectionLabel, StatCard, timeAgo, uptimeTone } from "@/components/dashboard-ui";

function PanicIcon() {
  return <span className="text-[11px] font-extrabold tracking-tight">SOS</span>;
}

// Incident classification follows the incident type: a direct SOS is Critical, an "Alert Guardians"
// request is an Elevated Guardian Panic.
const classificationStyle: Record<string, { dot: string; label: string }> = {
  sos: { dot: "bg-[#e5484d]", label: "Critical SOS" },
  guardian_alert: { dot: "bg-[#d98a00]", label: "Elevated Guardian Panic" },
};
const alertStatusStyle: Record<string, string> = { open: "bg-[#f9d9d9] text-[#a12b2b]", acknowledged: "bg-[#f8e5b8] text-[#7a4b00]", resolved: "bg-[#dcefd8] text-[#1f6b1f]" };
const kycStyle: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-[#f8e5b8] text-[#7a4b00]" },
  completed: { label: "Verified", className: "bg-[#dcefd8] text-[#1f6b1f]" },
  failed: { label: "Rejected", className: "bg-[#f9d9d9] text-[#a12b2b]" },
};
const serviceStateLabel: Record<ServiceState, string> = { monitored: "Monitored", collecting: "Collecting data", not_configured: "Not configured", not_integrated: "Not integrated", not_monitored: "Not monitored" };
// Listed bottom-to-top as stacked in each bar; the legend chips use the reference order instead.
const trendSeries = [
  { key: "activeUsers", label: "Users", color: "#1c5fa8", chip: "bg-[#d9e8fa] text-[#1d5fa7]" },
  { key: "panics", label: "Panics", color: "#b8741a", chip: "bg-[#f6dfa6] text-[#7a5200]" },
  { key: "alerts", label: "Alerts", color: "#e24c4b", chip: "bg-[#f9d8da] text-[#a3262c]" },
] as const;
const trendChips = [trendSeries[0], trendSeries[2], trendSeries[1]];

function deltaText(current: number | null, previous: number | null, format: (value: number) => string, unit: "points" | "time") {
  if (current == null || previous == null) return null;
  const change = Math.round((current - previous) * 10) / 10;
  if (change === 0) return { text: "No change vs last week", tone: undefined };
  if (unit === "points") return { text: `${change > 0 ? "+" : ""}${change}% vs last week`, tone: change > 0 ? "bad" as const : "good" as const };
  return { text: `${change > 0 ? "Up" : "Down"} from ${format(previous)}`, tone: change > 0 ? "bad" as const : "good" as const };
}

function Snapshot({ d }: { d: ExecutiveDashboard }) {
  const s = d.snapshot;
  return <section><SectionLabel>Platform snapshot</SectionLabel><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Total users" value={number(s.totalUsers)} detail={s.newThisWeek ? `+${number(s.newThisWeek)} this week` : "No new users this week"} detailTone={s.newThisWeek ? "good" : undefined} title={`New users this week (${d.periods.week.label})`} />
    <StatCard label="Active today" value={number(s.activeToday)} detail={`${number(s.activeThisMonth)} this month`} title={`Distinct users active in the app today and in ${d.periods.month.label}`} />
    <StatCard label="Verified users" value={number(s.verifiedUsers)} detail={`${percent(s.verifiedPercent)} of registered`} title="Users whose KYC verification completed" />
    <StatCard label="Bank-connected" value={number(s.bankConnected)} detail={`${percent(s.bankConnectedPercent)} of registered`} title="Users with at least one active bank account linked in the app" />
  </div></section>;
}

function Security({ d }: { d: ExecutiveDashboard }) {
  const { incidents } = d.status, { fraudAlerts, falsePositive, response } = d.security;
  const breakdown = [incidents.criticalSos && `${number(incidents.criticalSos)} Critical SOS`, incidents.elevatedGuardianPanic && `${number(incidents.elevatedGuardianPanic)} Elevated Guardian Panic`].filter(Boolean).join(" · ");
  const fpDelta = deltaText(falsePositive.rate, falsePositive.previousRate, value => `${value}%`, "points");
  const responseDelta = deltaText(response.averageMs, response.previousAverageMs, duration, "time");
  const weeks = `this week (${d.periods.week.label}) compared with last week (${d.periods.lastWeek.label})`;
  return <section><SectionLabel>Security &amp; incidents</SectionLabel><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Active high-risk events" value={number(incidents.active)} detail={breakdown || "No active incidents"} tone={incidents.active ? "danger" : undefined} title="Unresolved incidents: Critical SOS activations and Elevated Guardian Panic requests, each counted once" />
    <StatCard label="Fraud alerts today" value={number(fraudAlerts.today)} detail={`${number(fraudAlerts.week)} this week · ${number(fraudAlerts.month)} this month`} tone={fraudAlerts.today ? "warning" : undefined} title={`Security alerts other than SOS and guardian panics. Week: ${d.periods.week.label}; month: ${d.periods.month.label}`} />
    <StatCard label="False-positive rate" value={percent(falsePositive.rate)} detail={fpDelta?.text || (falsePositive.reviewed ? `${number(falsePositive.reviewed)} reviewed this week` : "No reviewed alerts this week")} detailTone={fpDelta?.tone} title={`Share of reviewed alerts marked false positive, ${weeks}`} />
    <StatCard label="Avg response time" value={duration(response.averageMs)} detail={responseDelta?.text || (response.samples ? `Across ${number(response.samples)} alerts this week` : "No alerts actioned this week")} detailTone={responseDelta?.tone} title={`Average time from an alert to the first operator action, ${weeks}`} />
  </div></section>;
}

function PanicEvents({ d, canAlerts }: { d: ExecutiveDashboard; canAlerts: boolean }) {
  const p = d.panics, guardian = p.guardianAlertsToday, total = p.open + p.resolvedToday;
  const push = guardian.push.trackedSince
    ? `Push accepted ${number(guardian.push.accepted)} · failed ${number(guardian.push.failed)} · no device ${number(guardian.push.noDevice)}`
    : "Push results are recorded from now on";
  return <Panel icon={PanicIcon} title="Panic events" action={canAlerts ? { href: "/alerts?group=panic", label: "View all" } : null}>
    <div className="grid grid-cols-2 gap-3">
      <MiniStat label="Critical SOS" value={number(p.criticalSosToday)} detail="today" valueClass="text-[#d93636]" />
      <MiniStat label="Guardian Panic" value={number(p.guardianPanicsToday)} detail="today" valueClass="text-[#b8741a]" />
    </div>
    <div className="mt-3 rounded-xl border border-[#e4e2dc] p-3.5" title="Emergency notifications sent to guardians today. FCM 'accepted' means FCM took the message, not that the device displayed it.">
      <div className="flex items-baseline justify-between gap-2"><p className={cn("text-[14px]", muted)}>Guardian alerts sent today</p><p className="text-[22px] font-semibold tabular-nums">{number(guardian.total)}</p></div>
      <p className={cn("text-[13px]", muted)}>{number(guardian.fromSos)} from SOS · {number(guardian.fromGuardianPanic)} from Guardian Panic</p>
      <p className={cn("text-[13px]", muted)}>{push}</p>
    </div>
    <div className="mt-5 space-y-4">
      <MeterRow label="Open" value={number(p.open)} share={total ? p.open / total * 100 : 0} color="#e5484d" />
      <MeterRow label="Resolved today" value={number(p.resolvedToday)} share={total ? p.resolvedToday / total * 100 : 0} color="#2f7d1f" />
    </div>
  </Panel>;
}

function IncidentFeed({ d, canAlerts }: { d: ExecutiveDashboard; canAlerts: boolean }) {
  return <Panel icon={ScanEye} title="Live incident feed" action={canAlerts ? { href: "/alerts?group=panic&status=unresolved", label: "All incidents" } : null}>
    {d.feed == null ? <Note>Your role can&apos;t view incident details.</Note> : !d.feed.length ? <Note>No incidents recorded.</Note> :
      <div className="space-y-3">{d.feed.map(item => {
        const style = classificationStyle[item.type] || classificationStyle.guardian_alert;
        const subject = [item.userId && `User #${item.userId}`, item.bankName && `${item.bankName} account`].filter(Boolean).join(" · ");
        const details = [timeAgo(item.createdAt), item.locationShared && "Location shared", item.lockedAccounts ? `${item.lockedAccounts} account${item.lockedAccounts === 1 ? "" : "s"} locked` : null].filter(Boolean).join(" · ");
        return <div key={item.id} className="flex items-start gap-3 rounded-xl border border-[#e4e2dc] p-3.5">
          <span className={cn("mt-2 size-2 shrink-0 rounded-full", style.dot)} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-snug"><b>{style.label}:</b> {item.title}{subject && <> — {subject}</>}</p>
            <p className={cn("mt-1 text-[14px]", muted)}>{details}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium capitalize", alertStatusStyle[item.status] || alertStatusStyle.open)}>{item.status}</span>
        </div>;
      })}</div>}
  </Panel>;
}

function PlatformUptime({ d, canHealth }: { d: ExecutiveDashboard; canHealth: boolean }) {
  return <Panel icon={Activity} title="Platform uptime" action={canHealth ? { href: "/health", label: "History" } : null}>
    <div className="divide-y divide-[#ecebe6]">{d.services.map(service => {
      const failing = service.state === "monitored" && service.healthyNow === false;
      const title = [service.method || service.detail, service.samples != null && `${number(service.samples)} checks in ${d.periods.month.label}`,
        service.state === "collecting" && service.expectedMinutes != null && `${number(service.minutes || 0)} of ${number(service.expectedMinutes)} minutes observed so far`,
        service.lastError && `Last error: ${service.lastError}`, service.traffic && `Real sends this month: ${number(service.traffic.accepted)} accepted, ${number(service.traffic.failed)} failed`].filter(Boolean).join("\n");
      return <div key={service.service} className="flex items-center justify-between gap-3 py-2.5 text-[16px]" title={title}>
        <span>{service.label}</span>
        {service.percent != null
          ? <span className={cn("font-medium tabular-nums", failing ? "text-[#b42318]" : uptimeTone(service.percent))}>{failing && "Failing · "}{service.percent}%</span>
          : <span className={cn("text-sm", service.state === "not_configured" ? "text-[#a15c00]" : muted)}>{serviceStateLabel[service.state]}</span>}
      </div>;
    })}</div>
  </Panel>;
}

function VerifierUsage({ d, canVerify }: { d: ExecutiveDashboard; canVerify: boolean }) {
  const v = d.verifier;
  return <Panel icon={Search} title="Verifier tool usage" action={canVerify ? { href: "/verification", label: "Manage DB" } : null}>
    <div className="grid grid-cols-2 gap-3">
      <MiniStat label="Numbers searched" value={number(v.numbers)} detail={`${number(v.byType.phone)} phone · ${number(v.byType.account)} account`} />
      <MiniStat label="Emails searched" value={number(v.byType.email)} detail="this month" />
      <MiniStat label="Websites searched" value={number(v.byType.website)} detail="this month" />
      <MiniStat label="Flagged results" value={number(v.byOutcome.fraudulent)} detail={v.flagRate == null ? "No searches yet" : `${v.flagRate}% flag rate`} valueClass="text-[#b42318]" />
    </div>
    <p className={cn("mt-4 text-[14px]", muted)} title={`All verifier searches in ${d.periods.month.label}, every supported type`}>{number(v.total)} searches this month across all types</p>
    <div className="mt-3 space-y-4">
      <MeterRow label="Verified" value={percent(v.share.verified)} share={v.share.verified} color="#3d7a22" />
      <MeterRow label="Flagged" value={percent(v.share.fraudulent)} share={v.share.fraudulent} color="#e5484d" />
      <MeterRow label="Unknown" value={percent(v.share.not_found)} share={v.share.not_found} color="#c7dcf5" />
    </div>
  </Panel>;
}

function LearningTool({ d, canLearning }: { d: ExecutiveDashboard; canLearning: boolean }) {
  const l = d.learning;
  const rows: { label: string; value: string; className?: string }[] = [
    { label: "Modules completed", value: number(l.completed), className: "text-[#1f7a1f]" },
    { label: "Modules not completed", value: number(l.notCompleted), className: "text-[#b42318]" },
    { label: "Most popular module", value: l.mostPopular?.title || "—" },
    { label: "Avg completion time", value: duration(l.averageDurationMs) },
    { label: "Users doing extra questions", value: l.extraQuestionPercent == null ? number(l.extraQuestionUsers) : `${number(l.extraQuestionUsers)} (${l.extraQuestionPercent}%)` },
    { label: "Completion rate", value: percent(l.completionRate), className: "text-[#1f7a1f]" },
  ];
  return <Panel icon={GraduationCap} title="Learning tool" action={canLearning ? { href: "/learning", label: "View content" } : null}>
    <table className="w-full text-[16px]">
      <thead><tr className={cn("border-b border-[#dddbd4] text-left", muted)}><th className="px-3 pb-2.5 font-normal">Metric</th><th className="px-3 pb-2.5 text-right font-normal">Value</th></tr></thead>
      <tbody className="divide-y divide-[#ecebe6]">{rows.map(row => <tr key={row.label}><td className="px-3 py-2.5">{row.label}</td><td className={cn("px-3 py-2.5 text-right tabular-nums", row.className)}>{row.value}</td></tr>)}</tbody>
    </table>
    {!l.started && <p className={cn("mt-3 text-sm", muted)}>No learning modules have been started yet.</p>}
  </Panel>;
}

function TrendOverview({ d }: { d: ExecutiveDashboard }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const days = d.trend.map(row => ({ ...row, day: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(new Date(row.date + "T00:00:00Z")) }));
  const visible = trendSeries.filter(series => !hidden.includes(series.key));
  const empty = days.every(row => visible.every(series => !row[series.key]));
  return <section className={cn(card, "p-5 sm:p-6")}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold"><ChartLine size={20} strokeWidth={1.75} />Trend overview — last 7 days</h2>
      <div className="flex flex-wrap items-center gap-2">
        {trendChips.map(series => <button key={series.key} type="button" aria-pressed={!hidden.includes(series.key)} onClick={() => setHidden(keys => keys.includes(series.key) ? keys.filter(key => key !== series.key) : [...keys, series.key])}
          className={cn("rounded-full px-3.5 py-1 text-[15px] transition", series.chip, hidden.includes(series.key) && "opacity-40")}>{series.label}</button>)}
        <Link href="/analytics" className="ml-2 text-[16px] text-[#1d5fa7] hover:underline">Full analytics</Link>
      </div>
    </div>
    <div className="relative h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} barCategoryGap={6} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="day" orientation="top" axisLine={false} tickLine={false} tick={{ fontSize: 15, fill: "#6f6f68" }} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,.04)" }} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
          {visible.map(series => <Bar key={series.key} dataKey={series.key} name={series.label} stackId="day" fill={series.color} stroke="#fff" strokeWidth={2} />)}
        </BarChart>
      </ResponsiveContainer>
      {empty && <p className={cn("absolute inset-x-0 top-1/2 text-center text-sm", muted)}>No activity in the last 7 days.</p>}
    </div>
  </section>;
}

function KycQueue({ d, canUsers }: { d: ExecutiveDashboard; canUsers: boolean }) {
  const k = d.kyc;
  return <Panel icon={IdCard} title="KYC queue" action={canUsers ? { href: "/users?kyc=pending", label: "Review all" } : null}>
    <div className="grid grid-cols-3 gap-3 text-center">
      {[{ label: "Pending", value: k.pending, className: "text-[#7a4b00]" }, { label: "Verified", value: k.verified, className: "text-[#1f6b1f]" }, { label: "Rejected", value: k.rejected, className: "text-[#9b2226]" }].map(item =>
        <div key={item.label} className="rounded-xl border border-[#e4e2dc] px-2 py-4"><p className={cn("text-[30px] font-semibold leading-tight tabular-nums", item.className)}>{number(item.value)}</p><p className={cn("text-[15px]", muted)}>{item.label}</p></div>)}
    </div>
    {k.recent == null ? <Note>Your role can&apos;t view user details.</Note> : !k.recent.length ? <Note>No KYC submissions yet.</Note> :
      <table className="mt-5 w-full text-[15px]">
        <thead><tr className={cn("border-b border-[#dddbd4] text-left", muted)}><th className="pb-2.5 font-normal">User</th><th className="pb-2.5 font-normal">Submitted</th><th className="pb-2.5 font-normal">Status</th></tr></thead>
        <tbody className="divide-y divide-[#ecebe6]">{k.recent.map(user => <tr key={user.id}>
          <td className="py-2.5 pr-3"><span className="block max-w-[180px] truncate">{user.name || "Unnamed user"}</span>{user.userId && <span className={cn("text-[13px]", muted)}>#{user.userId}</span>}</td>
          <td className={cn("py-2.5 pr-3", !user.submittedAt && muted)} title={user.submittedAt ? undefined : "Submitted before submission times were recorded"}>{user.submittedAt ? dateTime(user.submittedAt) : "Not recorded"}</td>
          <td className="py-2.5"><span className={cn("rounded-full px-2.5 py-0.5 text-[13px] font-medium", kycStyle[user.status]?.className)}>{kycStyle[user.status]?.label || user.status}</span></td>
        </tr>)}</tbody>
      </table>}
  </Panel>;
}

function UsersByBank({ d, canAccounts }: { d: ExecutiveDashboard; canAccounts: boolean }) {
  return <Panel icon={Landmark} title="Users by bank" action={canAccounts ? { href: "/accounts", label: "Full breakdown" } : null}>
    {!d.banks.rows.length ? <Note>No bank-connected users yet.</Note> :
      <div className="space-y-4">{d.banks.rows.map(row => <div key={row.bank} title={`${number(row.users)} of ${number(d.banks.connectedUsers)} bank-connected users`}>
        <div className="flex items-center justify-between text-[16px]"><span className="truncate pr-3">{row.bank}</span><span className="tabular-nums">{percent(row.percent)}</span></div>
        <div className="mt-1.5 h-1.5 rounded-full bg-[#f0efea]"><div className="h-full rounded-full bg-[#c7dcf5]" style={{ width: `${row.percent ?? 0}%` }} /></div>
      </div>)}</div>}
  </Panel>;
}

function uptime(seconds: number) {
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600);
  return days ? `${days}d ${hours}h` : `${hours}h ${Math.floor(seconds % 3600 / 60)}m`;
}
const share = (part: number, total: number) => total ? Math.round(part / total * 1000) / 10 : null;

function DetailRows({ rows }: { rows: { label: string; value: string; title?: string; muted?: boolean }[] }) {
  return <div className="mt-4 divide-y divide-[#ecebe6] text-[15px]">{rows.map(row => <div key={row.label} className="flex items-center justify-between gap-3 py-2" title={row.title}>
    <span>{row.label}</span><span className={cn("text-right tabular-nums", row.muted && muted)}>{row.value}</span>
  </div>)}</div>;
}

// Measurements of the machine running the API. Host memory is the whole server; process memory is the API alone.
function BackendServer({ infra }: { infra: Infrastructure }) {
  const { server } = infra, latest = server.latest;
  if (!latest) return <Panel icon={Server} title="Backend server"><Note>No server measurements yet; the first sample is taken within a minute of the API starting.</Note></Panel>;
  const used = latest.host.memoryTotal - latest.host.memoryFree, memoryPercent = share(used, latest.host.memoryTotal);
  const diskUsed = latest.disk ? latest.disk.total - latest.disk.free : null;
  const gpu = server.gpu.status === "available" && latest.gpus?.length
    ? latest.gpus.map(item => `${item.name}: ${item.utilizationPercent}% · ${bytes(item.memoryUsed)} of ${bytes(item.memoryTotal)}`).join("; ")
    : server.gpu.status === "unknown" ? "Checking" : "Not available on this host";
  return <Panel icon={Server} title="Backend server">
    <div className="grid grid-cols-2 gap-3">
      <MiniStat label="CPU (whole host)" value={latest.host.cpuPercent == null ? "—" : `${latest.host.cpuPercent}%`} detail={latest.host.cpuPercent == null ? "Measuring…" : `${latest.host.cores} cores${latest.host.loadAverage != null ? ` · load ${latest.host.loadAverage}` : ""}`} />
      <MiniStat label="Memory (whole host)" value={percent(memoryPercent)} detail={`${bytes(used)} of ${bytes(latest.host.memoryTotal)} used`} />
    </div>
    {server.series.length > 1
      ? <div className="mt-4 h-28" title="15-minute averages over the last 24 hours"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={server.series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="at" hide /><YAxis domain={[0, 100]} hide />
            <Tooltip labelFormatter={value => dateTime(String(value))} formatter={(value, name) => [`${value}%`, name]} />
            <Line type="monotone" dataKey="cpuPercent" name="CPU" stroke="#1c5fa8" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="memoryPercent" name="Memory" stroke="#b8741a" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer></div>
      : <p className={cn("mt-4 text-[14px]", muted)}>The 24-hour trend appears once there are measurements across at least two 15-minute intervals.</p>}
    <DetailRows rows={[
      { label: "API process memory", value: bytes(latest.process.rss), title: "Resident memory of the Node.js API process only" },
      { label: "API process CPU", value: latest.process.cpuPercent == null ? "—" : `${latest.process.cpuPercent}%`, title: "Share of the whole host's CPU capacity used by the API process" },
      ...(latest.container ? [{ label: "Container memory", value: `${bytes(latest.container.memoryUsage)} of ${bytes(latest.container.memoryLimit)}` }] : []),
      { label: "Disk", value: latest.disk && diskUsed != null ? `${bytes(diskUsed)} of ${bytes(latest.disk.total)} (${percent(share(diskUsed, latest.disk.total))})` : "Not available" },
      { label: "GPU", value: gpu, muted: server.gpu.status !== "available" },
      { label: "Uptime", value: `Host ${uptime(latest.host.uptimeSeconds)} · API ${uptime(latest.process.uptimeSeconds)}` },
    ]} />
    <p className={cn("mt-3 text-[13px]", muted)}>{server.environment} · {server.platform}/{server.arch} · Node {server.nodeVersion.replace(/^v/, "")} · measured {dateTime(latest.checkedAt)}{server.trackingSince ? ` · history from ${dateTime(server.trackingSince)}` : ""}</p>
  </Panel>;
}

// Stored data, disk storage and server memory are different measurements and are shown separately.
function DatabasePanel({ infra }: { infra: Infrastructure }) {
  const db = infra.database;
  if (!db) return <Panel icon={Database} title="Database"><Note>{infra.databaseError || "Database statistics are unavailable."}</Note></Panel>;
  return <Panel icon={Database} title={db.provider}>
    <div className="grid grid-cols-2 gap-3">
      <MiniStat label="Data stored" value={bytes(db.dataSize)} detail="uncompressed documents" />
      <MiniStat label="Storage used" value={bytes(db.storageSize)} detail="on disk, compressed" />
      <MiniStat label="Index size" value={bytes(db.indexSize)} detail="all indexes" />
      <MiniStat label="Documents" value={number(db.objects)} detail={`${number(db.collections)} collections`} />
    </div>
    <DetailRows rows={[
      { label: "Server memory", value: db.memory ? bytes(db.memory.residentBytes) : "Not available", muted: !db.memory, title: db.memoryUnavailableReason || "Resident memory of the database server process" },
      { label: "Server CPU", value: "Not available", muted: true, title: db.cpuUnavailableReason },
      { label: "Cluster disk capacity", value: db.filesystem ? `${bytes(db.filesystem.used)} of ${bytes(db.filesystem.total)}` : "Not reported by this tier", muted: !db.filesystem },
      { label: "Connections", value: db.connections ? `${number(db.connections.current)} open${db.connections.available != null ? ` · ${number(db.connections.available)} available` : ""}` : "Not available", muted: !db.connections },
      { label: "Replica set", value: db.replicaSet ? `${db.replicaSet.members ?? "?"} members · primary ${db.replicaSet.writablePrimary ? "writable" : "not writable"}` : "Standalone" },
    ]} />
    <p className={cn("mt-3 text-[13px]", muted)}>{db.version ? `Version ${db.version} · ` : ""}measured {dateTime(db.checkedAt)} · refreshed every 5 minutes</p>
  </Panel>;
}

function InfrastructureSection({ enabled }: { enabled: boolean }) {
  const query = useQuery({ queryKey: ["infrastructure"], queryFn: getInfrastructure, enabled, refetchInterval: 60_000 });
  if (!enabled) return null;
  return <section><SectionLabel>Infrastructure</SectionLabel>
    {query.isLoading ? <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      : !query.data ? <div role="alert" className="rounded-2xl border border-[#e9a7ac] bg-[#f9d8da] p-5 text-sm text-[#8f1d24]">Infrastructure measurements could not load: {apiError(query.error)}</div>
      : <div className="grid gap-4 lg:grid-cols-2"><BackendServer infra={query.data} /><DatabasePanel infra={query.data} /></div>}
  </section>;
}

export default function DashboardPage() {
  const access = useAdminAccess();
  const query = useQuery({ queryKey: ["executive-dashboard"], queryFn: getExecutiveDashboard, refetchInterval: 60_000 });
  const d = query.data;

  if (query.isLoading) return <div className="space-y-6">{[4, 4, 3, 2].map((count, index) =>
    <div key={index} className={cn("grid gap-4", count === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : count === 3 ? "xl:grid-cols-3" : "lg:grid-cols-2")}>{Array.from({ length: count }, (_, item) => <Skeleton key={item} className={cn("rounded-2xl", count === 4 ? "h-32" : "h-72")} />)}</div>)}</div>;
  if (!d) return <div role="alert" className="rounded-2xl border border-[#e9a7ac] bg-[#f9d8da] p-5 text-sm text-[#8f1d24]">Dashboard data could not load: {apiError(query.error)} <button onClick={() => void query.refetch()} className="font-semibold underline">Retry</button></div>;

  return <div className="space-y-6">
    {query.isError && <div role="alert" className="rounded-2xl border border-[#e7b64e] bg-[#fbecc5] p-4 text-sm text-[#7a4b00]">Showing data from {dateTime(d.generatedAt)}; the latest refresh failed: {apiError(query.error)}</div>}
    <Snapshot d={d} />
    <Security d={d} />
    <div className="grid gap-4 xl:grid-cols-3">
      <PanicEvents d={d} canAlerts={access.can("alerts:read")} />
      <IncidentFeed d={d} canAlerts={access.can("alerts:read")} />
      <PlatformUptime d={d} canHealth={access.can("health:read")} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <VerifierUsage d={d} canVerify={access.can("verification:read")} />
      <LearningTool d={d} canLearning={access.can("learning:read")} />
    </div>
    <TrendOverview d={d} />
    <div className="grid gap-4 lg:grid-cols-2">
      <KycQueue d={d} canUsers={access.can("users:read")} />
      <UsersByBank d={d} canAccounts={access.can("accounts:read")} />
    </div>
    <InfrastructureSection enabled={access.can("health:read")} />
    <p className={cn("pb-2 text-xs leading-5", muted)}>Updated {dateTime(d.generatedAt)} · refreshes every minute. Times are {d.timezone}; &ldquo;this week&rdquo; is {d.periods.week.label} (Sunday to Saturday) and &ldquo;this month&rdquo; is {d.periods.month.label}. Bank connections are accounts users entered in the app, not live bank links.</p>
  </div>;
}
