"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  Loader2,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Wallet,
  Building,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ParticleField } from "@/features/marketing/particle-field";
import { ClaimFlowLogo } from "@/features/marketing/logo";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/shell/theme-toggle";

const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    name: "Sarah Tan",
    email: "demo.employee@claimflow.com",
    avatar: "/animoji_employee.jpg",
    dept: "Sales",
    description: "Submit & track claims",
  },
  {
    role: "Approving Officer",
    name: "Marcus Lim",
    email: "demo.manager@claimflow.com",
    avatar: "/animoji_approver.jpg",
    dept: "Operations",
    description: "Review & endorse team claims",
  },
  {
    role: "Finance Admin",
    name: "Dan Yeo",
    email: "demo.finance@claimflow.com",
    avatar: "/animoji_finance.jpg",
    dept: "Finance",
    description: "Disburse treasury funds",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  
  // Sign In States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Forgot Password States
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Email validation check
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Simulated Scanning loop states for left pane
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setScanStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Set page html/body auto height to allow scrolling on mount
  useEffect(() => {
    document.documentElement.classList.remove("h-full");
    document.body.classList.remove("h-full");
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.style.overflow = "auto";
  }, []);

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    const lowerEmail = email.toLowerCase().trim();
    let userRole: "Employee" | "Approving Officer" | "Finance Admin" = "Employee";
    let userName = "Sarah Tan";
    let userDept = "Sales";
    let avatar = "/animoji_employee.jpg";

    if (lowerEmail === "demo.employee@claimflow.com" || lowerEmail.includes("employee")) {
      userRole = "Employee";
      userName = "Sarah Tan";
      userDept = "Sales";
      avatar = "/animoji_employee.jpg";
    } else if (lowerEmail === "demo.manager@claimflow.com" || lowerEmail.includes("manager") || lowerEmail.includes("officer")) {
      userRole = "Approving Officer";
      userName = "Marcus Lim";
      userDept = "Operations";
      avatar = "/animoji_approver.jpg";
    } else if (lowerEmail === "demo.finance@claimflow.com" || lowerEmail.includes("finance") || lowerEmail.includes("admin")) {
      userRole = "Finance Admin";
      userName = "Dan Yeo";
      userDept = "Finance";
      avatar = "/animoji_finance.jpg";
    } else {
      userName = email.split("@")[0].split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
      userRole = "Employee";
      userDept = "Sales";
      avatar = "/animoji_employee.jpg";
    }

    const sessionObj = {
      email: lowerEmail,
      name: userName,
      role: userRole,
      department: userDept,
      avatarUrl: avatar
    };

    localStorage.setItem("claimflow_user", JSON.stringify(sessionObj));

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 850);
  };

  const handleDemoLogin = (demoEmail: string, roleName: string) => {
    setActiveRole(roleName);
    setEmail(demoEmail);
    setPassword("••••••••");
    setLoading(true);
    setError("");

    let matchedUser = {
      email: demoEmail,
      name: "Sarah Tan",
      role: "Employee" as "Employee" | "Approving Officer" | "Finance Admin",
      department: "Sales",
      avatarUrl: "/animoji_employee.jpg"
    };

    if (demoEmail === "demo.employee@claimflow.com") {
      matchedUser = {
        email: demoEmail,
        name: "Sarah Tan",
        role: "Employee",
        department: "Sales",
        avatarUrl: "/animoji_employee.jpg"
      };
    } else if (demoEmail === "demo.manager@claimflow.com") {
      matchedUser = {
        email: demoEmail,
        name: "Marcus Lim",
        role: "Approving Officer",
        department: "Operations",
        avatarUrl: "/animoji_approver.jpg"
      };
    } else if (demoEmail === "demo.finance@claimflow.com") {
      matchedUser = {
        email: demoEmail,
        name: "Dan Yeo",
        role: "Finance Admin",
        department: "Finance",
        avatarUrl: "/animoji_finance.jpg"
      };
    }

    localStorage.setItem("claimflow_user", JSON.stringify(matchedUser));

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 850);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    setError("");
    setTimeout(() => {
      setResetLoading(false);
      setResetSuccess(true);
    }, 1000);
  };

  return (
    <main className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-canvas overflow-hidden">
      
      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* 1. LEFT PANE: Cinematic Product Showcase (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 text-white relative overflow-hidden select-none border-r border-zinc-900 z-10">
        {/* Glow & Particles */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 via-zinc-950 to-emerald-950/20 z-0 pointer-events-none" />
        <ParticleField className="absolute inset-0 z-0 opacity-40" />
        <div aria-hidden className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        {/* Top brand header */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/25 flex items-center justify-center border border-indigo-500/30">
            <ClaimFlowLogo className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-sm font-bold tracking-widest uppercase text-zinc-300">ClaimFlow Portal</span>
        </div>

        {/* Center illustration: Interactive AI OCR Scanner Mockup */}
        <div className="flex flex-col items-center justify-center relative z-10 py-10">
          
          {/* Animated 3D Floating Receipt Board */}
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden"
          >
            {/* Hologram Scanner Laser Line */}
            <div className="absolute inset-x-0 h-1.5 bg-sky-400/80 shadow-[0_0_15px_rgba(14,165,233,0.8)] animate-scan z-30" />
            
            {/* Receipt header */}
            <div className="border-b border-dashed border-white/10 pb-4 mb-4 text-left leading-normal font-sans">
              <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">Automated AI Ingestion</span>
              <h3 className="text-base font-bold text-white mt-1">JUMBO SEAFOOD SG</h3>
              <span className="text-[10px] text-zinc-400 font-mono">20 RIVERSIDE POINT · UEN: T09LL8023E</span>
            </div>

            {/* Scanning Fields Feed */}
            <div className="flex flex-col gap-3 font-mono text-[10px] text-left leading-normal relative z-15">
              {[
                { label: "OCR Merchant Target", val: "JUMBO Seafood Pte Ltd", step: 0 },
                { label: "Extracted Subtotal", val: "S$318.40 (GST 9% Included)", step: 1 },
                { label: "IRAS Guard Result", val: "Meets SGD Entertainment Cap [OK]", step: 2 },
                { label: "Workflow Clearance", val: "Route L2 Desk: Marcus Lim [Pending]", step: 3 },
              ].map((item) => {
                const isActive = scanStep === item.step;
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all duration-300",
                      isActive
                        ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)] text-white scale-[1.01]"
                        : "bg-black/20 border-white/5 text-zinc-400"
                    )}
                  >
                    <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{item.label}</span>
                    <span className="block text-xs font-semibold mt-0.5">{item.val}</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom active pill */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-sans text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>API Gateway Online</span>
              </div>
              <span className="font-mono text-zinc-500">Scan Match: 99.4%</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Tagline */}
        <div className="text-left relative z-10 leading-relaxed max-w-sm">
          <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            Ledger-Grade Policy Audits
          </h4>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Connect corporate spend, verify Singapore IRAS guidelines automatically, and disburse via FAST instantly.
          </p>
        </div>

      </div>

      {/* 2. RIGHT PANE: Modern Login Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        
        {/* Decorative Grid backdrop for mobile screens */}
        <div className="lg:hidden absolute inset-0 -z-20 opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        
        <div className="w-full max-w-sm flex flex-col gap-5">
          
          {/* Back to Homepage */}
          <Link
            href="/"
            className="group flex items-center gap-1.5 text-xs font-semibold text-fg-secondary hover:text-fg transition-colors w-fit ml-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to homepage
          </Link>

          {/* Form Card */}
          <div className="relative group w-full rounded-[2rem] p-0.5 bg-gradient-to-b from-white/20 via-white/5 to-white/0 dark:from-zinc-800/30 dark:via-zinc-900/10 dark:to-transparent shadow-xl backdrop-blur-3xl saturate-210 overflow-hidden border border-black/[0.04] dark:border-white/5">
            
            <div className="relative rounded-[1.9rem] bg-white/90 dark:bg-zinc-950/85 p-6 sm:p-8 flex flex-col">
              
              {/* Header */}
              <div className="flex flex-col items-center mb-5 text-center select-none">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/25 flex items-center justify-center shadow-inner mb-3 border border-indigo-500/20">
                  <ClaimFlowLogo className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-fg">
                  {forgotMode ? "Reset Password" : "Sign In to ClaimFlow"}
                </h2>
                <p className="mt-1 text-xs text-fg-secondary max-w-[280px] font-medium leading-relaxed">
                  {forgotMode 
                    ? "Enter your email to receive a secure password recovery link." 
                    : "Access your receipt scanning & automated reimbursement portal."}
                </p>
              </div>

              {/* FORGOT PASSWORD FORM */}
              {forgotMode ? (
                <div className="flex flex-col">
                  {resetSuccess ? (
                    <div className="flex flex-col items-center text-center p-3 py-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4 font-sans">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                      <h4 className="text-xs font-bold text-fg">Reset Link Dispatched</h4>
                      <p className="text-[11px] text-fg-secondary mt-1 font-medium leading-relaxed">
                        We have dispatched a verification token to <strong className="text-fg font-semibold">{resetEmail}</strong>. Please check your inbox.
                      </p>
                      <button
                        onClick={() => {
                          setForgotMode(false);
                          setResetSuccess(false);
                          setResetEmail("");
                          setError("");
                        }}
                        className="mt-4 w-full bg-fg text-canvas rounded-xl py-2 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                      >
                        Back to Login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-3.5">
                      {error && (
                        <div className="p-2.5 rounded-xl border border-danger/20 bg-danger/5 text-danger text-[10px] font-semibold text-center">
                          {error}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-fg-tertiary" />
                          <input
                            type="email"
                            required
                            placeholder="name@company.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border focus:border-accent bg-card text-fg focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all font-medium placeholder:text-fg-tertiary"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full bg-fg text-canvas rounded-xl py-2.5 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-75"
                      >
                        {resetLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Send Recovery Link"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(false);
                          setError("");
                        }}
                        className="text-center text-xs text-fg-secondary hover:text-fg font-semibold mt-1 transition-colors hover:underline"
                      >
                        Cancel and Go Back
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* SIGN IN FORM */
                <form onSubmit={handleCredentialsLogin} className="flex flex-col">
                  {error && (
                    <div className="p-2.5 rounded-xl border border-danger/20 bg-danger/5 text-danger text-[10px] font-semibold text-center mb-3">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-3.5">
                    {/* Email Input */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-fg-tertiary" />
                        <input
                          type="email"
                          required
                          placeholder="sarah.tan@company.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border focus:border-accent bg-card text-fg focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all font-medium placeholder:text-fg-tertiary"
                        />
                        {isEmailValid && (
                          <span className="absolute right-3 top-2.5 flex h-4 w-4 items-center justify-center text-emerald-500">
                            <Check className="h-3.5 w-3.5 stroke-[3px]" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotMode(true);
                            setResetEmail(email);
                            setError("");
                          }}
                          className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-fg-tertiary" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border focus:border-accent bg-card text-fg focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all font-medium placeholder:text-fg-tertiary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 h-4 w-4 text-fg-secondary hover:text-fg flex items-center justify-center cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember me check */}
                    <div className="flex items-center gap-2 text-left py-0.5 select-none">
                      <input
                        type="checkbox"
                        id="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <label htmlFor="remember" className="text-[11px] text-fg-secondary font-semibold cursor-pointer">
                        Remember this device
                      </label>
                    </div>

                    {/* Submit Sign In button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-fg text-canvas rounded-xl py-2.5 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-75"
                    >
                      {loading && activeRole === null ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sandbox Divider */}
                  <div className="relative my-4.5 flex items-center select-none">
                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-900" />
                    <span className="flex-shrink mx-3 text-[9px] font-black uppercase tracking-widest text-fg-tertiary">
                      Or Sandbox Credentials
                    </span>
                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-900" />
                  </div>

                  {/* Sleek Avatars row for Instant demo sign-in */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-fg-secondary font-medium select-none mb-1 text-center">
                      Click a profile to pre-fill credentials &amp; login:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {DEMO_ACCOUNTS.map((acc) => {
                        const isCurrent = activeRole === acc.role;
                        return (
                          <button
                            key={acc.role}
                            type="button"
                            onClick={() => handleDemoLogin(acc.email, acc.role)}
                            disabled={loading}
                            title={`${acc.name} — ${acc.role}`}
                            className={cn(
                              "flex flex-col items-center p-2 rounded-xl border bg-white/40 dark:bg-white/[0.01] hover:bg-white/85 dark:hover:bg-white/[0.04] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm relative group/btn",
                              isCurrent ? "border-indigo-500 bg-indigo-500/5" : "border-zinc-200 dark:border-zinc-900"
                            )}
                          >
                            <div className="relative">
                              <img
                                src={acc.avatar}
                                alt={acc.name}
                                className="h-8.5 w-8.5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm"
                              />
                              {isCurrent && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                                </span>
                              )}
                            </div>
                            <span className="block text-[8px] font-black text-fg mt-1.5 truncate w-full text-center">
                              {acc.name.split(" ")[0]}
                            </span>
                            <span className="block text-[7px] text-fg-secondary mt-0.5 truncate w-full text-center select-none font-bold uppercase tracking-wide">
                              {acc.role === "Approving Officer" ? "Approver" : acc.role === "Finance Admin" ? "Finance" : "Employee"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </form>
              )}

            </div>
          </div>

        </div>
      </div>
      
    </main>
  );
}
