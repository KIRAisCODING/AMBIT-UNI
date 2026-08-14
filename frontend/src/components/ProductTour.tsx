import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Compass } from 'lucide-react';
import { ActiveTab } from '../types';

interface ProductTourProps {
  onboardingCompleted: boolean;
  onUpdateSettings: (updates: { onboardingCompleted: boolean }) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedSubProject: (selection: any | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  beforeStep?: () => void;
}

export default function ProductTour({
  onboardingCompleted,
  onUpdateSettings,
  setActiveTab,
  setSelectedSubProject,
  sidebarOpen,
  setSidebarOpen
}: ProductTourProps) {
  const [step, setStep] = useState<number>(-1); // -1: Welcome modal, 0 to 11: Tour steps, 12: Final modal
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, arrowDir: 'top' });

  // If already onboardingCompleted, don't render anything
  if (onboardingCompleted) {
    return null;
  }

  // Steps definition
  const steps: TourStep[] = [
    {
      title: "Welcome to Ambit",
      description: "Ambit is built around a simple workflow: Capture → Organize → Execute → Review. You don't need to decide where something belongs the moment you think of it.",
      placement: "center"
    },
    {
      title: "Start in the Inbox",
      description: "The Inbox is where thoughts, ideas, and tasks enter Ambit. You don't need to organize them immediately.\n\nCapture first. Organize later.",
      targetSelector: "#tour-inbox-tab",
      placement: "right",
      beforeStep: () => {
        setActiveTab('Inbox');
        setSelectedSubProject(null);
        setSidebarOpen(true);
      }
    },
    {
      title: "Capture anything",
      description: "Use the Inbox composer whenever something enters your head. Don't interrupt your thinking just to organize it.",
      targetSelector: "#tour-capture-composer",
      placement: "top",
      beforeStep: () => {
        setActiveTab('Inbox');
        setSelectedSubProject(null);
      }
    },
    {
      title: "Areas",
      description: "Areas represent ongoing parts of your life or work (e.g. College, Freelance, Personal). Unlike Projects, an Area doesn't have a finish line.",
      targetSelector: "#tour-sidebar-areas",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "Projects",
      description: "Projects are outcomes you're actively trying to complete (e.g. Launch Ambit). A project should have a finish line.",
      targetSelector: document.querySelector('#tour-project-row') ? "#tour-project-row" : "#tour-sidebar-areas",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "SubProjects",
      description: "SubProjects break larger projects into meaningful sections (e.g. Landing Page). They are optional.",
      targetSelector: document.querySelector('#tour-subproject-row') ? "#tour-subproject-row" : "#tour-sidebar-areas",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "Tasks",
      description: "Tasks are concrete actions you can complete. Areas give context. Projects give outcomes. SubProjects organize complexity. Tasks are actions.",
      targetSelector: "#tour-inbox-view",
      placement: "bottom",
      beforeStep: () => {
        setActiveTab('Inbox');
        setSelectedSubProject(null);
      }
    },
    {
      title: "Organize when you're ready",
      description: "\"Assign Now\" means: I know where this belongs. \"Assign Later\" means: I'll organize this when I'm ready. This is one of Ambit's most important concepts.",
      targetSelector: "#tour-assign-controls",
      placement: "top",
      beforeStep: () => {
        setActiveTab('Inbox');
        setSelectedSubProject(null);
      }
    },
    {
      title: "Habits",
      description: "Habits are recurring behaviors you want to track consistently (e.g. study, exercise). Tasks are things you finish. Habits are things you repeat.",
      targetSelector: "#tour-habits-tab",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "Calendar",
      description: "Calendar gives your tasks and scheduled work a time dimension. Use it when a task has a specific date or deadline.",
      targetSelector: "#tour-calendar-tab",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "Analytics",
      description: "Analytics helps you understand what you're actually getting done, showing completed work, daily progress, and activity across areas.",
      targetSelector: "#tour-analytics-tab",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "Settings",
      description: "Manage your theme, username, appearance, and restart this Product Tour here.",
      targetSelector: "#tour-settings-tab",
      placement: "right",
      beforeStep: () => {
        setSidebarOpen(true);
      }
    },
    {
      title: "That's Ambit",
      description: "Don't try to organize your entire life upfront. Capture what matters. Organize it when you're ready. Then execute.\n\nCAPTURE → INBOX → ORGANIZE → AREA → PROJECT → SUBPROJECT → TASK → EXECUTE → REVIEW\n\nHelp shape Ambit: Once you've used Ambit for a while, you can send feedback from Settings.",
      placement: "center"
    }
  ];

  // Start tour handler
  const handleStart = () => {
    setStep(1);
  };

  // Close tour handler
  const handleDismiss = () => {
    onUpdateSettings({ onboardingCompleted: true });
  };

  // Step transitions
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      setStep(-1);
    }
  };

  // Position recalculation logic
  const updateBounds = () => {
    if (step < 0 || step >= steps.length) {
      setTargetRect(null);
      return;
    }
    const currentStep = steps[step];
    if (currentStep.targetSelector) {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        return;
      }
    }
    setTargetRect(null);
  };

  // Sync side effects
  useEffect(() => {
    // Determine welcome step vs tour step
    if (step === -1) {
      setTargetRect(null);
      return;
    }

    const currentStep = steps[step];
    if (currentStep && currentStep.beforeStep) {
      currentStep.beforeStep();
    }

    // Wait for layout updates
    const timer = setTimeout(() => {
      updateBounds();
    }, 200);

    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
    };
  }, [step]);

  // Calculate tooltip placement dynamically
  useEffect(() => {
    if (step === -1 || step === steps.length - 1 || !targetRect) {
      return;
    }

    const currentStep = steps[step];
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const tooltipWidth = tooltip.offsetWidth || 320;
    const tooltipHeight = tooltip.offsetHeight || 180;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let arrowDir = 'top';

    const placement = currentStep.placement || 'bottom';

    if (placement === 'bottom') {
      top = targetRect.bottom + 16;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      arrowDir = 'top';
    } else if (placement === 'top') {
      top = targetRect.top - tooltipHeight - 16;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      arrowDir = 'bottom';
    } else if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + 16;
      arrowDir = 'left';
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - 16;
      arrowDir = 'right';
    }

    // Clamping to stay inside viewport boundaries
    const padding = 16;
    if (left < padding) left = padding;
    if (left + tooltipWidth > windowWidth - padding) {
      left = windowWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > windowHeight - padding) {
      top = windowHeight - tooltipHeight - padding;
    }

    setTooltipPos({ top, left, arrowDir });
  }, [targetRect, step]);

  // Keyboard accessibility listeners (Escape to skip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Welcome Step (-1) Modal Card
  if (step === -1) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Blurred Dim Backdrop */}
        <div 
          onClick={handleDismiss}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        />

        {/* Modal Card */}
        <div className="relative bg-surface dark:bg-zinc-950 max-w-md w-full rounded-[32px] p-8 border border-border/80 shadow-2xl flex flex-col items-center text-center animate-scale-in z-10">
          <div className="w-14 h-14 bg-pill-active text-pill-active-text rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <Compass size={28} className="animate-spin-slow" />
          </div>

          <h2 className="text-2xl font-headline font-bold text-textPrimary mb-3 tracking-tight">
            Welcome to Ambit
          </h2>
          
          <p className="text-sm text-textSecondary leading-relaxed mb-6">
            Your personal workspace for capturing thoughts, organizing complexity, and tracking execution.
          </p>

          <div className="bg-surfaceSecondary dark:bg-zinc-900 border border-border w-full py-4.5 px-6 rounded-2xl mb-8 flex flex-col items-center shadow-inner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-textSecondary/75 mb-1.5 font-mono">
              Core Workflow Principle
            </span>
            <span className="text-base font-bold text-accent font-headline tracking-tight">
              Capture first. Organize later.
            </span>
          </div>

          <div className="flex flex-col w-full gap-2.5">
            <button
              onClick={handleStart}
              className="w-full bg-pill-active text-pill-active-text hover:opacity-95 px-5 py-3.5 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Start Product Tour</span>
              <ArrowRight size={16} />
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary py-3 rounded-full text-xs font-semibold transition-all cursor-pointer"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Final Workflow Step (12) Modal Card
  if (step === steps.length - 1) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Dim Backdrop */}
        <div 
          onClick={handleDismiss}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        />

        {/* Modal Card */}
        <div className="relative bg-surface dark:bg-zinc-950 max-w-lg w-full rounded-[32px] p-8 border border-border/80 shadow-2xl flex flex-col items-center text-center animate-scale-in z-10">
          <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Check size={28} />
          </div>

          <h2 className="text-2xl font-headline font-bold text-textPrimary mb-3 tracking-tight">
            That's Ambit
          </h2>

          <p className="text-sm text-textSecondary leading-relaxed mb-6 max-w-sm">
            Don't try to organize everything upfront. Keep your thinking low friction.
          </p>

          {/* Workflow flowchart */}
          <div className="w-full bg-surfaceSecondary dark:bg-zinc-900 border border-border/60 p-5 rounded-2xl mb-8 flex flex-col gap-2 shadow-inner text-xs font-bold tracking-tight">
            <div className="flex items-center justify-center gap-1 flex-wrap">
              <span className="bg-pill px-2.5 py-1.5 rounded-full text-textSecondary border border-border">CAPTURE</span>
              <span className="text-textSecondary/50 font-mono">→</span>
              <span className="bg-pill px-2.5 py-1.5 rounded-full text-textSecondary border border-border">INBOX</span>
              <span className="text-textSecondary/50 font-mono">→</span>
              <span className="bg-pill-active text-pill-active-text px-2.5 py-1.5 rounded-full border border-border">ORGANIZE</span>
            </div>
            
            <div className="text-textSecondary/40 text-[9px] font-mono select-none">↓</div>

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="bg-surface border border-border px-2.5 py-1 rounded-xl text-[10px] text-textPrimary">AREA</span>
              <span className="text-textSecondary/40 font-mono">/</span>
              <span className="bg-surface border border-border px-2.5 py-1 rounded-xl text-[10px] text-textPrimary">PROJECT</span>
              <span className="text-textSecondary/40 font-mono">/</span>
              <span className="bg-surface border border-border px-2.5 py-1 rounded-xl text-[10px] text-textPrimary">SUBPROJECT</span>
            </div>

            <div className="text-textSecondary/40 text-[9px] font-mono select-none">↓</div>

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="bg-pill-active text-pill-active-text px-2.5 py-1.5 rounded-full border border-border">EXECUTE TASKS</span>
              <span className="text-textSecondary/50 font-mono">&</span>
              <span className="bg-pill-active text-pill-active-text px-2.5 py-1.5 rounded-full border border-border">TRACK HABITS</span>
            </div>
          </div>

          <div className="flex flex-col w-full gap-2">
            <button
              onClick={handleDismiss}
              className="w-full bg-pill-active text-pill-active-text hover:opacity-95 px-5 py-3.5 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Start using Ambit</span>
            </button>
            <button
              onClick={handleBack}
              className="w-full text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary py-3 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Spotlight Step View
  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed spotlight layer using Box Shadow */}
      {targetRect && (
        <div
          className="absolute border-2 border-yellow-400 dark:border-yellow-500 rounded-xl transition-all duration-200 pointer-events-none z-50 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Screen Backdrop layer (only when element is not found/available, e.g. layout transition delay) */}
      {!targetRect && (
        <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
      )}

      {/* Interactive Tooltip Card Container */}
      <div
        ref={tooltipRef}
        className="absolute bg-surface dark:bg-zinc-950 border border-border/80 p-5 rounded-2xl shadow-2xl w-[320px] pointer-events-auto animate-scale-in z-50 flex flex-col"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-accent font-mono tracking-wider">
            {step} / {steps.length - 2}
          </span>
          <button
            onClick={handleDismiss}
            className="text-textSecondary hover:text-textPrimary p-0.5 rounded-full hover:bg-surfaceSecondary transition-colors"
            title="Skip Tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-textPrimary mb-1.5 font-headline">
          {currentStep.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-textSecondary leading-relaxed flex-grow whitespace-pre-line mb-4 font-medium">
          {currentStep.description}
        </p>

        {/* Navigation Action Buttons Row */}
        <div className="flex items-center justify-between mt-auto border-t border-border pt-3">
          <button
            onClick={handleDismiss}
            className="text-[11px] font-semibold text-textSecondary hover:text-textPrimary hover:underline cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-surfaceSecondary rounded-lg text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
              title="Previous Step"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="bg-pill-active text-pill-active-text hover:opacity-90 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
