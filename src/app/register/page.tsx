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
import { FileText, AlertCircle, Loader2, CheckCircle2, User, Mail, Lock, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { user, register, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/notes/new");
    }
  }, [user, authLoading, router]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Invalid email address";
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(form.password)) {
      newErrors.password = "Password must contain at least one number";
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
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
    const { error } = await register(
      form.name,
      form.email,
      form.password,
      form.confirmPassword
    );
    setIsSubmitting(false);

    if (error) {
      setServerError(error);
    } else {
      router.push("/notes/new");
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    const checks = [
      { label: "8+ characters", ok: p.length >= 8 },
      { label: "Uppercase letter", ok: /[A-Z]/.test(p) },
      { label: "Number", ok: /[0-9]/.test(p) },
    ];
    return checks;
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
          <p className="text-[#64748b] mt-3 text-sm font-medium">Create your secure account</p>
        </div>

        {/* Card */}
        <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-[#1e293b]">Create Account</CardTitle>
            <CardDescription className="text-xs text-[#718096]">
              Fill in your details below to start sharing encrypted notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
              {serverError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  autoComplete="name"
                  className={errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.name && <p className="text-xs text-red-600 font-semibold">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  autoComplete="email"
                  className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.email && <p className="text-xs text-red-600 font-semibold">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  autoComplete="new-password"
                  className={errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.password && <p className="text-xs text-red-600 font-semibold">{errors.password}</p>}
                
                {form.password && (
                  <div className="p-3 mt-2 rounded-[14px] bg-[#e9edf3] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] border border-[#d1d9e6]/40 space-y-1.5">
                    <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Requirements</p>
                    {passwordStrength()?.map((check) => (
                      <div key={check.label} className={`flex items-center gap-1.5 text-xs font-medium ${check.ok ? "text-emerald-700 font-semibold" : "text-[#94a3b8]"}`}>
                        <CheckCircle2 className={`h-3.5 w-3.5 ${check.ok ? "text-emerald-600" : "text-[#cbd5e1]"}`} />
                        {check.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  autoComplete="new-password"
                  className={errors.confirmPassword ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 font-semibold">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff] mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#d1d9e6]/60 text-center">
              <p className="text-xs text-[#64748b] font-medium">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

