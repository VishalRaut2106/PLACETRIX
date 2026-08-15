// app/auth/login/page.tsx
//
// Login flow:
//
//   login-form    → signInWithPassword()
//                   ✓ confirmed, no MFA  → redirect /~ (or ?next=)
//                   ✓ confirmed, has MFA → redirect /auth/mfa?next=
//                   ✗ unconfirmed        → resend OTP → otp-entry
//
//   otp-entry     → verifyOtp({ email, token, type: 'signup' })
//                   ✓ verified    → session active → redirect /~
//
//   Dedicated MFA challenge route is /auth/mfa.
//
//   OR: Continue with Google → signInWithOAuth() → /auth/callback
//       → middleware AAL check → /auth/mfa (if MFA enrolled) → /~
//
//   OR: Google One Tap → signInWithIdToken() → /~
//       → middleware AAL check → /auth/mfa (if MFA enrolled) → /~
//
// Industry note: never grant access to an unconfirmed account.
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { startNavigationProgress, stopNavigationProgress } from "@/components/ui/navigation-progress";

type PageState = "login-form" | "otp-entry";

const RESEND_COOLDOWN = 60;
const LAST_EMAIL_KEY = "placetrix_last_email";

import { GoogleIcon } from "@/components/icons/google-icon";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex sm:w-sm items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  const [pageState, setPageState] = useState<PageState>("login-form");
  const [loginMethod, setLoginMethod] = useState<"password" | "magiclink">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Smart fill last used email on mount ──────────────────────────────────
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(LAST_EMAIL_KEY);
      if (savedEmail && !email) {
        setEmail(savedEmail);
      }
    } catch {}
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    []
  );

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      try {
        localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      } catch {}

      if (loginMethod === "magiclink") {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });

        if (error) {
          if (
            error.status === 504 ||
            error.message?.toLowerCase().includes("timeout") ||
            error.message?.toLowerCase().includes("fetch")
          ) {
            setError("The server is temporarily busy. Please wait a moment and try again.");
            return;
          }
          throw error;
        }
      }

      setSuccessMessage("We sent a sign-in link to your email address. Please check your inbox.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      try {
        localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      } catch {}

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (
          error.status === 504 ||
          error.message?.toLowerCase().includes("timeout") ||
          error.message?.toLowerCase().includes("fetch")
        ) {
          setError("The server is temporarily busy. Please wait a moment and try again.");
          setIsLoading(false);
          return;
        }

        if (error.message === "Email not confirmed") {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: cleanEmail,
          });
          if (resendError) throw resendError;
          setPageState("otp-entry");
          startCooldown();
          setIsLoading(false);
          return;
        }
        throw error;
      }

      // Successful password validation -> switch into redirecting state & start top progress bar
      setIsRedirecting(true);
      startNavigationProgress();

      // Check if the user has MFA enrolled and needs to verify it.
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
        // User has MFA enrolled — delegate directly to the dedicated /auth/mfa route
        router.push(`/auth/mfa?next=${encodeURIComponent(next)}`);
        router.refresh();
        return;
      }

      // No MFA needed — redirect to destination
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
      setIsRedirecting(false);
      stopNavigationProgress();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, tokenOverride?: string) => {
    if (e) e.preventDefault();
    const tokenToVerify = tokenOverride ?? otp;
    if (tokenToVerify.length < 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: tokenToVerify,
        type: "signup",
      });
      if (error) throw error;

      setIsRedirecting(true);
      startNavigationProgress();

      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
        router.push(`/auth/mfa?next=${encodeURIComponent(next)}`);
        router.refresh();
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      setOtp("");
      setIsLoading(false);
      setIsRedirecting(false);
      stopNavigationProgress();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail });
      if (error) throw error;
      startCooldown();
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    startNavigationProgress();

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setIsGoogleLoading(false);
      stopNavigationProgress();
    }
  };

  const isBusy = isLoading || isGoogleLoading || isRedirecting;

  return (
    <>
      {/* Google One Tap */}
      <GoogleOneTap
        next={next}
        onStart={() => {
          setIsGoogleLoading(true);
          setError(null);
          startNavigationProgress();
        }}
        onSuccess={() => {
          setIsGoogleLoading(true);
          setIsRedirecting(true);
        }}
        onError={(msg) => {
          setIsGoogleLoading(false);
          setIsRedirecting(false);
          setError(msg);
          stopNavigationProgress();
        }}
      />

      <div className="mx-auto w-full sm:w-sm">
        <AnimatePresence mode="wait">
          {pageState === "otp-entry" ? (
            /* ── OTP screen ── */
            <motion.div
              key="otp-entry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex flex-col space-y-1">
                <h1 className="font-cirka font-bold text-2xl tracking-wide">
                  Confirm Your Email
                </h1>
                <p className="text-base text-muted-foreground">
                  Your email isn&apos;t confirmed yet. We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <div className="flex justify-center">
                  <InputOTP
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      if (error) setError(null);
                      if (v.length === 6 && !isLoading && !isRedirecting) {
                        handleVerifyOtp(undefined, v);
                      }
                    }}
                    disabled={isBusy}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  className="w-full cursor-pointer"
                  type="submit"
                  disabled={isBusy || otp.length < 6}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting…
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Confirm & Sign In"
                  )}
                </Button>
              </form>

              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Didn&apos;t receive it?{" "}
                  {resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleResend}
                      className="underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Resend code
                    </button>
                  )}{" "}
                  or check your spam folder.
                </span>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setPageState("login-form");
                  setOtp("");
                  setError(null);
                }}
                className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
            /* ── Login form ── */
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="flex flex-col space-y-1">
                <h1 className="font-cirka font-bold text-2xl tracking-wide">Welcome Back!</h1>
                <p className="text-base text-muted-foreground">
                  Sign in to your account to continue.
                </p>
              </div>

              <Button
                className="w-full cursor-pointer"
                variant="outline"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isBusy}
              >
                {isGoogleLoading ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
              </Button>

              {/* Canonical Shadcn Tabs Switcher for Login Method */}
              <Tabs
                value={loginMethod}
                onValueChange={(val) => {
                  setLoginMethod(val as "password" | "magiclink");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="password"
                    disabled={isBusy}
                  >
                    Password
                  </TabsTrigger>
                  <TabsTrigger
                    value="magiclink"
                    disabled={isBusy}
                  >
                    Magic Link
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex w-full items-center justify-center gap-2">
                <Separator className="flex-1" />
                <span className="shrink-0 text-muted-foreground text-xs">OR</span>
                <Separator className="flex-1" />
              </div>

              <form
                className="space-y-4"
                onSubmit={loginMethod === "password" ? handleLogin : handleMagicLinkLogin}
              >
                <p className="text-start text-muted-foreground text-xs">
                  {loginMethod === "password"
                    ? "Enter your credentials to sign in"
                    : "Enter your email to receive a secure login link"}
                </p>

                <Input
                  autoFocus={!email}
                  placeholder="your.email@example.com"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isBusy}
                />

                {loginMethod === "password" && (
                  <InputGroup>
                    <InputGroupInput
                      autoFocus={!!email}
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isBusy}
                    />
                    <InputGroupAddon
                      align="inline-end"
                      className="cursor-pointer"
                      role="button"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((p) => !p)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupAddon>
                  </InputGroup>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                {successMessage && (
                  <p className="text-sm text-green-500 rounded-md bg-green-500/10 px-3 py-2">
                    {successMessage}
                  </p>
                )}

                <Button
                  className="w-full cursor-pointer"
                  type="submit"
                  disabled={isBusy}
                >
                  {isRedirecting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting…
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      {loginMethod === "password" ? "Signing in…" : "Sending link…"}
                    </>
                  ) : (
                    loginMethod === "password" ? "Sign In" : "Send Magic Link"
                  )}
                </Button>

                <div className="flex justify-between items-center text-xs">
                  <Link
                    href={isBusy ? "#" : "/auth/sign-up"}
                    className={`text-muted-foreground underline underline-offset-4 hover:text-primary transition-all ${
                      isBusy ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Don&apos;t have an account? Sign up
                  </Link>

                  {loginMethod === "password" && (
                    <Link
                      href={isBusy ? "#" : "/auth/reset-password"}
                      className={`text-muted-foreground underline underline-offset-4 hover:text-primary ${
                        isBusy ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
              </form>

              <p className="text-muted-foreground text-xs text-center pt-2">
                By signing in, you agree to our{" "}
                <Link
                  href="/terms-of-service"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy-policy"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
