"use client";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/page-title";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createLearning,
  deleteLearning,
  getLearnings,
  LearningItem,
  updateLearning,
} from "@/lib/api";
import { apiError, formatDate } from "@/lib/utils";

export default function LearningPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LearningItem | null | undefined>(
    undefined
  );

  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["learnings", page, search],
    queryFn: () => getLearnings(page, 8, search),
    placeholderData: (p) => p,
  });

  const learningsData = query.data;
  const items: LearningItem[] = Array.isArray(learningsData)
    ? learningsData
    : learningsData?.learnings || [];
  const pagination = !Array.isArray(learningsData)
    ? learningsData?.pagination
    : undefined;

  const save = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: FormData }) =>
      id ? updateLearning(id, data) : createLearning(data),
    onSuccess: (r) => {
      toast.success(r.message || "Saved successfully");
      setEditing(undefined);
      qc.invalidateQueries({ queryKey: ["learnings"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: deleteLearning,
    onSuccess: (r) => {
      toast.success(r.message || "Deleted successfully");
      qc.invalidateQueries({ queryKey: ["learnings"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <>
      <PageTitle
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search learning..."
                className="border-slate-200 pl-9"
              />
            </div>
            <Button onClick={() => setEditing(null)}>
              <Plus size={18} />
              Add new
            </Button>
          </div>
        }
      >
        Learning
      </PageTitle>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {query.isLoading ? (
          [...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[380px] rounded-xl" />
          ))
        ) : items.length ? (
          items.map((item) => (
            <article
              key={item._id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-48 w-full bg-slate-100">
                {item.image?.url ? (
                  <img
                    src={item.image.url}
                    alt={item.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center text-slate-400">
                    <BookOpen className="size-12 opacity-40" />
                    <span className="mt-1 text-xs font-medium">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="line-clamp-1 text-lg font-semibold text-[#a48734]">
                  {item.title}
                </h2>
                <p className="mt-2 line-clamp-3 min-h-[60px] flex-1 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(item)}
                  >
                    <Pencil size={15} />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={remove.isPending}
                    onClick={() =>
                      confirm("Are you sure you want to delete this learning item?") &&
                      remove.mutate(item._id)
                    }
                  >
                    <Trash2 size={15} />
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-500">
            <BookOpen className="size-12 text-slate-300" />
            <h3 className="mt-3 text-lg font-medium text-slate-700">
              No learning items found
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {search
                ? "Try searching for another keyword."
                : "Get started by clicking the 'Add new' button above."}
            </p>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPage={setPage}
        />
      )}

      {editing !== undefined && (
        <LearningModal
          item={editing}
          loading={save.isPending}
          close={() => setEditing(undefined)}
          submit={(data) => save.mutate({ id: editing?._id, data })}
        />
      )}
    </>
  );
}

function LearningModal({
  item,
  loading,
  close,
  submit,
}: {
  item: LearningItem | null;
  loading: boolean;
  close: () => void;
  submit: (data: FormData) => void;
}) {
  const [preview, setPreview] = useState(item?.image?.url || "");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
        }}
        className="relative grid max-h-[95vh] w-full max-w-4xl gap-6 overflow-y-auto rounded-xl bg-white p-6 sm:grid-cols-[260px_1fr] sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-700"
        >
          <X />
        </button>

        <div className="sm:col-span-2">
          <h2 className="text-2xl font-bold text-slate-800">
            {item ? "Edit" : "Add New"} Learning
          </h2>
          <p className="text-sm text-slate-500">
            Enter the details for this learning resource
          </p>
        </div>

        <div>
          <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#caa85a]/50 bg-[#faf7f0] p-3 text-center text-[#a48734] transition hover:border-[#caa85a] hover:bg-[#f6f0df]">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-56 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex flex-col items-center p-4">
                <ImagePlus size={44} className="mb-2 text-[#a48734]" />
                <span className="font-semibold">Upload Image</span>
                <small className="mt-1 text-xs text-slate-400">
                  PNG, JPG, WEBP up to 5MB
                </small>
              </div>
            )}
            <input
              name="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
          </label>
          {preview && (
            <button
              type="button"
              onClick={() => setPreview("")}
              className="mt-2 text-xs font-medium text-red-500 hover:underline"
            >
              Clear selected image
            </button>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Title *
            <Input
              name="title"
              defaultValue={item?.title}
              required
              placeholder="e.g. Understanding Smart Savings"
              className="mt-1.5 border-slate-300"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Description *
            <textarea
              name="description"
              defaultValue={item?.description}
              required
              rows={6}
              placeholder="Write the learning description or key takeaways here..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-[#caa85a] focus:ring-2 focus:ring-[#caa85a]/20"
            />
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[110px] rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              disabled={loading}
              className="h-11 min-w-[140px] whitespace-nowrap rounded-lg bg-[#a48734] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8d732a] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
            >
              {loading ? "Saving…" : "Save Learning"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
