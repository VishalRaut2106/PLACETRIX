// app/auth/reset-password/page.tsx
//
// Full OTP-based password reset — all steps on a single page:
//
//   email-form    → resetPasswordForEmail(email)  → OTP sent
//   otp-entry     → verifyOtp({ email, token, type: 'recovery' })
//                   → recovery session established
//   password-form → updateUser({ password })
//                   → signOut() to invalidate the one-time recovery session
//   success       → prompt to sign in
//
// ── Required Supabase email template ─────────────────────────────────────────
//
//  Dashboard → Authentication → Email Templates → Reset Password
//  Subject: Reset your password
//  Body:
//    Your password reset code is: {{ .Token }}
//    This code expires in 1 hour.
//
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import {
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordStrength } from "@/components/auth/password-strength";

type PageState = "email-form" | "otp-entry" | "password-form" | "success";

const RESEND_COOLDOWN = 60;

export default function ResetPasswordPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>("email-form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cooldown timer ─────────────────────────────────────────────────────────
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

  // ── Step 1: Send reset email ───────────────────────────────────────────────
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;
      setPageState("otp-entry");
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
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
        type: "recovery",
      });
      if (error) throw error;
      setPageState("password-form");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;
      startCooldown();
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  // ── Step 3: Update password ────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Invalidate the one-time recovery session so it cannot be reused.
      await supabase.auth.signOut({ scope: "local" });
      setPageState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full sm:w-sm">
      <AnimatePresence mode="wait">
        {pageState === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <div className="flex flex-col space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="space-y-1">
                <h1 className="font-cirka font-bold text-2xl tracking-wide">
                  Password Updated!
                </h1>
                <p className="text-base text-muted-foreground">
                  Your password has been reset successfully. Sign in with your new
                  password to continue.
                </p>
              </div>
            </div>
            <Button asChild className="w-full cursor-pointer">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </motion.div>
        )}

        {pageState === "password-form" && (
          <motion.div
            key="password-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="flex flex-col space-y-1">
              <h1 className="font-cirka font-bold text-2xl tracking-wide">Set New Password</h1>
              <p className="text-base text-muted-foreground">
                Choose a strong password for your account.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              <InputGroup>
                <InputGroupInput
                  autoFocus
                  placeholder="New password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
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

              <PasswordStrength password={password} />

              <InputGroup>
                <InputGroupInput
                  placeholder="Confirm new password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <InputGroupAddon
                  align="inline-end"
                  className="cursor-pointer"
                  role="button"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowConfirm((p) => !p)}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupAddon>
              </InputGroup>

              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters.
              </p>

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

              <Button className="w-full cursor-pointer" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {pageState === "otp-entry" && (
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
                Enter Reset Code
              </h1>
              <p className="text-base text-muted-foreground">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>
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
                    if (v.length === 6 && !isLoading) {
                      handleVerifyOtp(undefined, v);
                    }
                  }}
                  disabled={isLoading}
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
                disabled={isLoading || otp.length < 6}
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify Code"
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
                    disabled={isLoading}
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
              disabled={isLoading}
              onClick={() => {
                setPageState("email-form");
                setOtp("");
                setError(null);
              }}
              className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Use a different email
            </button>
          </motion.div>
        )}

        {pageState === "email-form" && (
          <motion.div
            key="email-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="flex flex-col space-y-1">
              <h1 className="font-cirka font-bold text-2xl tracking-wide">Reset Password</h1>
              <p className="text-base text-muted-foreground">
                Enter your email and we&apos;ll send you a reset code.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleSendEmail}>
              <Input
                autoFocus
                placeholder="your.email@example.com"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />

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

              <Button className="w-full cursor-pointer" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground pt-2">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="underline underline-offset-4 hover:text-primary transition-all"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}