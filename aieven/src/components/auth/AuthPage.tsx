import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { createAccount, signIn } from "@/auth/accountStore";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/hud/Brand";

interface AuthPageProps {
  onComplete: (email: string) => void;
}

type AuthMode = "signin" | "create";

export function AuthPage({ onComplete }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === "signin" ? "Sign in to Aieven" : "Create your Aieven access";
  const action = mode === "signin" ? "Sign in" : "Create access";
  const canSubmit = useMemo(
    () => email.trim().includes("@") && password.trim().length >= 6,
    [email, password]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (normalizedPassword.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result =
        mode === "create"
          ? await createAccount(normalizedEmail, normalizedPassword)
          : await signIn(normalizedEmail, normalizedPassword);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onComplete(result.email);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-void" />
      <main className="glass glass-sheen relative w-[min(100%,420px)] rounded-2xl p-5 shadow-2xl">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <p className="font-display text-lg font-semibold text-fg">Aieven</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                secure control
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            <ShieldCheck size={12} />
            gated
          </span>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-[32px] font-semibold leading-none tracking-normal text-fg">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Use your workspace credentials to open the migration control plane.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Email
            </span>
            <span className="glass-inset flex h-11 items-center gap-2 rounded-lg px-3 focus-within:border-accent/50">
              <Mail size={16} className="text-faint" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Password
            </span>
            <span className="glass-inset flex h-11 items-center gap-2 rounded-lg px-3 focus-within:border-accent/50">
              <Lock size={16} className="text-faint" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="Minimum 6 characters"
                className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-md p-1 text-faint transition hover:bg-white/5 hover:text-fg"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {error ? (
            <p className="rounded-lg border border-conflict/20 bg-conflict/10 px-3 py-2 text-xs text-conflict">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="accent"
            className="h-11 w-full"
            disabled={!canSubmit || pending}
          >
            {pending ? "Checking account" : action}
            <ArrowRight size={15} />
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <p className="text-xs text-faint">
            {mode === "signin" ? "Need access?" : "Already have access?"}
          </p>
          <button
            type="button"
            onClick={() => {
              setMode((value) => (value === "signin" ? "create" : "signin"));
              setError(null);
            }}
            className="text-sm font-medium text-accent transition hover:text-consensus"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
