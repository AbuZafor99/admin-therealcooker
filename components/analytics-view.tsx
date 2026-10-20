"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ChartColumn, ChevronLeft, ChevronRight, Database, FileDown, GraduationCap, Search, Server, ShieldAlert, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { bytes, card, dateTime, duration, MeterRow, MiniStat, muted, Note, number, Panel, percent, SectionLabel, StatCard, uptimeTone } from "@/components/dashboard-ui";
import { downloadAnalyticsPdf, getAnalyticsReport, type AnalyticsReport, type ReportPeriod, type SearchType } from "@/lib/operations";
import { apiError, cn } from "@/lib/utils";

const nextDay = (iso: string) => new Date(Date.parse(iso + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
const versus = (current: number, previous: number) => `Previous: ${number(previous)}${current !== previous ? ` (${current > previous ? "+" : ""}${number(current - previous)})` : ""}`;
const searchLabels: Record<SearchType, string> = { phone: "Phone number", account: "Bank account number", email: "Email address", website: "Website" };
const stateLabel: Record<string, string> = { monitored: "Monitored", collecting: "Collecting data", not_configured: "Not configured" };
const dailySeries = [
  { key: "activeUsers", label: "Active users", color: "#1c5fa8" },
  { key: "newUsers", label: "New users", color: "#5b9bd5" },
  { key: "incidents", label: "Incidents", color: "#e24c4b" },
  { key: "fraudAlerts", label: "Security alerts", color: "#d98a00" },
  { key: "searches", label: "Searches", color: "#3d7a22" },
] as const;

function Table({ head, rows, align }: { head: string[]; rows: (string | number)[][]; align?: ("left" | "right")[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-[15px]">
    <thead><tr className={cn("border-b border-[#dddbd4] text-left", muted)}>{head.map((label, index) => <th key={label} className={cn("px-3 pb-2.5 font-normal", align?.[index] === "right" && "text-right")}>{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-[#ecebe6]">{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index} className={cn("px-3 py-2.5", align?.[index] === "right" && "text-right tabular-nums")}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Report({ r }: { r: AnalyticsReport }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const prev = r.previous.label, sofar = r.period.isCurrent ? " so far" : "";
  const searchMax = Math.max(1, ...Object.values(r.searches.period.byType));
  const fraudMax = Math.max(1, ...r.alerts.fraud.byType.map(row => row.count));
  const s = r.server.period;
  return <div className="space-y-6">
    <section><SectionLabel>Incidents</SectionLabel><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active high-risk events (now)" value={number(r.incidents.activeNow.active)} detail={`${number(r.incidents.activeNow.criticalSos)} Critical SOS · ${number(r.incidents.activeNow.elevatedGuardianPanic)} Elevated Guardian Panic`} tone={r.incidents.activeNow.active ? "danger" : undefined} title="Unresolved incidents right now, regardless of the selected period" />
      <StatCard label={`Critical SOS${sofar}`} value={number(r.incidents.period.criticalSos)} detail={versus(r.incidents.period.criticalSos, r.incidents.previous.criticalSos)} title={`SOS activations started in this period, compared with ${prev}`} />
      <StatCard label={`Guardian Panics${sofar}`} value={number(r.incidents.period.elevatedGuardianPanic)} detail={versus(r.incidents.period.elevatedGuardianPanic, r.incidents.previous.elevatedGuardianPanic)} title={`"Alert Guardians" requests started in this period, compared with ${prev}`} />
      <StatCard label={`Incidents resolved${sofar}`} value={number(r.incidents.period.resolved)} detail={`Avg time to resolve ${duration(r.incidents.period.averageResolutionMs)}`} title={`First operator action on average after ${duration(r.incidents.period.averageFirstActionMs)}`} />
    </div></section>

    <div className="grid gap-4 lg:grid-cols-2">
      <Panel icon={ShieldAlert} title="Guardian alerts">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Notifications sent" value={number(r.guardianAlerts.period.total)} detail={versus(r.guardianAlerts.period.total, r.guardianAlerts.previous.total)} />
          <MiniStat label="Push accepted by FCM" value={number(r.guardianAlerts.period.push.accepted)} detail={`${number(r.guardianAlerts.period.push.failed)} rejected · ${number(r.guardianAlerts.period.push.noDevice)} no device`} />
        </div>
        <div className="mt-5 space-y-4">
          <MeterRow label="From SOS activations" value={number(r.guardianAlerts.period.fromSos)} share={r.guardianAlerts.period.total ? r.guardianAlerts.period.fromSos / r.guardianAlerts.period.total * 100 : 0} color="#e5484d" />
          <MeterRow label="From Guardian Panic requests" value={number(r.guardianAlerts.period.fromGuardianPanic)} share={r.guardianAlerts.period.total ? r.guardianAlerts.period.fromGuardianPanic / r.guardianAlerts.period.total * 100 : 0} color="#d98a00" />
        </div>
        <p className={cn("mt-4 text-[13px]", muted)}>{r.guardianAlerts.period.push.trackedSince ? `Push results recorded from ${dateTime(r.guardianAlerts.period.push.trackedSince)}. "Accepted" means FCM took the message, not that the device showed it.` : "Push results have not been recorded yet."}</p>
      </Panel>
      <Panel icon={ShieldAlert} title="Security alerts">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label={`Raised${sofar}`} value={number(r.alerts.fraud.period)} detail={versus(r.alerts.fraud.period, r.alerts.fraud.previous)} />
          <MiniStat label="False-positive rate" value={percent(r.alerts.quality.period.rate)} detail={`${number(r.alerts.quality.period.reviewed)} reviewed · previous ${percent(r.alerts.quality.previous.rate)}`} />
        </div>
        {r.alerts.fraud.byType.length ? <div className="mt-5 space-y-4">{r.alerts.fraud.byType.map(row => <MeterRow key={row.type} label={row.type.replaceAll("_", " ")} value={number(row.count)} share={row.count / fraudMax * 100} color="#d98a00" />)}</div> : <Note>No security alerts in this period.</Note>}
        <p className={cn("mt-4 text-[13px]", muted)}>Alerts other than SOS and guardian panics. Average time to first action: {duration(r.alerts.quality.period.averageResponseMs)}.</p>
      </Panel>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Panel icon={Search} title="Verifier searches">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label={`All searches${sofar}`} value={number(r.searches.period.total)} detail={versus(r.searches.period.total, r.searches.previous.total)} />
          <MiniStat label="Flagged as fraudulent" value={number(r.searches.period.byOutcome.fraudulent)} detail={r.searches.period.flagRate == null ? "No searches" : `${r.searches.period.flagRate}% flag rate`} valueClass="text-[#b42318]" />
        </div>
        <div className="mt-5 space-y-4">{(Object.keys(searchLabels) as SearchType[]).map(type => <MeterRow key={type} label={searchLabels[type]} value={number(r.searches.period.byType[type])} share={r.searches.period.byType[type] / searchMax * 100} color="#1c5fa8" />)}</div>
        <p className={cn("mt-4 text-[13px]", muted)}>Results: {number(r.searches.period.byOutcome.verified)} verified · {number(r.searches.period.byOutcome.fraudulent)} flagged · {number(r.searches.period.byOutcome.not_found)} no record. Searched values are never stored.</p>
      </Panel>
      <Panel icon={Users} title="Users and accounts">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Active users" value={number(r.users.period.active)} detail={versus(r.users.period.active, r.users.previous.active)} />
          <MiniStat label="New registrations" value={number(r.users.period.new)} detail={versus(r.users.period.new, r.users.previous.new)} />
          <MiniStat label="KYC submitted / completed" value={`${number(r.users.period.kycSubmitted)} / ${number(r.users.period.kycCompleted)}`} detail={`Previous: ${number(r.users.previous.kycSubmitted)} / ${number(r.users.previous.kycCompleted)}`} />
          <MiniStat label="Bank accounts / wallets linked" value={`${number(r.users.period.accountsLinked.bank)} / ${number(r.users.period.accountsLinked.wallet)}`} detail={`Previous: ${number(r.users.previous.accountsLinked.bank)} / ${number(r.users.previous.accountsLinked.wallet)}`} />
        </div>
        <div className="mt-4 flex items-center gap-2 text-[15px]"><GraduationCap size={18} strokeWidth={1.75} />Learning: {number(r.learning.opened)} opened · {number(r.learning.completed)} completed · {number(r.learning.notCompleted)} not completed · {percent(r.learning.completionRate)} completion{r.learning.mostPopular?.title ? ` · most popular: ${r.learning.mostPopular.title}` : ""}</div>
      </Panel>
    </div>

    <section className={cn(card, "p-5 sm:p-6")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[19px] font-semibold"><ChartColumn size={20} strokeWidth={1.75} />Daily activity</h2>
        <div className="flex flex-wrap gap-2">{dailySeries.map(series => <button key={series.key} type="button" aria-pressed={!hidden.includes(series.key)} onClick={() => setHidden(keys => keys.includes(series.key) ? keys.filter(key => key !== series.key) : [...keys, series.key])}
          className={cn("flex items-center gap-1.5 rounded-full border border-[#e4e2dc] px-3 py-1 text-[14px]", hidden.includes(series.key) && "opacity-40")}><span className="size-2.5 rounded-full" style={{ background: series.color }} />{series.label}</button>)}</div>
      </div>
      <div className="h-64"><ResponsiveContainer width="100%" height="100%">
        <BarChart data={r.daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="#ecebe6" />
          <XAxis dataKey="date" tickFormatter={(date: string) => date.slice(5)} tick={{ fontSize: 12, fill: "#6f6f68" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6f6f68" }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,.04)" }} /><Legend wrapperStyle={{ display: "none" }} />
          {dailySeries.filter(series => !hidden.includes(series.key)).map(series => <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} />)}
        </BarChart>
      </ResponsiveContainer></div>
      <details className="mt-4"><summary className="cursor-pointer text-[15px] text-[#1d5fa7]">Show daily table</summary>
        <div className="mt-3"><Table head={["Date", "Active users", "New users", "Incidents", "Security alerts", "Searches"]} align={["left", "right", "right", "right", "right", "right"]}
          rows={r.daily.map(day => [day.date, number(day.activeUsers), number(day.newUsers), number(day.incidents), number(day.fraudAlerts), number(day.searches)])} /></div>
      </details>
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <Panel icon={Activity} title="Platform services">
        <div className="divide-y divide-[#ecebe6]">{r.services.map(service => <div key={service.service} className="flex items-center justify-between gap-3 py-2.5 text-[15px]" title={[service.method || service.detail, service.lastError && `Last error: ${service.lastError}`].filter(Boolean).join("\n")}>
          <span>{service.label}</span>
          {service.percent != null ? <span className={cn("font-medium tabular-nums", uptimeTone(service.percent))}>{service.percent}%</span> : <span className={cn("text-sm", muted)}>{stateLabel[service.state]}</span>}
        </div>)}</div>
        <p className={cn("mt-3 text-[13px]", muted)}>Availability within the selected period. Hover a service to see how it is measured.</p>
      </Panel>
      <Panel icon={Server} title="Backend server">
        {s.samples ? <div className="divide-y divide-[#ecebe6] text-[15px]">{[
          ["Host CPU (avg / peak)", `${percent(s.averageCpuPercent ?? null)} / ${percent(s.peakCpuPercent ?? null)}`],
          ["Host memory used (avg / peak)", `${percent(s.averageMemoryPercent ?? null)} / ${percent(s.peakMemoryPercent ?? null)}`],
          ["API process memory (avg)", bytes(s.averageProcessRss)],
          ...(r.server.gpuStatus === "available" ? [["GPU", "Monitored"]] : []),
          ["Samples", `${number(s.samples)} (one per minute)`],
        ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-2.5"><span>{label}</span><span className="text-right tabular-nums">{value}</span></div>)}</div>
          : <Note>No server measurements were recorded in this period.</Note>}
        <p className={cn("mt-3 text-[13px]", muted)}>{r.server.environment} · {r.server.platform}/{r.server.arch} · {r.server.cores} cores{s.since ? ` · samples from ${dateTime(s.since)}` : ""}</p>
      </Panel>
      <Panel icon={Database} title={r.database?.provider || "Database"}>
        {r.database ? <div className="divide-y divide-[#ecebe6] text-[15px]">{[
          ["Data stored", bytes(r.database.dataSize)], ["Storage used (disk)", bytes(r.database.storageSize)], ["Index size", bytes(r.database.indexSize)],
          ["Documents", number(r.database.objects)], ...(r.database.memory ? [["Server memory", bytes(r.database.memory.residentBytes)]] : []),
        ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-2.5"><span>{label}</span><span className="text-right tabular-nums">{value}</span></div>)}</div>
          : <Note>Database statistics could not be read.</Note>}
        <p className={cn("mt-3 text-[13px]", muted)}>Current values at report time; database size is not tracked per period.</p>
      </Panel>
    </div>

    <section className={cn(card, "p-5 sm:p-6")}>
      <h2 className="mb-3 text-[17px] font-semibold">Notes and limitations</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-[#3b3b36]">{r.limitations.map(text => <li key={text}>{text}</li>)}</ul>
    </section>
  </div>;
}

export function AnalyticsView({ autoExport }: { autoExport: boolean }) {
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [date, setDate] = useState<string | undefined>();
  const query = useQuery({ queryKey: ["analytics", period, date ?? "current"], queryFn: () => getAnalyticsReport(period, date), refetchInterval: date ? false : 60_000, placeholderData: previous => previous });
  const exporter = useMutation({
    mutationFn: () => downloadAnalyticsPdf(period, date),
    onSuccess: name => toast.success(`Downloaded ${name}`),
    onError: error => toast.error(`Export failed: ${apiError(error)}`),
  });
  const exported = useRef(false);
  useEffect(() => {
    // The sidebar's Export link exports the current week once, then returns to the plain analytics URL.
    if (!autoExport || exported.current) return;
    exported.current = true;
    exporter.mutate();
    router.replace("/analytics");
  }, [autoExport, exporter, router]);
  const r = query.data;
  const choose = (value: ReportPeriod) => { setPeriod(value); setDate(undefined); };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-[#d8d6cf] bg-white p-1" role="group" aria-label="Reporting period">
          {(["week", "month"] as ReportPeriod[]).map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => choose(value)}
            className={cn("rounded-lg px-4 py-1.5 text-[15px]", period === value ? "bg-[#d9e8fa] font-medium text-[#1d5fa7]" : "text-[#3b3b36] hover:bg-[#f6f6f3]")}>{value === "week" ? "Week" : "Month"}</button>)}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous period" disabled={!r} onClick={() => r && setDate(r.previous.startDate)} className="rounded-lg p-2 hover:bg-white disabled:opacity-40"><ChevronLeft size={18} /></button>
          <div className="min-w-48 text-center">
            <p className="text-[17px] font-semibold">{r?.period.label ?? "…"}{r?.period.isCurrent && <span className={cn("ml-2 text-[13px] font-normal", muted)}>in progress</span>}</p>
            <p className={cn("text-[13px]", muted)}>{period === "week" ? "Sunday to Saturday" : "Calendar month"}{r ? ` · vs ${r.previous.label}` : ""}</p>
          </div>
          <button type="button" aria-label="Next period" disabled={!r || r.period.isCurrent} onClick={() => r && setDate(nextDay(r.period.lastDate))} className="rounded-lg p-2 hover:bg-white disabled:opacity-40"><ChevronRight size={18} /></button>
          {date && <button type="button" onClick={() => setDate(undefined)} className="ml-1 text-[14px] text-[#1d5fa7] hover:underline">Current {period}</button>}
        </div>
      </div>
      <button type="button" onClick={() => exporter.mutate()} disabled={exporter.isPending || !r} className="flex h-10 items-center gap-2 rounded-xl bg-[#1d5fa7] px-4 text-sm font-medium text-white hover:bg-[#174d88] disabled:opacity-60">
        <FileDown size={16} />{exporter.isPending ? "Preparing PDF…" : "Export PDF"}
      </button>
    </div>

    {query.isLoading ? <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</div><Skeleton className="h-72 rounded-2xl" /></div>
      : !r ? <div role="alert" className="rounded-2xl border border-[#e9a7ac] bg-[#f9d8da] p-5 text-sm text-[#8f1d24]">The report could not load: {apiError(query.error)} <button onClick={() => void query.refetch()} className="font-semibold underline">Retry</button></div>
      : <>
        {query.isError && <div role="alert" className="rounded-2xl border border-[#e7b64e] bg-[#fbecc5] p-4 text-sm text-[#7a4b00]">Showing the last loaded report; the latest refresh failed: {apiError(query.error)}</div>}
        <Report r={r} />
        <p className={cn("pb-2 text-xs leading-5", muted)}>Generated {dateTime(r.generatedAt)} · timezone {r.timezone} · {r.period.startDate} to {r.period.lastDate}{r.period.isCurrent ? ", data up to now" : ""}. The exported PDF contains these same figures.</p>
      </>}
  </div>;
}
