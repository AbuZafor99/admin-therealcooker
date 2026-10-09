"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { PageTitle } from "@/components/page-title";
import { getHealth } from "@/lib/operations-api";
import { apiError } from "@/lib/utils";
export default function HealthPage() {
  const [days,setDays]=useState(30);
  const query=useQuery({queryKey:["health",days],queryFn:()=>getHealth(days),refetchInterval:60000});
  const dates=[...new Set(query.data?.trends.map(row=>row.date))];
  const rows=dates.map(date=>Object.fromEntries([["date",date],...(query.data?.trends.filter(row=>row.date===date).map(row=>[row.service,row.uptime])||[])]));
  return <><PageTitle action={<select aria-label="Reporting period" className="rounded border bg-white p-2" value={days} onChange={e=>setDays(Number(e.target.value))}>{[7,30,90].map(day=><option key={day} value={day}>Last {day} days</option>)}</select>}>Platform and integration health</PageTitle>{query.isError&&<p role="alert" className="text-red-700">{apiError(query.error)}</p>}{query.isLoading&&<p>Loading health samples...</p>}{query.data&&<><p className="mb-5 text-sm text-slate-500">{query.data.measurement}</p><div className="grid gap-4 sm:grid-cols-3">{query.data.services.map(service=><div key={service.service} className="rounded-xl border bg-white p-5"><h2 className="font-bold">{service.service}</h2><p className="mt-3 text-3xl font-bold">{service.uptime}%</p><p className={`mt-2 text-sm ${service.available?"text-green-700":"text-red-700"}`}>{new Date(query.data!.generatedAt).getTime()-new Date(service.checkedAt).getTime()>180000?"Stale sample":service.available?"Available at last check":"Unavailable at last check"}</p><p className="mt-2 text-xs text-slate-500">{service.samples} samples · {service.latencyMs} ms · {new Date(service.checkedAt).toLocaleString()}</p></div>)}</div>{!query.data.services.length&&<p>No monitoring samples yet.</p>}<div className="mt-5 h-80 rounded-xl border bg-white p-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid strokeDasharray="4 4"/><XAxis dataKey="date"/><YAxis domain={[0,100]}/><Tooltip/><Legend/>{query.data.services.map((service,i)=><Line key={service.service} dataKey={service.service} stroke={["#0e7490","#a48734","#16a34a","#dc2626"][i%4]} connectNulls={false}/>)}</LineChart></ResponsiveContainer></div></>}</>;
}
