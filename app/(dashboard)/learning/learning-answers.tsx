"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ArrowLeft } from "lucide-react";
import { getLearningAttempt, getLearningAttempts, LearningItem } from "@/lib/api";
import { apiError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";

export function LearningAnswers({ item, close }: { item: LearningItem; close: () => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["learning-attempts", item._id, page, search, from, to], queryFn: () => getLearningAttempts(item._id, page, search, from, to) });
  const detail = useQuery({ queryKey: ["learning-attempt", selected], queryFn: () => getLearningAttempt(selected!), enabled: !!selected });
  const attempt = detail.data;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onMouseDown={e => e.target === e.currentTarget && close()}>
      <section role="dialog" aria-modal="true" aria-label="Learning answers" className="relative max-h-[90vh] w-full max-w-5xl space-y-5 overflow-y-auto rounded-xl bg-white p-6">
        <button type="button" aria-label="Close answers" className="absolute right-4 top-4 text-slate-500" onClick={close}><X /></button>
        <h2 className="pr-8 text-xl font-bold">Answers — {item.title}</h2>
        {selected ? <>
          <Button variant="outline" onClick={() => setSelected(null)}><ArrowLeft size={16} /> Back to submissions</Button>
          {detail.isLoading && <p>Loading answers…</p>}
          {detail.isError && <p role="alert" className="text-red-600">{apiError(detail.error)}</p>}
          {attempt && <>
            <div className="rounded-lg bg-slate-50 p-4"><p className="font-semibold">{attempt.user?.name || "Deleted user"} {attempt.user?.email && `(${attempt.user.email})`}</p><p className="mt-1 text-sm text-slate-600">Score: {attempt.score}/{attempt.totalQuestions} · Quiz version: {attempt.quizVersion} · {new Date(attempt.createdAt).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Submission ID: {attempt._id}</p></div>
            {attempt.answers?.map((answer, i) => <article key={answer.questionId} className="space-y-2 rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold">{i + 1}. {answer.question}</h3>
              {answer.options.map(option => <p key={option.id} className={`rounded px-3 py-2 text-sm ${option.id === answer.correctOptionId ? "bg-green-50 text-green-800" : option.id === answer.selectedOptionId ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-600"}`}>{option.id}. {option.text}{option.id === answer.selectedOptionId && " — User selected"}{option.id === answer.correctOptionId && " — Correct answer"}</p>)}
              <p className={`text-sm font-semibold ${answer.isCorrect ? "text-green-700" : "text-red-600"}`}>{answer.isCorrect ? "Correct" : "Incorrect"}</p>
              {answer.explanation && <p className="text-sm text-slate-600">Explanation: {answer.explanation}</p>}
            </article>)}
          </>}
        </> : <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">Search user<Input placeholder="Name or email" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
            <label className="text-sm">From date<Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label>
            <label className="text-sm">To date<Input type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
          </div>
          {list.isLoading && <p>Loading submissions…</p>}
          {list.isError && <p role="alert" className="text-red-600">{apiError(list.error)}</p>}
          {list.data && <>
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4 text-sm"><p>Submissions<br /><strong>{list.data.summary.totalAttempts}</strong></p><p>Users<br /><strong>{list.data.summary.uniqueUsers}</strong></p><p>Average score<br /><strong>{list.data.summary.averageScore.toFixed(1)}%</strong></p></div>
            <p className="text-xs text-slate-500">Summary follows the current filters. Date filters use UTC. Each retry is saved separately.</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr>{["User", "Score", "Quiz version", "Submitted", "Action"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
              {list.data.attempts.map(a => <tr key={a._id} className="border-b"><td className="p-3"><p>{a.user?.name || "Deleted user"}</p><p className="text-xs text-slate-500">{a.user?.email}</p></td><td className="p-3">{a.score}/{a.totalQuestions}</td><td className="p-3">{a.quizVersion}</td><td className="p-3">{new Date(a.createdAt).toLocaleString()}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => setSelected(a._id)}>View Details</Button></td></tr>)}
              {!list.data.attempts.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No submissions found.</td></tr>}
            </tbody></table></div>
            {list.data.pagination.totalPages > 1 && <Pagination {...list.data.pagination} onPage={setPage} />}
          </>}
        </>}
      </section>
    </div>
  );
}
