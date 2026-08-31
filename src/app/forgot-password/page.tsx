"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, AlertCircle, Loader2, Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, ExternalLink } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    resetUrl?: string | null;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Email address is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to process password reset request.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <p className="text-[#64748b] mt-3 text-sm font-medium">Account Recovery &amp; Password Reset</p>
        </div>

        {/* Card */}
        <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-bold text-[#1e293b]">Forgot Password?</CardTitle>
            <CardDescription className="text-xs text-[#718096]">
              Enter the email address registered with your account to receive a secure recovery link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-5">
                <Alert variant="success" className="shadow-[6px_6px_16px_#d1d9e6,-6px_-6px_16px_#ffffff]">
                  <CheckCircle2 className="h-5 w-5" />
                  <AlertTitle className="text-sm font-bold">Reset Request Processed</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed mt-1">
                    {result.message}
                  </AlertDescription>
                </Alert>

                {result.resetUrl && (
                  <div className="p-4 rounded-[18px] bg-[#e9edf3] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] border border-[#d1d9e6]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Instant Password Reset Link
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Valid for 1 hour
                      </span>
                    </div>

                    <p className="font-mono text-xs text-[#1e293b] break-all bg-white/70 p-2.5 rounded-[10px] border border-[#d1d9e6]/50">
                      {result.resetUrl}
                    </p>

                    <Button
                      asChild
                      size="default"
                      className="w-full h-11 text-xs font-bold shadow-[3px_4px_12px_rgba(37,99,235,0.3)]"
                    >
                      <Link href={result.resetUrl} className="flex items-center justify-center gap-1.5">
                        <ExternalLink className="h-4 w-4" />
                        Proceed to Reset Password
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 rounded-[14px] text-xs font-bold"
                  >
                    <Link href="/login" className="flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                    Registered Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    autoComplete="email"
                    className={error ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
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
                      Generating Reset Link...
                    </>
                  ) : (
                    <>
                      Generate Reset Link
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t border-[#d1d9e6]/60 text-center">
                  <Link
                    href="/login"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Remember your password? Sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

