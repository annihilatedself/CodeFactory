import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { signIn } from "@/auth/accountStore";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/hud/Brand";

interface AuthPageProps {
  onComplete: (email: string) => void;
}

export function AuthPage({ onComplete }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = "Sign in";
  const action = "Sign in";
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
      const result = await signIn(normalizedEmail, normalizedPassword);

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
              <p className="font-display text-lg font-semibold text-fg">Commander</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                agentic migration command
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-[32px] font-semibold leading-none tracking-normal text-fg">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Command the migration as agents coordinate, review, challenge, and reach
            consensus in real time.
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
                autoComplete="current-password"
                placeholder="Password"
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
      </main>
    </div>
  );
}
