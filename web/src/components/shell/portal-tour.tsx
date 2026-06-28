"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { X, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: "right" | "left" | "bottom";
}

const TOUR_CONFIGS: Record<string, Record<string, TourStep[]>> = {
  "Employee": {
    "/dashboard": [
      { targetId: "onboarding-role-switcher", title: "Demo Sandbox Roles", content: "Switch between Employee, Manager, and Finance Admin roles here to inspect different clearance levels.", position: "right" },
      { targetId: "onboarding-nav-links", title: "Workspace Navigation", content: "Cycle through ledger records, approvals checklists, Citibank FAST payouts, and secure audit trails.", position: "right" },
      { targetId: "onboarding-new-claim", title: "File Claims Instantly", content: "Click this button or press 'N' on your keyboard to launch the cockpit and pre-fill receipt scans.", position: "left" },
      { targetId: "onboarding-command-search", title: "Command Console", content: "Press ⌘K / Ctrl+K to open the Command Palette. Instantly trigger actions, swap roles, or search directories.", position: "bottom" }
    ],
    "/claims": [
      { targetId: "claims-ledger-table", title: "Claims History", content: "This is your personal expense ledger. Track active reimbursement routes, review audit alerts, and verify transaction attachment statuses.", position: "bottom" }
    ],
    "/reports": [
      { targetId: "reports-analytics-charts", title: "Personal Spend Insights", content: "Explore monthly analytics. Review compliance audit spreads and spend breakdowns grouped by department policies.", position: "bottom" }
    ]
  },
  "Approving Officer": {
    "/dashboard": [
      { targetId: "onboarding-nav-approvals", title: "Approvals Inbox", content: "Access pending team claims needing your endorsement here.", position: "right" }
    ],
    "/approvals": [
      { targetId: "approvals-pending-table", title: "Action Items Queue", content: "Verify and approve team expense requests. Policy compliance triggers (like S$80 meals caps) are flagged automatically.", position: "bottom" }
    ],
    "/reports": [
      { targetId: "reports-analytics-charts", title: "Manager Spend Insights", content: "Review manager analytics, department budget limits, average claim sizes, and policy caps deviations.", position: "bottom" }
    ]
  },
  "Finance Admin": {
    "/dashboard": [
      { targetId: "onboarding-nav-payouts", title: "FAST Payout Gateway", content: "Disburse approved funds directly to employee bank routes using Citibank FAST node connections.", position: "right" },
      { targetId: "onboarding-nav-audit", title: "Cryptographic Audit Ledger", content: "Inspect block hash logs to verify the database ledger state is tamper-proof.", position: "right" }
    ],
    "/payouts": [
      { targetId: "payouts-gateway-control", title: "FAST Payout Gateway", content: "Select approved claims and click 'Disburse FAST' to execute bulk payments. Cryptographic ledger block signatures are signed automatically.", position: "bottom" },
      { targetId: "onboarding-nav-audit", title: "Audit Trail Ledger", content: "Navigate to the Audit Trail tab to verify the blockchain block validity logs.", position: "right" }
    ],
    "/audit": [
      { targetId: "audit-blockchain-chain", title: "Tamper-Proof Audit Trail", content: "Verify blockchain hash integrity. Each transaction block validates the receipt signature and logs database state.", position: "bottom" }
    ],
    "/reports": [
      { targetId: "reports-analytics-charts", title: "Treasury Analytics", content: "Inspect corporate budget compliance, tax deductions, and policy limits statistics.", position: "bottom" }
    ]
  }
};

