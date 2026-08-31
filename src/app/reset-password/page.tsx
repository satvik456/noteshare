"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Check,
  X,
  KeyRound,
  RefreshCw,
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  // Live password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setTokenError("Missing password reset token in URL.");
      return;
    }

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setTokenValid(false);
          setTokenError(data.message ?? "This password reset link is invalid or has expired.");
        } else {
          setTokenValid(true);
          setUserEmail(data.email ?? "");
        }
      } catch {
        setTokenValid(false);
        setTokenError("Failed to verify reset link. Please check your internet connection.");
      } finally {
        setVerifying(false);
      }
    };

    void checkToken();
  }, [token]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!password) {
      newErrors.password = "New password is required";
    } else {
      if (!hasMinLength) newErrors.password = "Password must be at least 8 characters";
      else if (!hasUppercase) newErrors.password = "Password must contain an uppercase letter";
      else if (!hasNumber) newErrors.password = "Password must contain a number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Failed to reset password.");
      } else {
        setResetComplete(true);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
        <CardContent className="flex flex-col items-center justify-center py-14">
          <div className="p-4 rounded-full bg-[#eef2f7] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <p className="text-sm font-bold text-[#1e293b]">Verifying security reset link...</p>
          <p className="text-xs text-[#64748b] mt-1">Please wait a moment</p>
        </CardContent>
      </Card>
    );
  }

  if (!tokenValid) {
    return (
      <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-[16px] bg-red-50 shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff] border border-red-200">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-[#1e293b]">Link Invalid or Expired</CardTitle>
          <CardDescription className="text-xs text-[#718096]">
            {tokenError}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Password reset links are valid for 1 hour and can only be used once.
            </AlertDescription>
          </Alert>

          <Button
            asChild
            size="lg"
            className="w-full h-12 text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]"
          >
            <Link href="/forgot-password" className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Request New Reset Link
            </Link>
          </Button>

          <div className="pt-3 text-center">
            <Link
              href="/login"
              className="text-xs font-bold text-[#64748b] hover:text-blue-600 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (resetComplete) {
    return (
      <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-emerald-50 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] border border-emerald-200">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <CardTitle className="text-xl font-bold text-[#1e293b]">Password Reset Successfully!</CardTitle>
          <CardDescription className="text-xs text-[#718096]">
            Your password has been updated securely. You can now sign in with your new credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            asChild
            size="lg"
            className="w-full h-12 text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]"
          >
            <Link href="/login" className="flex items-center justify-center gap-2">
              Sign In to Your Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
          <Lock className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl font-bold text-[#1e293b]">Create New Password</CardTitle>
        <CardDescription className="text-xs text-[#718096]">
          {userEmail ? (
            <>Resetting password for <strong className="text-[#1e293b]">{userEmail}</strong></>
          ) : (
            "Enter your new secure password below"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              New Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              autoComplete="new-password"
              className={errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.password && (
              <p className="text-xs text-red-600 font-semibold">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              autoComplete="new-password"
              className={errors.confirmPassword ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 font-semibold">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Tactile Password Strength Plate */}
          <div className="p-4 rounded-[18px] bg-[#e9edf3] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] border border-[#d1d9e6]/50 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
              Password Requirements
            </p>
            <div className="space-y-1.5 text-xs font-semibold">
              <div className={`flex items-center gap-2 transition-colors ${hasMinLength ? "text-emerald-700" : "text-[#718096]"}`}>
                {hasMinLength ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-[#a0aec0] shrink-0" />
                )}
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasUppercase ? "text-emerald-700" : "text-[#718096]"}`}>
                {hasUppercase ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-[#a0aec0] shrink-0" />
                )}
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasNumber ? "text-emerald-700" : "text-[#718096]"}`}>
                {hasNumber ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-[#a0aec0] shrink-0" />
                )}
                <span>At least one number (0-9)</span>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-2 transition-colors ${passwordsMatch ? "text-emerald-700" : "text-red-600"}`}>
                  {passwordsMatch ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span>Passwords match</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                Update Password
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs font-bold text-[#64748b] hover:text-blue-600 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cancel &amp; return to Sign In
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f7] px-4 py-12 text-[#2d3748]">
      <div className="w-full max-w-md">
        {/* Header with Embossed Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group select-none">
            <div className="p-3 rounded-[18px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[5px_5px_12px_#d1d9e6,-5px_-5px_12px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 group-hover:shadow-[6px_6px_14px_#c8d2e0,-6px_-6px_14px_#ffffff] transition-all duration-200">
              <FileText className="h-7 w-7 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#1e293b]">
              NoteShare
            </span>
          </Link>
          <p className="text-[#64748b] mt-3 text-sm font-medium">Set New Account Password</p>
        </div>

        <Suspense
          fallback={
            <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff]">
              <CardContent className="flex items-center justify-center py-14">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </CardContent>
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

