"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertCircle, Loader2, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/notes/new");
    }
  }, [user, authLoading, router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email address";
    if (!password) newErrors.password = "Password is required";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const { error } = await login(email, password);
    setIsSubmitting(false);

    if (error) {
      setServerError(error);
    } else {
      router.push("/notes/new");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">
        <div className="p-4 rounded-[20px] bg-[#eef2f7] shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] border border-white/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

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
          <p className="text-[#64748b] mt-3 text-sm font-medium">Welcome back to your workspace</p>
        </div>

        {/* Card */}
        <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-[#1e293b]">Sign In</CardTitle>
            <CardDescription className="text-xs text-[#718096]">
              Enter your credentials to manage your secure notes
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

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  aria-invalid={!!errors.email}
                  autoComplete="email"
                  className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-600 font-semibold">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-blue-600" />
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  aria-invalid={!!errors.password}
                  autoComplete="current-password"
                  className={errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-red-600 font-semibold">{errors.password}</p>
                )}
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#d1d9e6]/60 text-center">
              <p className="text-xs text-[#64748b] font-medium">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                  Create one now
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

