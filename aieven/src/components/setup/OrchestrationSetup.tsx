import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FileText, FolderOpen, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/hud/Brand";

export interface SelectedManifestFile {
  name: string;
  size: number;
  type: string;
}

interface OrchestrationSetupProps {
  email: string;
  onStart: (files: SelectedManifestFile[]) => void;
  onSignOut: () => void;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function OrchestrationSetup({ email, onStart, onSignOut }: OrchestrationSetupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedManifestFile[]>([]);

  const totalSize = useMemo(
    () => files.reduce((total, file) => total + file.size, 0),
    [files]
  );

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
    }));
    setFiles(selected);
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-void/50 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-void via-void/70 to-transparent" />

      <main className="glass glass-sheen relative w-[min(100%,560px)] overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <p className="font-display text-lg font-semibold text-fg">Prepare orchestration</p>
              <p className="font-mono text-[10px] text-faint">{email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-faint transition hover:bg-white/5 hover:text-fg"
          >
            Sign out
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5">
            <h1 className="font-display text-[34px] font-semibold leading-none tracking-normal text-fg">
              Choose files to orchestrate
            </h1>
            <p className="mt-2 max-w-[46ch] text-sm leading-6 text-muted">
              Select the source files for this run. The live movement starts after the manifest is ready.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={chooseFiles}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="glass-inset flex min-h-[116px] w-full items-center justify-between rounded-xl px-4 text-left transition hover:border-accent/40"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <FolderOpen size={22} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-fg">Choose files</span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  JSON, CSV, logs, specs, or migration notes
                </span>
              </span>
            </span>
            <span className="font-mono text-[11px] text-faint">
              {files.length ? `${files.length} selected` : "none selected"}
            </span>
          </button>

          <div className="mt-4 min-h-[150px] rounded-xl border border-white/[0.06] bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Run manifest
              </p>
              <p className="font-mono text-[10px] text-faint">
                {formatBytes(totalSize)}
              </p>
            </div>

            {files.length ? (
              <div className="scroll-thin max-h-[170px] overflow-y-auto p-2">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm"
                  >
                    <FileText size={15} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-fg">{file.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-faint">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[108px] items-center justify-center px-5 text-center text-sm text-faint">
                No files selected yet.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setFiles([])}
              disabled={!files.length}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-faint transition hover:bg-white/5 hover:text-fg disabled:pointer-events-none disabled:opacity-35"
            >
              <X size={15} />
              Clear manifest
            </button>
            <Button
              type="button"
              variant="accent"
              className="h-11 px-5"
              disabled={!files.length}
              onClick={() => onStart(files)}
            >
              <Play size={15} />
              Start orchestration
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