export function PortalTour() {
  const pathname = usePathname();
  const { user } = useSession();
  const [active, setActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const activeRole = user?.role || "Employee";
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;
  const steps = TOUR_CONFIGS[activeRole]?.[normalizedPath] || [];

  // Check completion whenever the page path or role switches
  useEffect(() => {
    if (typeof window !== "undefined" && steps.length > 0) {
      const completedKey = `claimflow-tour-completed-${activeRole}-${normalizedPath}`;
      const completed = localStorage.getItem(completedKey);
      if (!completed) {
        // Reset steps and start
        setTimeout(() => {
          setCurrentStepIdx(0);
        }, 0);
        const timer = setTimeout(() => {
          setActive(true);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => {
          setActive(false);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setActive(false);
      }, 0);
    }
  }, [pathname, activeRole, steps.length]);

  // Track target coordinates
  useEffect(() => {
    if (!active || steps.length === 0) return;
    
    const updateTargetRect = () => {
      const step = steps[currentStepIdx];
      if (!step) return;
      const el = document.getElementById(step.targetId);
      if (el) {
        setRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setRect(null);
      }
    };

    updateTargetRect();
    
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect);
    
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
  }, [active, currentStepIdx, steps, pathname]);

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setActive(false);
    const completedKey = `claimflow-tour-completed-${activeRole}-${normalizedPath}`;
    localStorage.setItem(completedKey, "true");
  };

  if (!active || steps.length === 0) return null;

  const step = steps[currentStepIdx];
  if (!step) return null;

  // Position calculations
  const cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 60,
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  if (rect) {
    const spacing = 16;
    const cardWidth = 288;
    const cardHeight = 160;
    let left = 0;
    let top = 0;

    if (step.position === "right") {
      left = rect.right + spacing;
      top = rect.top;
      if (left + cardWidth > window.innerWidth) {
        left = rect.left - cardWidth - spacing;
      }
    } else if (step.position === "left") {
      left = rect.left - cardWidth - spacing;
      top = rect.top;
      if (left < 0) {
        left = rect.right + spacing;
      }
    } else if (step.position === "bottom") {
      left = rect.left + (rect.width - cardWidth) / 2;
      top = rect.bottom + spacing;
      if (top + cardHeight > window.innerHeight) {
        top = rect.top - cardHeight - spacing;
      }
    }

    // Dynamic viewport boundary clamping
    left = Math.max(spacing, Math.min(window.innerWidth - cardWidth - spacing, left));
    top = Math.max(spacing, Math.min(window.innerHeight - cardHeight - spacing, top));

    cardStyle.left = `${left}px`;
    cardStyle.top = `${top}px`;
  } else {
    cardStyle.left = "50%";
    cardStyle.top = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      
      {/* SVG Spotlight Mask Backdrop Overlay */}
      <svg className="fixed inset-0 pointer-events-auto w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 6}
                y={rect.top - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.4)"
          mask="url(#spotlight-mask)"
          className="backdrop-blur-[1.5px] transition-all duration-300 pointer-events-auto"
        />
      </svg>

      {/* Interactive Walkthrough Card */}
      <div 
        style={cardStyle} 
        className="w-72 rounded-[1.25rem] border border-border bg-white dark:bg-zinc-950 p-4 shadow-2xl pointer-events-auto flex flex-col gap-3 animate-scale-in"
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1">
            Step {currentStepIdx + 1} of {steps.length}
          </span>
          <button 
            type="button" 
            onClick={handleSkip}
            className="text-fg-tertiary hover:text-fg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-left font-sans">
          <h3 className="text-xs font-black text-fg tracking-tight">{step.title}</h3>
          <p className="text-[10px] text-fg-secondary font-medium leading-relaxed mt-1">
            {step.content}
          </p>
        </div>

        <div className="flex justify-between items-center pt-1 mt-1 border-t border-border/80">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[9px] font-bold text-fg-tertiary hover:text-fg cursor-pointer uppercase tracking-wider"
          >
            Skip Tour
          </button>
          
          <Button
            size="sm"
            onClick={handleNext}
            className="h-7 text-[9px] font-bold uppercase tracking-wider px-3 rounded-lg flex items-center gap-1 cursor-pointer bg-accent text-accent-fg hover:bg-accent-hover shadow-sm active:scale-95"
          >
            {currentStepIdx === steps.length - 1 ? (
              <>
                Finish <Check className="h-3 w-3" />
              </>
            ) : (
              <>
                Next <ChevronRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
