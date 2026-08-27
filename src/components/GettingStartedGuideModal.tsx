import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Sparkles,
  User,
  Users,
  ShieldAlert,
  Share2,
  Trophy,
  Target,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Eye,
  Focus,
  Maximize2,
  Minimize2,
  Calendar,
  TrendingUp,
  PlusCircle,
  BarChart2,
  Compass,
  SlidersHorizontal,
  MessageSquareCode,
  Flame,
} from "lucide-react";

interface GettingStartedGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchTab?: (tab: string) => void;
  onOpenLogModal?: () => void;
  onOpenTiltGuardModal?: () => void;
  onOpenFlexModal?: () => void;
}

interface TargetElementInfo {
  id: string;
  name: string;
  description: string;
  tab?: string;
  viewMode?: "personal" | "group";
}

interface GuideStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  neonColor: string;
  bgGradient: string;
  features: string[];
  primaryTargetId: string;
  subTargets: TargetElementInfo[];
  actionLabel?: string;
  actionHandler?: () => void;
  tabTarget?: string;
  viewModeTarget?: "personal" | "group";
}

export default function GettingStartedGuideModal({
  isOpen,
  onClose,
  onSwitchTab,
  onOpenLogModal,
  onOpenTiltGuardModal,
  onOpenFlexModal,
}: GettingStartedGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpotlightMode, setIsSpotlightMode] = useState(false);
  const [activeTargetId, setActiveTargetId] = useState<string>("");
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const steps: GuideStep[] = [
    {
      id: "welcome",
      badge: "Step 1 of 6 • Welcome & Navigation",
      title: "Trading Desk Workspace & Navigation",
      subtitle: "The real-time accountability & live P&L synchronization platform for prop-firm & retail traders.",
      description:
        "SyncPL brings traders together in synchronized rooms. You can log executions, analyze individual edges, monitor the desk group performance, prevent emotional tilt, and celebrate collective streaks.",
      icon: <Sparkles className="w-8 h-8 text-amber-400" />,
      accentColor: "border-amber-500/40 text-amber-400",
      neonColor: "#f59e0b",
      bgGradient: "from-amber-500/10 via-[#16181C] to-[#0E1013]",
      primaryTargetId: "dashboard-header-toolbar",
      subTargets: [
        {
          id: "dashboard-header-toolbar",
          name: "Dashboard Toolbar & Filters",
          description: "Quickly filter by account type (Funded, Live, Eval) or switch personal/desk perspectives.",
          tab: "dashboard",
        },
        {
          id: "btn-dashboard-log-trade",
          name: "Log Trade Action Button",
          description: "One-click popup to record your verified executions, technical setups, and notes.",
          tab: "dashboard",
        },
        {
          id: "room-navigation-sidebar",
          name: "Trading Desk Sidebar",
          description: "Access leaderboards, co-op challenges, payout standings, checklist, and audio/chat channels.",
        },
      ],
      features: [
        "Private Individual Workspace with habit calendars and setup playbooks",
        "Collective Desk Dashboard with live multi-trader balance curves",
        "Desk Tilt Guard with risk contracts and automated loss cooldowns",
        "Clean Flex Card Generator for sharing verified P&L receipts",
      ],
      actionLabel: "Tour Personal Dashboard",
      actionHandler: () => {
        setCurrentStep(1);
      },
    },
    {
      id: "personal_dashboard",
      badge: "Step 2 of 6 • Individual Analytics",
      title: "My Individual Dashboard",
      subtitle: "Your private, focused trading journal and edge analytics.",
      description:
        "Every trade you log calculates your personal Profit Factor, Win Rate, Average Win vs Loss, Best Day, and monthly habit calendar. This data belongs to you and maps your personal progression.",
      icon: <User className="w-8 h-8 text-indigo-400" />,
      accentColor: "border-indigo-500/40 text-indigo-400",
      neonColor: "#6366f1",
      bgGradient: "from-indigo-500/10 via-[#15171C] to-[#0E1013]",
      primaryTargetId: "dashboard-view-mode-toggle",
      tabTarget: "dashboard",
      viewModeTarget: "personal",
      subTargets: [
        {
          id: "dashboard-view-mode-toggle",
          name: "Personal / Desk Mode Switcher",
          description: "Toggle seamlessly between your individual journal and the collective team dashboard.",
          tab: "dashboard",
          viewMode: "personal",
        },
        {
          id: "dashboard-hero-metrics",
          name: "Personal Hero Metric Cards",
          description: "Live calculations for Today's P&L, Win Rate, Profit Factor, and Total Monthly Growth.",
          tab: "dashboard",
          viewMode: "personal",
        },
        {
          id: "dashboard-consistency-calendar",
          name: "My Consistency Heatmap Calendar",
          description: "Visualizes your green and red execution days to build disciplined habits.",
          tab: "dashboard",
          viewMode: "personal",
        },
        {
          id: "dashboard-equity-chart",
          name: "My Cumulative Equity Curve",
          description: "Continuous balance trajectory across all your recorded trades.",
          tab: "dashboard",
          viewMode: "personal",
        },
        {
          id: "dashboard-strategy-playbook",
          name: "My Strategy Playbook",
          description: "Computes win rates and net P&L grouped by technical setup (Breakouts, Scalps, etc.).",
          tab: "dashboard",
          viewMode: "personal",
        },
      ],
      features: [
        "Personal Consistency Calendar showing green and red execution days",
        "Cumulative Balance Growth curve plotting your equity trajectory",
        "Strategy Playbook tracking win rates by technical setup",
        "Filter stats by account type (Funded, Live, Evaluation)",
      ],
      actionLabel: "Next: Desk Group View",
      actionHandler: () => {
        setCurrentStep(2);
      },
    },
    {
      id: "desk_dashboard",
      badge: "Step 3 of 6 • Collective Desk",
      title: "Desk Group Dashboard & Leaderboard",
      subtitle: "Compete, collaborate, and trade together with your desk partners.",
      description:
        "Switch to the Desk Dashboard to see the entire room's combined P&L pool, live multi-trader equity race charts, and real-time partner rankings on the Partner Performance Board.",
      icon: <Users className="w-8 h-8 text-emerald-400" />,
      accentColor: "border-emerald-500/40 text-emerald-400",
      neonColor: "#10b981",
      bgGradient: "from-emerald-500/10 via-[#141A17] to-[#0E1013]",
      primaryTargetId: "group-dashboard-hero-metrics",
      tabTarget: "dashboard",
      viewModeTarget: "group",
      subTargets: [
        {
          id: "group-dashboard-hero-metrics",
          name: "Desk Pool & Active Traders",
          description: "Combined room pool P&L, room win rate, and total active traders today.",
          tab: "dashboard",
          viewMode: "group",
        },
        {
          id: "group-dashboard-consistency-calendar",
          name: "Desk Consistency Calendar",
          description: "Visualizes the aggregate team net P&L for every trading day of the month.",
          tab: "dashboard",
          viewMode: "group",
        },
        {
          id: "group-dashboard-race-chart",
          name: "Multi-Trader Performance Race",
          description: "Live cumulative equity comparison across all desk members simultaneously.",
          tab: "dashboard",
          viewMode: "group",
        },
        {
          id: "group-dashboard-roster",
          name: "Desk Contribution Roster",
          description: "Ranked breakdown of desk member contributions with direct link to the full leaderboard.",
          tab: "dashboard",
          viewMode: "group",
        },
      ],
      features: [
        "Combined Desk Today's P&L pool and active trader count",
        "Multi-Trader Cumulative Curve plotting everyone's trajectory simultaneously",
        "Partner Performance Board ranked daily, weekly, monthly, and all-time",
        "Top 3 Podium showcasing 🥇 Gold, 🥈 Silver, and 🥉 Bronze performers",
      ],
      actionLabel: "Next: Risk & Tilt Guard",
      actionHandler: () => {
        setCurrentStep(3);
      },
    },
    {
      id: "tilt_guard",
      badge: "Step 4 of 6 • Risk Management",
      title: "Desk Tilt Guard & Max Loss Lockout",
      subtitle: "Stop revenge trading and protect your funded combine accounts.",
      description:
        "Set your daily max loss ceiling and consecutive loss limit. If breached, Tilt Guard automatically activates an acoustic warning and triggers a 15-minute cooler timeout to preserve your capital.",
      icon: <ShieldAlert className="w-8 h-8 text-rose-400" />,
      accentColor: "border-rose-500/40 text-rose-400",
      neonColor: "#f43f5e",
      bgGradient: "from-rose-500/10 via-[#1A1416] to-[#0E1013]",
      primaryTargetId: "btn-dashboard-tilt-guard",
      subTargets: [
        {
          id: "btn-dashboard-tilt-guard",
          name: "Desk Tilt Guard Shield Button",
          description: "Launch the risk configuration modal to establish strict loss ceilings and acoustic warnings.",
          tab: "dashboard",
        },
      ],
      features: [
        "Custom Max Daily Loss threshold tailored to your account rules",
        "Consecutive red-trade streak counter with automatic cooldown alerts",
        "Built-in acoustic alarm audio testing for high-urgency alerts",
        "Promotes disciplined execution over emotional impulse",
      ],
      actionLabel: "Configure Tilt Guard",
      actionHandler: () => {
        setIsSpotlightMode(false);
        onClose();
        onOpenTiltGuardModal?.();
      },
    },
    {
      id: "flex_cards",
      badge: "Step 5 of 6 • Social Receipts",
      title: "Clean Social Flex Cards",
      subtitle: "Generate crisp, watermark-verified P&L graphics in 1 click.",
      description:
        "Turn winning setups and green day milestones into high-resolution (1200×675) graphics formatted for Twitter/X, Discord, and Instagram with customizable dark aesthetic themes.",
      icon: <Share2 className="w-8 h-8 text-indigo-400" />,
      accentColor: "border-indigo-500/40 text-indigo-400",
      neonColor: "#6366f1",
      bgGradient: "from-indigo-500/10 via-[#161720] to-[#0E1013]",
      primaryTargetId: "btn-dashboard-flex",
      subTargets: [
        {
          id: "btn-dashboard-flex",
          name: "Flex Card Generator Button",
          description: "Generate high-resolution social flex cards with verified room watermarks in 1 click.",
          tab: "dashboard",
        },
      ],
      features: [
        "4 Aesthetic Themes: Cyber Obsidian, Emerald Alpha, Gold Combine, Midnight Gradient",
        "Room verification watermark stamp for authentic accountability",
        "1-Click PNG Download & instant clipboard markdown copy for Discord",
        "Hide or reveal dollar amounts and R-multiples as preferred",
      ],
      actionLabel: "Create a Flex Card",
      actionHandler: () => {
        setIsSpotlightMode(false);
        onClose();
        onOpenFlexModal?.();
      },
    },
    {
      id: "challenges_milestones",
      badge: "Step 6 of 6 • Co-Op Challenges",
      title: "Co-Op Desk Milestones & Channels",
      subtitle: "Level up with team goals, win-streak badges, and voice chat.",
      description:
        "Work towards collective room targets (e.g. $5,000 Combined Daily P&L) and unlock streak bounties (🔥 3-Streak, ⚡ 5-Streak Sniper, 👑 10-Streak Legend) on the live room roster.",
      icon: <Target className="w-8 h-8 text-amber-400" />,
      accentColor: "border-amber-500/40 text-amber-400",
      neonColor: "#f59e0b",
      bgGradient: "from-amber-500/10 via-[#1A1815] to-[#0E1013]",
      primaryTargetId: "nav-challenges",
      tabTarget: "challenges",
      subTargets: [
        {
          id: "nav-challenges",
          name: "Co-Op Desk Goals & Streaks",
          description: "Collective room P&L milestones and consecutive win streak badges.",
          tab: "challenges",
        },
        {
          id: "channels-section",
          name: "Text & Voice Trading Channels",
          description: "Live voice chat, screen sharing, setup callouts, and trading discussions.",
        },
        {
          id: "user-profile-bar",
          name: "Trader Status & Audio Bar",
          description: "Manage your mic, deafen status, avatar, and active trading presence.",
        },
      ],
      features: [
        "Live Room Milestone Progress bar with collective target tracking",
        "Win-Streak Bounty tiers unlocking prestige badges in room chat",
        "Accountability checklist to verify entry rules before taking trades",
        "Voice chat channels and real-time screen sharing during live market sessions",
      ],
      actionLabel: "Finish Guide & Trade",
      actionHandler: () => {
        setIsSpotlightMode(false);
        onClose();
      },
    },
  ];

  const activeStepData = steps[currentStep];

  // Helper to update target highlight bounding rect
  const updateHighlightTarget = useCallback((targetId: string) => {
    setActiveTargetId(targetId);
    const element = document.getElementById(targetId);
    if (element) {
      // Smoothly scroll into view if needed
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
    } else {
      setHighlightRect(null);
    }
  }, []);

  // Sync target when step or spotlight mode changes
  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (step.tabTarget && onSwitchTab) {
      onSwitchTab(step.tabTarget);
    }

    // Auto-click viewMode button in Dashboard if requested
    if (step.viewModeTarget) {
      const modeBtn =
        step.viewModeTarget === "personal"
          ? (document.getElementById("btn-dashboard-mode-personal") as HTMLButtonElement | null)
          : (document.getElementById("btn-dashboard-mode-group") as HTMLButtonElement | null);
      if (modeBtn) {
        modeBtn.click();
      }
    }

    const defaultTarget = step.subTargets[0]?.id || step.primaryTargetId;
    const timer = setTimeout(() => {
      updateHighlightTarget(defaultTarget);
    }, 150);

    return () => clearTimeout(timer);
  }, [currentStep, isOpen, isSpotlightMode, onSwitchTab, updateHighlightTarget]);

  // Recalculate bounding rect on window resize/scroll
  useEffect(() => {
    if (!isSpotlightMode || !activeTargetId) return;

    const handleRecalc = () => {
      const el = document.getElementById(activeTargetId);
      if (el) {
        setHighlightRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", handleRecalc);
    window.addEventListener("scroll", handleRecalc, true);
    return () => {
      window.removeEventListener("resize", handleRecalc);
      window.removeEventListener("scroll", handleRecalc, true);
    };
  }, [isSpotlightMode, activeTargetId]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSpotlightMode(false);
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepAction = () => {
    if (activeStepData.actionHandler) {
      activeStepData.actionHandler();
    } else if (activeStepData.tabTarget && onSwitchTab) {
      onSwitchTab(activeStepData.tabTarget);
      setIsSpotlightMode(false);
      onClose();
    } else {
      handleNext();
    }
  };

  const handleSelectSubTarget = (t: TargetElementInfo) => {
    if (t.tab && onSwitchTab) {
      onSwitchTab(t.tab);
    }
    if (t.viewMode) {
      const modeBtn =
        t.viewMode === "personal"
          ? (document.getElementById("btn-dashboard-mode-personal") as HTMLButtonElement | null)
          : (document.getElementById("btn-dashboard-mode-group") as HTMLButtonElement | null);
      if (modeBtn) {
        modeBtn.click();
      }
    }
    setTimeout(() => {
      updateHighlightTarget(t.id);
    }, 100);
  };

  const startSpotlightMode = (targetId?: string) => {
    setIsSpotlightMode(true);
    if (targetId) {
      updateHighlightTarget(targetId);
    } else {
      updateHighlightTarget(activeStepData.subTargets[0]?.id || activeStepData.primaryTargetId);
    }
  };

  // ---------------------------------------------------------------------------
  // 🌟 SPOTLIGHT WALKTHROUGH MODE RENDER (Interactive Live Overlay)
  // ---------------------------------------------------------------------------
  if (isSpotlightMode) {
    const activeSubTarget = activeStepData.subTargets.find((s) => s.id === activeTargetId);

    return (
      <div id="getting-started-spotlight-overlay" className="fixed inset-0 z-50 pointer-events-none select-none">
        {/* Animated Spotlight Target Box with Pulsing Neon Beacon */}
        {highlightRect && (
          <div
            className="absolute transition-all duration-300 pointer-events-auto"
            style={{
              top: Math.max(0, highlightRect.top - 8),
              left: Math.max(0, highlightRect.left - 8),
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              borderRadius: "16px",
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 25px ${activeStepData.neonColor}, 0 0 50px ${activeStepData.neonColor}66`,
              border: `2px solid ${activeStepData.neonColor}`,
            }}
          >
            {/* Target Floating Pointer Badge */}
            <div
              className="absolute -top-10 left-3 flex items-center gap-1.5 px-3 py-1 bg-[#111317] border rounded-full shadow-2xl text-[11px] font-black text-white whitespace-nowrap animate-bounce"
              style={{ borderColor: activeStepData.neonColor }}
            >
              <Focus className="w-3.5 h-3.5" style={{ color: activeStepData.neonColor }} />
              <span>{activeSubTarget?.name || "Featured UI Component"}</span>
            </div>

            {/* Glowing Corner Accents */}
            <span
              className="absolute -top-1 -left-1 w-3 h-3 rounded-tl border-t-2 border-l-2"
              style={{ borderColor: activeStepData.neonColor }}
            />
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-tr border-t-2 border-r-2"
              style={{ borderColor: activeStepData.neonColor }}
            />
            <span
              className="absolute -bottom-1 -left-1 w-3 h-3 rounded-bl border-b-2 border-l-2"
              style={{ borderColor: activeStepData.neonColor }}
            />
            <span
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-br border-b-2 border-r-2"
              style={{ borderColor: activeStepData.neonColor }}
            />
          </div>
        )}

        {/* Floating Docked Walkthrough Card */}
        <div
          id="spotlight-walkthrough-card"
          className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] bg-[#111317]/95 border border-[#2E333C] rounded-2xl shadow-2xl backdrop-blur-xl p-5 pointer-events-auto flex flex-col gap-3.5 animate-scale-up"
          style={{ boxShadow: `0 20px 40px -15px ${activeStepData.neonColor}33` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: activeStepData.neonColor }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                {activeStepData.badge}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsSpotlightMode(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold transition cursor-pointer"
                title="Expand to Full Modal"
              >
                <Maximize2 className="w-3 h-3 text-indigo-400" />
                <span>Full Guide</span>
              </button>
              <button
                onClick={() => {
                  setIsSpotlightMode(false);
                  onClose();
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                title="Exit Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>{activeStepData.title}</span>
            </h3>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              {activeSubTarget ? activeSubTarget.description : activeStepData.subtitle}
            </p>
          </div>

          {/* Sub-Target Highlight Selector Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Inspect Specific Components:</span>
              <span className="text-indigo-400">{activeStepData.subTargets.length} Elements</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeStepData.subTargets.map((t) => {
                const isSelected = t.id === activeTargetId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectSubTarget(t)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border border-indigo-400"
                        : "bg-[#1B1E24] hover:bg-[#252A33] text-gray-300 border border-[#2B303A]"
                    }`}
                  >
                    <Focus className={`w-3 h-3 ${isSelected ? "text-white" : "text-indigo-400"}`} />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[#22262E] gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`p-2 rounded-xl border border-[#2B303A] text-xs font-bold transition cursor-pointer ${
                  currentStep === 0 ? "opacity-30 cursor-not-allowed text-gray-600" : "bg-[#181B20] text-gray-300 hover:bg-[#222730]"
                }`}
                title="Previous Step"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-gray-400 px-1">
                {currentStep + 1} / {steps.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
                className={`p-2 rounded-xl border border-[#2B303A] text-xs font-bold transition cursor-pointer ${
                  currentStep === steps.length - 1 ? "opacity-30 cursor-not-allowed text-gray-600" : "bg-[#181B20] text-gray-300 hover:bg-[#222730]"
                }`}
                title="Next Step"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {activeStepData.actionLabel && (
                <button
                  onClick={handleStepAction}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{activeStepData.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === steps.length - 1 && (
                <button
                  onClick={() => {
                    setIsSpotlightMode(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 📋 STANDARD FULL MODAL VIEW (With Interactive Spotlight Launchers)
  // ---------------------------------------------------------------------------
  return (
    <div
      id="modal-getting-started-guide"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#111317] border border-[#2E333C] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22262E] bg-[#15181E]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>SyncPL Quick Start Guide</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  v1.0.21
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">Master the core trading desk workflow in 2 minutes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Spotlight Mode Trigger in Header */}
            <button
              onClick={() => startSpotlightMode()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              title="Highlight this part directly on your screen"
            >
              <Focus className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Live Screen Spotlight</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Progress Dots */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-1.5 bg-[#0D0F12]">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className="flex-1 group py-1 flex flex-col items-center gap-1 cursor-pointer transition"
            >
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "bg-indigo-500 shadow-sm shadow-indigo-500/50"
                    : idx < currentStep
                    ? "bg-emerald-500/60"
                    : "bg-[#22262C]"
                }`}
              />
              <span
                className={`text-[9px] font-bold tracking-wider hidden sm:block ${
                  idx === currentStep ? "text-indigo-400" : "text-gray-600 group-hover:text-gray-400"
                }`}
              >
                0{idx + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Main Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-gradient-to-b from-[#111317] to-[#0B0C0E]">
          {/* Card Hero */}
          <div
            className={`p-5 rounded-2xl border ${activeStepData.accentColor} bg-gradient-to-br ${activeStepData.bgGradient} relative shadow-lg`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                  {activeStepData.badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeStepData.title}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-gray-300 mt-1">
                  {activeStepData.subtitle}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#090A0C]/60 border border-white/10 shrink-0 shadow-inner">
                {activeStepData.icon}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-300 mt-3 leading-relaxed">
              {activeStepData.description}
            </p>
          </div>

          {/* Interactive Screen Target Chips */}
          <div className="p-4 rounded-2xl bg-[#14171D] border border-[#272B36] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Focus className="w-3.5 h-3.5" />
                <span>Interactive Visual Highlights (Click to Point on Screen)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-bold">100% Clear View</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeStepData.subTargets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.tab && onSwitchTab) onSwitchTab(t.tab);
                    if (t.viewMode) {
                      const modeBtn =
                        t.viewMode === "personal"
                          ? (document.getElementById("btn-dashboard-mode-personal") as HTMLButtonElement | null)
                          : (document.getElementById("btn-dashboard-mode-group") as HTMLButtonElement | null);
                      if (modeBtn) modeBtn.click();
                    }
                    startSpotlightMode(t.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-indigo-600 hover:text-white text-gray-200 border border-[#2D3340] hover:border-indigo-400 text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-sm group"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Key Capabilities Bullet Points */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block px-1">
              Key Capabilities & Best Practices
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeStepData.features.map((feat, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#15181E] border border-[#242831] flex items-start gap-2.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-gray-300 leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-6 py-4 border-t border-[#22262E] bg-[#15181E] flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentStep === 0
                ? "opacity-30 cursor-not-allowed text-gray-600"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Live Spotlight Trigger */}
            <button
              onClick={() => startSpotlightMode()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#22262E] hover:bg-[#2C323B] text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Focus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Show On Live Screen</span>
            </button>

            {/* Quick Action Trigger Button for the active step */}
            {activeStepData.actionLabel && (
              <button
                onClick={handleStepAction}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <span>{activeStepData.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {currentStep < steps.length - 1 && (
              <button
                onClick={handleNext}
                className="px-3.5 py-2 bg-[#22262E] hover:bg-[#2C323B] text-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Next
              </button>
            )}

            {currentStep === steps.length - 1 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                Finish & Trade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
