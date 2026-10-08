"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function OperationDialog({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <Dialog.Title className="pr-8 text-xl font-bold">{title}</Dialog.Title>
      <Dialog.Description className="sr-only">Review operational details and available actions.</Dialog.Description>
      <Dialog.Close aria-label="Close" className="absolute right-4 top-4"><X /></Dialog.Close>
      <div className="mt-5">{children}</div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
