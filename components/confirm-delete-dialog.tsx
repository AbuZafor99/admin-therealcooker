"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PHRASE = "confirm";

// Permanent deletions require typing the confirmation word, so a stray click can never delete data.
export function ConfirmDeleteDialog({ title, subject, children, pending, onConfirm, onClose }: { title: string; subject: string; children: React.ReactNode; pending: boolean; onConfirm: () => void; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toLowerCase() === PHRASE;
  return <Dialog.Root open onOpenChange={open => { if (!open && !pending) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
      <Dialog.Title className="flex items-center gap-2 pr-8 text-xl font-bold text-slate-900"><TriangleAlert className="text-red-600" size={22} />{title}</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm text-slate-600">You are about to permanently delete <strong className="text-slate-900">{subject}</strong>. This cannot be undone.</Dialog.Description>
      <Dialog.Close aria-label="Close" disabled={pending} className="absolute right-4 top-4 disabled:opacity-40"><X /></Dialog.Close>
      <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-900">{children}</div>
      <form onSubmit={event => { event.preventDefault(); if (ready && !pending) onConfirm(); }}>
        <label className="mt-5 block text-sm font-medium text-slate-700">Type <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{PHRASE}</span> to delete
          <input autoFocus autoComplete="off" value={typed} disabled={pending} onChange={event => setTyped(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:outline-none" aria-label={`Type ${PHRASE} to delete`} />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={!ready || pending}>{pending ? "Deleting…" : "Delete permanently"}</Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
