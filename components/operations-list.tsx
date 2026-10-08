"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { PageTitle } from "./page-title";
import { Pagination } from "./pagination";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { OperationDialog } from "./operation-dialog";
import { useAdminAccess } from "./admin-access";
import { getOperations, updateOperation, createCase, getOperators, OperationItem } from "@/lib/operations-api";
import { apiError, formatDate } from "@/lib/utils";

type Section = "alerts" | "cases" | "events" | "audit" | "accounts" | "staff";
const titles = { alerts: "Security and panic alerts", cases: "Support and security cases", events: "Operational events", audit: "Admin audit trail", accounts: "Linked account records", staff: "Administrator permissions" };
const selectStyle = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm";
function Select({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm">{label}<select className={`${selectStyle} ml-2`} value={value} onChange={e=>onChange(e.target.value)}><option value="">All</option>{values.map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select></label>;
}
export function OperationsList({ section, initialFilters }: { section: Section; initialFilters: Record<string,string> }) {
  const [filters,setFilters] = useState<Record<string,string>>(initialFilters);
  const [page,setPage] = useState(1); const [selected,setSelected] = useState<OperationItem|null>(null); const [creating,setCreating] = useState(false);
  const [form,setForm] = useState<Record<string,string>>({}); const [error,setError] = useState("");
  const access=useAdminAccess(); const qc=useQueryClient(); const writable=access.can(`${section}:write`);
  const query=useQuery({queryKey:["operations",section,page,filters],queryFn:()=>getOperations(section,{...filters,page,limit:10}),refetchInterval:30000});
  const operators=useQuery({queryKey:["case-operators"],queryFn:getOperators,enabled:section==="cases"&&writable});
  const save=useMutation({mutationFn:()=>creating?createCase(form):updateOperation(section,selected!._id,form),onSuccess:()=>{toast.success("Saved successfully");setSelected(null);setCreating(false);qc.invalidateQueries({queryKey:["operations"]});qc.invalidateQueries({queryKey:["operational-overview"]});qc.invalidateQueries({queryKey:["admin-identity"]});},onError:e=>setError(apiError(e))});
  const filter=(key:string,value:string)=>{setFilters(f=>({...f,[key]:value}));setPage(1);};
  const field=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));
  const open=(item:OperationItem)=>{setSelected(item);setCreating(false);setError("");setForm(section==="staff"?{adminRole:item.adminRole||"superadmin",reason:""}:section==="alerts"?{status:item.status||"open",severity:item.severity||"elevated",verdict:item.verdict||"unreviewed",reason:"",resolution:item.resolution||""}:{status:item.status||"open",severity:item.severity||"elevated",assignedTo:item.assignedTo?._id||"",note:"",resolution:item.resolution||""});};
  const summary=(item:OperationItem)=>section==="accounts"?`${item.bankName||item.accountType} · ${item.nickname||"Account"}`:section==="audit"?`${item.action} ${item.resource}`:section==="staff"?item.name||item.email:item.title||item.kind;
  return <><PageTitle action={<div className="flex gap-2"><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh</Button>{section==="cases"&&writable&&<Button onClick={()=>{setCreating(true);setSelected(null);setForm({title:"",note:"",severity:"elevated"});setError("");}}>New case</Button>}</div>}>{titles[section]}</PageTitle>
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      {["alerts","cases"].includes(section)&&<><Input className="max-w-64" aria-label="Search" placeholder="Search title" value={filters.search||""} onChange={e=>filter("search",e.target.value)}/><Select label="Status" values={section==="alerts"?["unresolved","open","acknowledged","resolved"]:["unresolved","open","in_progress","resolved"]} value={filters.status||""} onChange={v=>filter("status",v)}/><Select label="Severity" values={["elevated","high","critical"]} value={filters.severity||""} onChange={v=>filter("severity",v)}/></>}
      {section==="alerts"&&<><Select label="Type" values={["sos","guardian_alert","suspicious_limit","account_lock","manual"]} value={filters.type||""} onChange={v=>filter("type",v)}/><Select label="Verdict" values={["unreviewed","confirmed","false_positive"]} value={filters.verdict||""} onChange={v=>filter("verdict",v)}/></>}
      {section==="events"&&<><Select label="Event" values={["activity","verification_lookup","panic","panic_resolved","protective_action","learning_completed"]} value={filters.kind||""} onChange={v=>filter("kind",v)}/><Select label="Tool" values={["email","phone","website","account"]} value={filters.tool||""} onChange={v=>filter("tool",v)}/></>}
      {section==="accounts"&&<><Input aria-label="Bank" placeholder="Bank name" className="max-w-52" value={filters.bank||""} onChange={e=>filter("bank",e.target.value)}/><label className="text-sm"><input type="checkbox" checked={filters.locked==="true"} onChange={e=>filter("locked",e.target.checked?"true":"")}/> Locked only</label></>}
      {section!=="staff"&&["from","to"].map(key=><label key={key} className="text-sm capitalize">{key}<Input type="date" aria-label={key} value={(filters[key]||"").slice(0,10)} onChange={e=>filter(key,e.target.value)}/></label>)}
      <Button variant="ghost" onClick={()=>{setFilters({});setPage(1);}}>Clear filters</Button>
    </div>
    {section==="alerts"&&<p className="mb-4 text-sm text-slate-500">Resolving an admin alert closes the review item. An active SOS must be ended through the existing user/guardian safety flow. Guardian alerts and SOS are the implemented panic types.</p>}
    {section==="accounts"&&<p className="mb-4 text-sm text-slate-500">These are app account records. A locked record does not confirm a bank-side restriction.</p>}
    {section==="audit"&&<p className="mb-4 text-sm text-slate-500">Successful admin mutations are recorded without request bodies or credentials. Automated interventions appear under Operational events.</p>}
    {query.isError&&<p role="alert" className="mb-4 rounded bg-red-50 p-4 text-red-700">{apiError(query.error)}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{["Record","User / actor","Status / result","Date","Details"].map(label=><th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>
      {query.isLoading&&<tr><td colSpan={5} className="p-8">Loading records...</td></tr>}
      {query.data?.items.map(item=><tr key={item._id} className="border-b last:border-0"><td className="p-4"><p className="font-semibold">{summary(item)}</p><p className="mt-1 text-xs text-slate-500">{item.type||item.source||item.accountType||item.adminRole}</p></td><td className="p-4">{item.user&&access.can("users:read")?<Link className="text-[#9d8034] underline" href={`/users?user=${item.user._id}`}>{item.user.name||item.user.userId||"User"}</Link>:item.actor?.name||item.name||"—"}<p className="mt-1 text-xs text-slate-500">{item.assignedTo?.name&&`Assigned: ${item.assignedTo.name}`}</p></td><td className="p-4"><span className={item.severity==="critical"?"text-red-700 font-semibold":""}>{item.status||item.outcome||item.adminRole||(item.isLocked?"locked":"active")}</span><p className="mt-1 text-xs text-slate-500">{item.severity} {item.verdict}</p></td><td className="p-4">{formatDate(item.occurredAt||item.createdAt)}</td><td className="p-4"><Button size="sm" variant="outline" onClick={()=>open(item)}>View</Button></td></tr>)}
      {query.data&&!query.data.items.length&&<tr><td colSpan={5} className="p-10 text-center text-slate-500">No records match these filters.</td></tr>}
    </tbody></table></div>{query.data&&<Pagination {...query.data.pagination} onPage={setPage}/>}
    <OperationDialog title={creating?"Create case":selected?summary(selected)||"Record details":"Details"} open={Boolean(selected)||creating} onClose={()=>{if(!save.isPending){setSelected(null);setCreating(false);}}}>
      {selected&&<div className="mb-5 space-y-2 text-sm"><p>Record ID: {selected._id}</p>{selected.resolution&&<p><strong>Resolution:</strong> {selected.resolution}</p>}{selected.reason&&<p>Reason: {selected.reason}</p>}{selected.changes&&Object.entries(selected.changes).map(([key,value])=><p key={key}>{key}: {String(value)}</p>)}{selected.lockedReason&&<p>Lock reason: {selected.lockedReason}</p>}{selected.resolvedAt&&<p>Resolved: {new Date(selected.resolvedAt).toLocaleString()} {selected.resolvedBy?.name||selected.reviewedBy?.name}</p>}{selected.firstActionAt&&<p>First operator action: {new Date(selected.firstActionAt).toLocaleString()}</p>}{selected.notes?.map((note,i)=><div key={i} className="rounded bg-slate-50 p-3"><p className="whitespace-pre-wrap">{note.body}</p><small className="text-slate-500">{note.actor?.name||"Operator"} · {new Date(note.at).toLocaleString()}</small></div>)}</div>}
      {((writable&&["alerts","cases","staff"].includes(section))||creating)&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();setError("");save.mutate();}}>
        {creating&&<><label className="block text-sm">Title<Input required maxLength={200} value={form.title||""} onChange={e=>field("title",e.target.value)}/></label><label className="block text-sm">User ID (optional)<Input value={form.user||""} onChange={e=>field("user",e.target.value)}/></label><label className="block text-sm">Alert ID (optional)<Input value={form.alert||""} onChange={e=>field("alert",e.target.value)}/></label></>}
        {section==="staff"?<label className="block text-sm">Admin role<select className={`${selectStyle} ml-2`} value={form.adminRole} onChange={e=>field("adminRole",e.target.value)}>{["superadmin","operations","support","analyst"].map(role=><option key={role}>{role}</option>)}</select></label>:<>
          {!creating&&<label className="block text-sm">Status<select className={`${selectStyle} ml-2`} value={form.status} onChange={e=>field("status",e.target.value)}>{(section==="alerts"?["open","acknowledged","resolved"]:["open","in_progress","resolved"]).map(status=><option key={status} value={status}>{status}</option>)}</select></label>}
          <label className="block text-sm">Severity<select className={`${selectStyle} ml-2`} value={form.severity} onChange={e=>field("severity",e.target.value)}>{["elevated","high","critical"].map(level=><option key={level}>{level}</option>)}</select></label>
          {section==="alerts"&&<label className="block text-sm">Verdict<select className={`${selectStyle} ml-2`} value={form.verdict} onChange={e=>field("verdict",e.target.value)}>{["unreviewed","confirmed","false_positive"].map(verdict=><option key={verdict}>{verdict}</option>)}</select></label>}
          {section==="cases"&&!creating&&<label className="block text-sm">Assign to<select className={`${selectStyle} ml-2`} value={form.assignedTo||""} onChange={e=>field("assignedTo",e.target.value)}><option value="">Unassigned</option>{operators.data?.map(operator=><option key={operator._id} value={operator._id}>{operator.name||operator.email}</option>)}</select></label>}
          {section==="cases"&&<label className="block text-sm">Note<textarea className="mt-2 min-h-24 w-full rounded border p-3" maxLength={2000} value={form.note||""} onChange={e=>field("note",e.target.value)}/></label>}
          {form.status==="resolved"&&<label className="block text-sm">How was this resolved?<textarea required className="mt-2 min-h-24 w-full rounded border p-3" maxLength={2000} value={form.resolution||""} onChange={e=>field("resolution",e.target.value)}/></label>}
        </>}
        {["alerts","staff"].includes(section)&&<label className="block text-sm">Reason<textarea required className="mt-2 min-h-24 w-full rounded border p-3" maxLength={2000} value={form.reason||""} onChange={e=>field("reason",e.target.value)}/></label>}
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={save.isPending}>{save.isPending?"Saving...":"Save"}</Button>
      </form>}
      {section==="alerts"&&selected&&access.can("cases:write")&&<Button className="mt-4" variant="outline" disabled={save.isPending} onClick={async()=>{try { await createCase({title:selected.title||"Alert review",alert:selected._id});toast.success("Case created");qc.invalidateQueries({queryKey:["operations","cases"]});qc.invalidateQueries({queryKey:["operational-overview"]}); } catch(e) {toast.error(apiError(e));}}}>Create case for this alert</Button>}
    </OperationDialog>
  </>;
}
