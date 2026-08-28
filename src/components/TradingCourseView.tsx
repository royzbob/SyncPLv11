import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Award,
  Shield,
  Zap,
  Target,
  DollarSign,
  Flame,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Play,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Sliders,
  HelpCircle,
  Trophy,
  Star,
  Compass,
  Lock,
  Unlock,
  Share2,
  FlaskConical,
  Percent,
  Clock,
  BarChart2,
  Layers,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { formatCurrency } from "../utils/helpers";
import { UserProfile, PnlLog } from "../types";

interface TradingCourseProps {
  currentUserId: string;
  userProfile: UserProfile | null;
  onOpenLogModal?: () => void;
  onOpenTiltGuardModal?: () => void;
  onSwitchTab?: (tab: string) => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export interface LessonQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  badge: string;
  summary: string;
  takeaways: string[];
  contentSections: {
    heading: string;
    body: string[];
    proTip?: string;
    visualSnippet?: {
      type: "formula" | "comparison" | "rules" | "example";
      data: any;
    };
  }[];
  quiz?: LessonQuiz;
}

export interface CourseModule {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  badge: string;
  xpReward: number;
  lessons: CourseLesson[];
}

const COURSE_MODULES: CourseModule[] = [
  {
    id: "mod-1",
    number: 1,
    title: "Market Mechanics & The Trading Landscape",
    subtitle: "Understanding how price moves, choosing your vehicle, and the truth about prop firms.",
    icon: "Compass",
    color: "from-blue-500/20 via-indigo-500/20 to-transparent",
    badge: "Foundation (Zero to Aware)",
    xpReward: 300,
    lessons: [
      {
        id: "l-1-1",
        title: "How Price Actually Moves: Order Flow & Liquidity",
        duration: "5 min",
        badge: "Core Mechanic",
        summary: "Markets are not random lines on a screen. Price moves strictly to find matching buyers and sellers (liquidity).",
        takeaways: [
          "Price moves towards where stop-loss orders and resting liquidity cluster.",
          "Every buyer needs a seller; big institutions hunt pools of orders to fill massive size.",
          "Retail traders lose when they enter where everyone else is panicking.",
        ],
        contentSections: [
          {
            heading: "The Auction Market Principle",
            body: [
              "Think of financial markets as a continuous 2-way auction. If aggressive buyers want contracts right now, they hit the 'Ask' price, causing price to tick upwards.",
              "When price breaks above a previous swing high, thousands of breakout traders buy and short-sellers have their stop-losses triggered. Institutional algorithms use this influx of buying to dump their sell orders without slipping the market.",
            ],
            proTip: "Never chase green candles that just broke out of a key level. Wait for the retest or liquidity sweep!",
            visualSnippet: {
              type: "comparison",
              data: {
                title: "Amateur vs Pro Mindset",
                leftTitle: "❌ Amateur Retail View",
                leftItems: ["Sees a big green candle and FOMO buys at the very top", "Thinks the market is 'rigged against them'", "Places stop loss right under obvious swing lows"],
                rightTitle: "✅ Pro Institutional View",
                rightItems: ["Waits for the pullback to test fair value or liquidity pool", "Understands that market makers need counterparties to fill orders", "Places stops with structural invalidation padding"],
              },
            },
          },
          {
            heading: "Bids, Asks & The Spread",
            body: [
              "The Bid is the highest price someone is willing to pay. The Ask is the lowest price someone is willing to sell for.",
              "In liquid instruments like Nasdaq Futures (NQ) or S&P 500 (ES), the spread is just 1 tick (0.25 pts). In illiquid crypto shitcoins or penny stocks, wide spreads will eat your profits immediately.",
            ],
          },
        ],
        quiz: {
          question: "When price aggressively surges above yesterday's high, why does it often reverse immediately?",
          options: [
            "Because the market runs out of battery",
            "Institutions used the retail breakout buyers and triggered stop-losses to sell their large positions",
            "Trading algorithms are forced to shut down at high prices",
            "Price always reverses on round numbers only",
          ],
          correctIndex: 1,
          explanation: "Liquidity Sweeps occur when large players use buy-stop orders above previous highs as exit liquidity to sell short.",
        },
      },
      {
        id: "l-1-2",
        title: "Choosing Your Instrument: Futures vs Crypto vs Forex",
        duration: "6 min",
        badge: "Asset Selection",
        summary: "Pick the single market that fits your schedule, timezone, and capital tolerance.",
        takeaways: [
          "Futures (Micro NQ / MNQ, Micro ES / MES) offer 60/40 tax advantages in the US, zero PDT rule, and pristine volume data.",
          "Crypto (BTC / ETH) offers 24/7 trading but higher volatility and wide weekend spreads.",
          "Stick to ONE single instrument for your first 60 days to master its personality.",
        ],
        contentSections: [
          {
            heading: "Why Index Futures (NQ & ES) Are King for Day Traders",
            body: [
              "Index Futures are standardized contracts on the CME. Unlike stocks, there is no $25,000 Pattern Day Trader (PDT) rule.",
              "With Micro E-mini contracts (MNQ is $2 per point, MES is $5 per point), beginners can practice with tiny dollar risk (e.g. $15–$30 max loss per trade) while developing real muscle memory.",
            ],
            proTip: "If you are brand new, trade Micro contracts (MNQ) instead of full Mini contracts (NQ). 1 Mini point is $20; 1 Micro point is $2.",
          },
        ],
        quiz: {
          question: "Why are Micro Futures (MNQ/MES) ideal for beginner traders over standard E-minis?",
          options: [
            "They trade on weekends only",
            "They allow you to risk $15–$30 per trade to practice execution without blowing your account",
            "They guarantee a 90% win rate",
            "They do not require a stop loss",
          ],
          correctIndex: 1,
          explanation: "Micro contracts scale down the point value (1/10th size), allowing precision risk management for new traders.",
        },
      },
      {
        id: "l-1-3",
        title: "Prop Firm Combines vs Personal Brokerage Accounts",
        duration: "7 min",
        badge: "Capital Scaling",
        summary: "How to use simulated funded accounts to trade $50,000+ buying power with limited downside risk.",
        takeaways: [
          "Prop firms (Topstep, Apex, FundedNext) let you pay a small monthly fee ($30–$150) to take a simulated evaluation.",
          "If you hit the profit target (e.g., $3,000 on a $50k account) without breaking max trailing drawdown, you get funded and keep 80%–90% of payouts.",
          "The biggest trap in prop trading is over-leveraging because 'it's not my real cash'. Treat it like real money.",
        ],
        contentSections: [
          {
            heading: "The Prop Firm Math & Rules",
            body: [
              "A typical $50k evaluation has a $2,500 maximum trailing drawdown and a $3,000 profit target.",
              "If you risk $150 per trade (0.3% of simulated balance), you have 16 consecutive losses before failing. But if you risk $1,000 per trade, 2 bad trades will terminate your combine immediately.",
            ],
            proTip: "Use SyncPL's Account Type tags ('eval', 'funded', 'practice') to track your combine performance separately!",
          },
        ],
        quiz: {
          question: "What is the primary reason most traders fail prop firm combines?",
          options: [
            "The market moves too slowly",
            "They risk too much per trade and violate maximum trailing drawdown within 1–2 days",
            "Prop firms ban profitable traders",
            "The profit targets are mathematically impossible",
          ],
          correctIndex: 1,
          explanation: "Traders fail combines because they trade too large (2-5 contracts) and hit the daily/trailing drawdown limit on a single bad day.",
        },
      },
    ],
  },
  {
    id: "mod-2",
    number: 2,
    title: "High-Win-Rate Entry Models (Your First Edge)",
    subtitle: "Master the Trend Pullback, Fair Value Gaps (FVG), and Key Session Timing.",
    icon: "Target",
    color: "from-emerald-500/20 via-teal-500/20 to-transparent",
    badge: "Technical Edge",
    xpReward: 450,
    lessons: [
      {
        id: "l-2-1",
        title: "The Trend Pullback + Key Level Model",
        duration: "8 min",
        badge: "Bread & Butter",
        summary: "The single highest probability setup for new traders. Never fight the higher timeframe trend.",
        takeaways: [
          "Step 1: Determine trend on the 15-Minute or 1-Hour chart (Making Higher Highs & Higher Lows).",
          "Step 2: Wait for price to pull back to previous resistance turned support or the 20/50 EMA.",
          "Step 3: Enter on the 1-minute confirmation candle with a predefined stop loss below the swing low.",
        ],
        contentSections: [
          {
            heading: "The 3-Step Execution Checklist",
            body: [
              "1. Trend Alignment: If 15m is bullish, you ONLY take LONG setups. Ignore all short signals.",
              "2. Value Zone: Wait patiently as price pulls back into a discount level (50% retracement of the impulsive move).",
              "3. Trigger: Look for a bullish hammer or engulfing candle closing back in the trend direction.",
            ],
            visualSnippet: {
              type: "rules",
              data: {
                title: "Setup Blueprint: The 15m Trend + 1m Trigger",
                steps: [
                  "1. Higher Timeframe (15m): Clear uptrend with series of higher highs.",
                  "2. Key Level: Prior day high, VWAP, or 50% Fib zone marked on chart.",
                  "3. Pullback: Price retraces cleanly with decreasing volume (no violent flash crash).",
                  "4. Trigger: 1m rejection wick at level + candle closes green.",
                  "5. Risk: Stop Loss placed 2 ticks below the rejection wick.",
                  "6. Target: Next liquidity high (minimum 1:2 Risk to Reward).",
                ],
              },
            },
          },
        ],
        quiz: {
          question: "If the 15-minute chart is making strong higher highs and higher lows, what trades should you take?",
          options: [
            "Only SHORT trades to catch the top",
            "Only LONG trades that pull back into key support levels",
            "Both short and long randomly every 2 minutes",
            "Wait for price to fall to zero",
          ],
          correctIndex: 1,
          explanation: "Trading in the direction of the dominant higher timeframe trend drastically increases your win rate and profitability.",
        },
      },
      {
        id: "l-2-2",
        title: "Fair Value Gaps (FVG) & Imbalance Zones Demystified",
        duration: "7 min",
        badge: "Smart Money Concept",
        summary: "Understand price imbalances without the complicated jargon.",
        takeaways: [
          "A Fair Value Gap is a 3-candle pattern where the 1st candle high and 3rd candle low do not overlap.",
          "The middle candle was moved with violent institutional volume, leaving an inefficiency.",
          "Price often returns to fill the FVG like a vacuum before resuming its primary trend.",
        ],
        contentSections: [
          {
            heading: "How to Spot a Valid FVG",
            body: [
              "Candle 1: Normal candle.",
              "Candle 2: Large explosive directional candle.",
              "Candle 3: Normal candle that fails to retrace into Candle 1's wick.",
              "The gap between Candle 1's wick and Candle 3's wick is the Fair Value Gap. Set an alert when price retraces into this box!",
            ],
          },
        ],
        quiz: {
          question: "What creates a Fair Value Gap (FVG)?",
          options: [
            "A slow sideways market with zero volume",
            "A violent, one-sided price displacement across 3 candles leaving an open space between wick 1 and wick 3",
            "A holiday when the exchange is closed",
            "Retail traders placing market orders",
          ],
          correctIndex: 1,
          explanation: "FVGs represent institutional liquidity imbalances where price moved too fast in one direction.",
        },
      },
      {
        id: "l-2-3",
        title: "Session Timing: The 9:30 AM Trap vs 10:00 AM NY Reversal",
        duration: "6 min",
        badge: "Timing & Volatility",
        summary: "When to enter the market and when to sit on your hands.",
        takeaways: [
          "9:30 AM EST (US Market Open) is filled with fakeouts, high slippage, and spread spikes. Beginners should WAIT 15 minutes.",
          "The 9:45 AM – 11:00 AM EST window offers the cleanest trend continuation and structured liquidity runs.",
          "Avoid trading during major red-folder economic releases (CPI, FOMC, NFP) unless you want 50-point slippage.",
        ],
        contentSections: [
          {
            heading: "The Daily Trader Schedule (EST)",
            body: [
              "9:00 - 9:30 AM: Mark Key Levels (Yesterday High/Low, Overnight High/Low, VWAP). Do not enter trades.",
              "9:30 - 9:45 AM: Opening bell chop. Observe which side gets swept first.",
              "9:45 - 11:30 AM: Prime Execution Window. Take your 1 or 2 best A+ setups.",
              "12:00 - 1:30 PM: Lunchtime chop (Low volume, choppy algorithms). Close terminal and walk away.",
            ],
          },
        ],
        quiz: {
          question: "Why should beginner traders avoid pressing buy/sell at 9:30:05 AM immediately at market open?",
          options: [
            "The market is closed",
            "Extreme opening volatility, false breakouts, and wide slippage frequently stop out early retail entries",
            "Brokers charge 10x fees at open",
            "It is illegal to trade in the first minute",
          ],
          correctIndex: 1,
          explanation: "The first 15 minutes of the NY open are notorious for whip-saws and liquidity traps. Waiting for the initial sweep creates high-probability entries.",
        },
      },
    ],
  },
  {
    id: "mod-3",
    number: 3,
    title: "Risk Sizing & The 1:2 R:R Holy Grail",
    subtitle: "The exact mathematical formulas that make you profitable even with a 40% win rate.",
    icon: "Shield",
    color: "from-amber-500/20 via-orange-500/20 to-transparent",
    badge: "Risk & Math",
    xpReward: 500,
    lessons: [
      {
        id: "l-3-1",
        title: "The Math of Asymmetric Risk-to-Reward (1:2 and 1:3)",
        duration: "6 min",
        badge: "Core Profit Formula",
        summary: "You do not need a 90% win rate. You only need to lose small and let winners reach target.",
        takeaways: [
          "With a 1:2 Risk-to-Reward ratio (Risk $50 to make $100), you only need a 34% win rate to break even.",
          "At a 50% win rate with 1:2 R:R, 10 trades = 5 wins ($500) - 5 losses ($250) = +$250 net profit!",
          "Cutting losses quickly is the only secret of million-dollar prop traders.",
        ],
        contentSections: [
          {
            heading: "The 10-Trade Scenario Matrix",
            body: [
              "Let's look at 10 trades risking $50 per trade with a 1:2 R:R target ($100 profit per win):",
              "• 40% Win Rate (4 Wins, 6 Losses): (+4 × $100) - (6 × $50) = +$400 - $300 = +$100 PROFIT.",
              "• 50% Win Rate (5 Wins, 5 Losses): (+5 × $100) - (5 × $50) = +$500 - $250 = +$250 PROFIT.",
              "• 60% Win Rate (6 Wins, 4 Losses): (+6 × $100) - (4 × $50) = +$600 - $200 = +$400 PROFIT.",
            ],
            proTip: "If you take a trade with a 1:0.5 R:R (risking $100 to make $50), you need an 80%+ win rate just to survive fees.",
          },
        ],
        quiz: {
          question: "With a 1:2 Risk-to-Reward ratio (risking $50 to make $100), what happens over 10 trades if you only win 4 out of 10?",
          options: [
            "You lose $200",
            "You break even ($0)",
            "You make +$100 net profit ((4 × $100) - (6 × $50) = $100)",
            "Your account is terminated",
          ],
          correctIndex: 2,
          explanation: "Even with a 40% win rate, positive risk-to-reward guarantees a positive mathematical expectancy!",
        },
      },
      {
        id: "l-3-2",
        title: "Position Sizing & Contract Calculation",
        duration: "7 min",
        badge: "Account Protection",
        summary: "Calculate your exact contract size BEFORE clicking the order button.",
        takeaways: [
          "Formula: Position Size = (Account Balance × Max Risk %) / (Stop Loss Distance in Dollars).",
          "Never risk more than 1% of your account on any single trade.",
          "If your technical stop loss is too wide, reduce contract size; never widen your risk budget.",
        ],
        contentSections: [
          {
            heading: "The Position Size Formula in Action",
            body: [
              "Account Size: $5,000. Max Risk per trade: 1% ($50).",
              "NQ Micro (MNQ): 1 point = $2 per contract. Stop loss distance on chart: 10 points ($20 risk per contract).",
              "Calculation: $50 max risk / $20 risk per contract = 2.5 contracts -> Round DOWN to 2 Micro contracts.",
            ],
          },
        ],
        quiz: {
          question: "If your max loss budget is $100 and your chart setup requires a 10-point stop on MNQ ($20 per contract), how many contracts should you buy?",
          options: [
            "10 contracts",
            "5 contracts ($100 / $20 = 5 contracts)",
            "1 Mini NQ contract ($200 risk)",
            "20 contracts",
          ],
          correctIndex: 1,
          explanation: "$100 max dollar risk divided by $20 risk per contract equals exactly 5 micro contracts.",
        },
      },
    ],
  },
  {
    id: "mod-4",
    number: 4,
    title: "Trading Psychology & Tilt Defense",
    subtitle: "How to stop revenge trading, conquer FOMO, and protect your mental capital.",
    icon: "Flame",
    color: "from-rose-500/20 via-orange-500/20 to-transparent",
    badge: "Discipline & Mindset",
    xpReward: 400,
    lessons: [
      {
        id: "l-4-1",
        title: "The Revenge Trading Loop & Dopamine Traps",
        duration: "6 min",
        badge: "Mental Edge",
        summary: "Understanding why our brains make impulsive decisions after taking a red trade.",
        takeaways: [
          "After a loss, the human brain releases cortisol and treats the market as an enemy to defeat.",
          "Doubling contract size after a loss to 'get back to green' is the #1 cause of blown accounts.",
          "Accepting a small loss as the cost of doing business is what separates professionals from gamblers.",
        ],
        contentSections: [
          {
            heading: "The 3 Stages of Trading Tilt",
            body: [
              "Stage 1: Mild Frustration (You got stopped out by 1 tick and price went to target without you).",
              "Stage 2: Impulsive Re-entry (You enter immediately with no setup to 'catch up').",
              "Stage 3: Full Nuclear Tilt (You 5x your contract size, remove your stop loss, and watch your balance vaporize).",
            ],
            proTip: "Use SyncPL's automated Tilt Guard to enforce cooling-off cooldowns when you take 2 consecutive losses!",
          },
        ],
        quiz: {
          question: "What is the best immediate action to take after taking 2 consecutive losses in a morning session?",
          options: [
            "Double contract size and buy immediately",
            "Close the trading terminal, lock Tilt Guard, step outside, and do not place any more trades for the day",
            "Complain in chat and borrow money",
            "Switch to trading high-risk crypto meme coins",
          ],
          correctIndex: 1,
          explanation: "Professional traders walk away after 2 losses to preserve capital and prevent destructive revenge trading.",
        },
      },
      {
        id: "l-4-2",
        title: "The 2-Loss Daily Max Rule & Lockout Strategy",
        duration: "5 min",
        badge: "Hard Rule",
        summary: "The single rule that guarantees you will never blow a prop account or live balance.",
        takeaways: [
          "Rule: If you lose 2 trades in a single day, your trading day is 100% OVER.",
          "With a 2-loss limit, your worst possible day is losing -2R (e.g. -$100).",
          "You will live to trade tomorrow with a clear head and full buying power.",
        ],
        contentSections: [
          {
            heading: "Why 2 Losses is the Magic Number",
            body: [
              "Market conditions on any given day are either favorable to your setup or choppy. If you lose twice, either the market regime is poor or your focus is off.",
              "By shutting down after 2 losses, you cap your downside to a tiny fraction of your account while keeping unlimited upside on trend days.",
            ],
          },
        ],
        quiz: {
          question: "Why does the '2-Loss Max Rule' protect your trading career?",
          options: [
            "It forces you to pay lower broker commissions only",
            "It mathematically caps your daily drawdown so one bad emotional day cannot destroy weeks of gains",
            "It turns losing trades into winning trades automatically",
            "Brokers disconnect your internet after 2 trades",
          ],
          correctIndex: 1,
          explanation: "A strict 2-loss cap prevents tilt spirals and keeps your account equity intact for high-quality setups.",
        },
      },
    ],
  },
  {
    id: "mod-5",
    number: 5,
    title: "Your First Profit: 7-Day Action Plan & Capstone Drill",
    subtitle: "The step-by-step roadmap from practice sandbox to logging your first verified winning payout.",
    icon: "Trophy",
    color: "from-amber-500/20 via-emerald-500/20 to-transparent",
    badge: "Action Blueprint",
    xpReward: 600,
    lessons: [
      {
        id: "l-5-1",
        title: "The 7-Day Fast-Track Roadmap to First Profit",
        duration: "8 min",
        badge: "Action Plan",
        summary: "Follow this exact daily schedule to build confidence without risking real capital.",
        takeaways: [
          "Day 1–2: Master ONE setup (e.g. 15m Trend Pullback on MNQ).",
          "Day 3–4: Execute 15 Practice Sandbox reps in SyncPL and log journal notes.",
          "Day 5–6: Review your journal win rate, fix execution mistakes, and set your Tilt Guard rules.",
          "Day 7: Execute your first funded combine or live trade with strict 1:2 R:R!",
        ],
        contentSections: [
          {
            heading: "The 7-Day Breakdown",
            body: [
              "Day 1: Setup & Tools. Configure your TradingView or chart layouts with Key Levels (Yesterday High/Low & VWAP).",
              "Day 2: Rule Hardening. Set your daily max loss ($50 on micro or $100 on combine) in SyncPL Checklist.",
              "Day 3-4: The 15-Rep Practice Incubator. Log 15 simulated trades in SyncPL Practice mode. Calculate your net win rate.",
              "Day 5: Journal Audit. Look at your losing trades. Did you chase? Did you enter outside the 9:45–11:00 AM window?",
              "Day 6: Rehearsal Drill. Run the interactive capstone trade simulator below.",
              "Day 7: First Live Execution. Take 1 clean trade with 1 Micro contract. Lock in your profit or take your predefined stop loss.",
            ],
          },
        ],
        quiz: {
          question: "What is the very first thing you should do before taking your first live trade?",
          options: [
            "Max out the leverage on your account",
            "Define your exact stop loss price and maximum dollar risk BEFORE clicking buy or sell",
            "Ask strangers on social media what to buy",
            "Trade without looking at the chart",
          ],
          correctIndex: 1,
          explanation: "Professional risk management requires knowing your exact exit points and dollar risk prior to entering the market.",
        },
      },
    ],
  },
];

export default function TradingCourseView({
  currentUserId,
  userProfile,
  onOpenLogModal,
  onOpenTiltGuardModal,
  onSwitchTab,
  triggerToast,
}: TradingCourseProps) {
  // Storage Key for Course Progress
  const progressStorageKey = `syncpl_course_progress_${currentUserId || "guest"}`;

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(progressStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedModuleId, setSelectedModuleId] = useState<string>("mod-1");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("l-1-1");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  // Interactive Position Size Calculator State
  const [calcAccountSize, setCalcAccountSize] = useState<number>(5000);
  const [calcRiskPct, setCalcRiskPct] = useState<number>(1);
  const [calcStopPoints, setCalcStopPoints] = useState<number>(10);
  const [calcInstrument, setCalcInstrument] = useState<"MNQ" | "MES" | "NQ" | "ES" | "BTC">("MNQ");

  // Interactive Trade Simulator State
  const [simScenario, setSimScenario] = useState<number>(0);
  const [simDirection, setSimDirection] = useState<"long" | "short" | null>(null);
  const [simEntryPrice, setSimEntryPrice] = useState<number>(20500);
  const [simStopLoss, setSimStopLoss] = useState<number>(20480);
  const [simTakeProfit, setSimTakeProfit] = useState<number>(20540);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);

  // Save Progress
  const saveProgress = (newCompleted: string[]) => {
    setCompletedLessonIds(newCompleted);
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(newCompleted));
    } catch (e) {
      console.warn(e);
    }
  };

  const activeModule = useMemo(() => {
    return COURSE_MODULES.find((m) => m.id === selectedModuleId) || COURSE_MODULES[0];
  }, [selectedModuleId]);

  const activeLesson = useMemo(() => {
    for (const mod of COURSE_MODULES) {
      const found = mod.lessons.find((l) => l.id === selectedLessonId);
      if (found) return found;
    }
    return activeModule.lessons[0];
  }, [selectedLessonId, activeModule]);

  // Total Progress Math
  const totalLessonsCount = useMemo(() => {
    return COURSE_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);
  }, []);

  const progressPercent = useMemo(() => {
    if (totalLessonsCount === 0) return 0;
    return Math.min(100, Math.round((completedLessonIds.length / totalLessonsCount) * 100));
  }, [completedLessonIds, totalLessonsCount]);

  const totalEarnedXp = useMemo(() => {
    let xp = 0;
    COURSE_MODULES.forEach((mod) => {
      mod.lessons.forEach((les) => {
        if (completedLessonIds.includes(les.id)) {
          xp += 100;
        }
      });
      // Module completion bonus
      const allDone = mod.lessons.every((l) => completedLessonIds.includes(l.id));
      if (allDone) xp += mod.xpReward;
    });
    return xp;
  }, [completedLessonIds]);

  const isCourseFullyCompleted = progressPercent === 100;

  // Toggle Lesson Completion
  const handleToggleLessonComplete = (lessonId: string) => {
    let next: string[];
    const isDone = completedLessonIds.includes(lessonId);
    if (isDone) {
      next = completedLessonIds.filter((id) => id !== lessonId);
    } else {
      next = [...completedLessonIds, lessonId];
      triggerToast?.(
        "Lesson Completed! 🎉",
        `+100 XP Earned! Keep building your trading edge.`,
        "success"
      );
    }
    saveProgress(next);
  };

  // Next / Previous Navigation
  const allLessonsFlat = useMemo(() => {
    return COURSE_MODULES.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
  }, []);

  const currentIndex = allLessonsFlat.findIndex((l) => l.id === activeLesson.id);
  const prevLesson = currentIndex > 0 ? allLessonsFlat[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessonsFlat.length - 1 ? allLessonsFlat[currentIndex + 1] : null;

  const navigateToLesson = (lessonId: string, moduleId?: string) => {
    setSelectedLessonId(lessonId);
    if (moduleId) {
      setSelectedModuleId(moduleId);
    } else {
      const parentMod = COURSE_MODULES.find((m) => m.lessons.some((l) => l.id === lessonId));
      if (parentMod) setSelectedModuleId(parentMod.id);
    }
  };

  // Quiz Handling
  const handleSelectQuizOption = (lessonId: string, optIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [lessonId]: optIndex }));
    setQuizSubmitted((prev) => ({ ...prev, [lessonId]: false }));
  };

  const handleSubmitQuiz = (lessonId: string) => {
    setQuizSubmitted((prev) => ({ ...prev, [lessonId]: true }));
    const chosen = quizAnswers[lessonId];
    if (activeLesson.quiz && chosen === activeLesson.quiz.correctIndex) {
      if (!completedLessonIds.includes(lessonId)) {
        handleToggleLessonComplete(lessonId);
      }
      triggerToast?.("Quiz Passed! 🎯", "Correct answer! +150 XP bonus unlocked.", "success");
    } else {
      triggerToast?.("Not Quite 💡", "Review the explanation above and try again!", "info");
    }
  };

  // Interactive Calculator Computed Values
  const calcDollarRisk = (calcAccountSize * (calcRiskPct / 100));
  const pointMultiplier = calcInstrument === "MNQ" ? 2 : calcInstrument === "MES" ? 5 : calcInstrument === "NQ" ? 20 : calcInstrument === "ES" ? 50 : 1;
  const dollarRiskPerContract = calcStopPoints * pointMultiplier;
  const maxContracts = dollarRiskPerContract > 0 ? Math.floor(calcDollarRisk / dollarRiskPerContract) : 0;
  const potentialProfitAt2R = calcDollarRisk * 2;
  const potentialProfitAt3R = calcDollarRisk * 3;

  // Simulator Execution
  const runSimulatorTrade = () => {
    if (!simDirection) {
      triggerToast?.("Select Direction", "Choose whether you are going Long (Buy) or Short (Sell).", "info");
      return;
    }

    setIsSimRunning(true);
    setSimResult(null);

    setTimeout(() => {
      setIsSimRunning(false);
      // Simulate market dynamics
      const riskAmount = Math.abs(simEntryPrice - simStopLoss) * 2; // 1 micro contract MNQ
      const rewardAmount = Math.abs(simTakeProfit - simEntryPrice) * 2;
      const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : "1.0";

      // 70% win probability for aligned disciplined setups with positive RR
      const isWinner = parseFloat(rrRatio) >= 1.5 ? Math.random() > 0.35 : Math.random() > 0.65;
      const simulatedPnl = isWinner ? rewardAmount : -riskAmount;

      setSimResult({
        won: isWinner,
        pnl: simulatedPnl,
        rrRatio,
        message: isWinner
          ? `Target hit cleanly! You locked in +${formatCurrency(rewardAmount)} with a solid ${rrRatio}:1 Risk-to-Reward ratio.`
          : `Stopped out at ${formatCurrency(simStopLoss)}. You respected your stop loss and lost only -${formatCurrency(riskAmount)}. Mental capital preserved!`,
      });
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0C0E] text-[#DCDDDE] overflow-hidden select-none">
      {/* Top Banner: Academy Progress & Header */}
      <div className="bg-[#121417] border-b border-[#2A2D31] p-4 sm:p-5 shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>SyncPL Starter Academy</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Zero to First Profit 🚀
                  </span>
                </h1>
              </div>
              <p className="text-xs text-[#8E9297]">
                Actionable fast-track course for next-gen traders. Master setups, 1:2 R:R math, and prop firm discipline.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Total XP Badge */}
            <div className="px-3 py-1.5 bg-[#08090A] border border-amber-500/30 rounded-xl flex items-center gap-2 shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[9px] text-gray-400 font-bold block uppercase leading-none">Trader XP</span>
                <span className="text-xs font-black text-amber-300 font-mono">{totalEarnedXp} XP</span>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="px-3 py-1.5 bg-[#08090A] border border-[#2A2D31] rounded-xl flex items-center gap-2.5 min-w-[140px]">
              <Trophy className="w-4 h-4 text-indigo-400" />
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-300 mb-0.5">
                  <span>Progress</span>
                  <span className="text-indigo-400">{progressPercent}%</span>
                </div>
                <div className="w-full bg-[#1E2023] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Practice Journal Shortcut */}
            <button
              onClick={() => onSwitchTab?.("logs")}
              className="px-3 py-1.5 bg-[#1E2023] hover:bg-[#2A2D31] border border-[#2A2D31] text-xs font-bold text-gray-300 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="View your trade journal"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Journal</span>
            </button>

            {/* Practice Drill Incubator Shortcut */}
            <button
              onClick={() => onSwitchTab?.("challenges")}
              className="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-black text-sky-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Open Co-Op Desk Challenges & Practice Incubator"
            >
              <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
              <span>Sim Incubator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Module Sidebar + Right Lesson Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Course Syllabus & Module Hierarchy */}
        <div className="w-full md:w-80 bg-[#0E1013] border-r border-[#2A2D31] flex flex-col shrink-0 overflow-y-auto max-h-[35vh] md:max-h-full">
          <div className="p-3.5 border-b border-[#2A2D31]/70 bg-[#08090A]/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Course Modules
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {completedLessonIds.length} / {totalLessonsCount} Lessons
            </span>
          </div>

          <div className="p-2.5 space-y-3">
            {COURSE_MODULES.map((mod) => {
              const isModSelected = selectedModuleId === mod.id;
              const completedInMod = mod.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
              const isModFullyCompleted = completedInMod === mod.lessons.length;

              return (
                <div
                  key={mod.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isModSelected
                      ? "bg-[#14171C] border-indigo-500/40 shadow-sm"
                      : "bg-[#101215] border-[#22252A] hover:border-[#2E3238]"
                  }`}
                >
                  {/* Module Accordion Header */}
                  <button
                    onClick={() => {
                      setSelectedModuleId(mod.id);
                      if (!mod.lessons.some((l) => l.id === selectedLessonId)) {
                        setSelectedLessonId(mod.lessons[0].id);
                      }
                    }}
                    className="w-full p-3 text-left flex items-start justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-800 text-gray-300 px-1.5 py-0.2 rounded border border-zinc-700">
                          Module {mod.number}
                        </span>
                        {isModFullyCompleted && (
                          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-emerald-500/20">
                            <Check className="w-2.5 h-2.5" /> Complete
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-black text-white leading-snug truncate">{mod.title}</h3>
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{mod.subtitle}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-gray-400 font-bold block">
                        {completedInMod}/{mod.lessons.length}
                      </span>
                    </div>
                  </button>

                  {/* Lesson List */}
                  {isModSelected && (
                    <div className="px-2 pb-2.5 pt-1 space-y-1 border-t border-[#22252A]/80 bg-[#0A0C0E]/40">
                      {mod.lessons.map((lesson) => {
                        const isLessonSelected = selectedLessonId === lesson.id;
                        const isLessonCompleted = completedLessonIds.includes(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              setSelectedLessonId(lesson.id);
                              setSelectedModuleId(mod.id);
                            }}
                            className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between gap-2 transition cursor-pointer ${
                              isLessonSelected
                                ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-sm"
                                : "text-gray-400 hover:text-white hover:bg-[#16191E]"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLessonComplete(lesson.id);
                                }}
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                  isLessonCompleted
                                    ? "bg-emerald-500 border-emerald-400 text-black font-black"
                                    : "border-zinc-600 hover:border-zinc-400"
                                }`}
                              >
                                {isLessonCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span className="truncate text-[11px] font-medium">{lesson.title}</span>
                            </div>

                            <span className="text-[9px] text-gray-500 font-mono shrink-0">{lesson.duration}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Capstone Certificate Unlock Card */}
            {isCourseFullyCompleted && (
              <div className="p-3.5 rounded-xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-[#121417] border border-amber-500/40 shadow-lg text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-amber-300 font-black text-xs">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>GRADUATION CERTIFICATE UNLOCKED!</span>
                </div>
                <p className="text-[10px] text-gray-300">
                  Congratulations! You've mastered all core modules. You're ready to log your first verified profit.
                </p>
                <button
                  onClick={() => onOpenLogModal?.()}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg shadow cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Log First Trade in Journal</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Panel: Lesson Content & Interactive Widgets */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {/* Active Lesson Header Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#12151A] via-[#101216] to-[#0A0C0E] border border-[#2A2D31] shadow-lg relative overflow-hidden space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                    Module {activeModule.number} • Lesson
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                    {activeLesson.badge}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" /> {activeLesson.duration} read
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
                  {activeLesson.title}
                </h2>
              </div>

              {/* Complete Toggle Button */}
              <button
                onClick={() => handleToggleLessonComplete(activeLesson.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${
                  completedLessonIds.includes(activeLesson.id)
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                }`}
              >
                {completedLessonIds.includes(activeLesson.id) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Completed (+100 XP)</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mark as Completed</span>
                  </>
                )}
              </button>
            </div>

            {/* Core Summary Pill */}
            <div className="p-3 bg-[#08090A]/80 border border-[#22252A] rounded-xl text-xs text-gray-300 leading-relaxed font-medium">
              <span className="font-bold text-amber-400 mr-1.5">⚡ The Big Idea:</span>
              {activeLesson.summary}
            </div>
          </div>

          {/* Key Takeaways Card */}
          <div className="p-4 rounded-xl bg-[#121417] border border-[#2A2D31] space-y-2">
            <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Key Execution Takeaways
            </h3>
            <ul className="space-y-1.5">
              {activeLesson.takeaways.map((takeaway, idx) => (
                <li key={idx} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deep-Dive Content Sections */}
          <div className="space-y-6">
            {activeLesson.contentSections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-3">
                <h3 className="text-base font-black text-white border-l-2 border-indigo-500 pl-3">
                  {sec.heading}
                </h3>
                <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
                  {sec.body.map((paragraph, pIdx) => (
                    <p key={pIdx}>{paragraph}</p>
                  ))}
                </div>

                {sec.proTip && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">PRO TRADER TIP: </span>
                      <span>{sec.proTip}</span>
                    </div>
                  </div>
                )}

                {/* Visual Snippet / Comparison Table if available */}
                {sec.visualSnippet && sec.visualSnippet.type === "comparison" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Left Box */}
                    <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
                      <h4 className="text-xs font-black text-rose-400">{sec.visualSnippet.data.leftTitle}</h4>
                      <ul className="space-y-1 text-[11px] text-gray-300">
                        {sec.visualSnippet.data.leftItems.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-400 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right Box */}
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                      <h4 className="text-xs font-black text-emerald-400">{sec.visualSnippet.data.rightTitle}</h4>
                      <ul className="space-y-1 text-[11px] text-gray-300">
                        {sec.visualSnippet.data.rightItems.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {sec.visualSnippet && sec.visualSnippet.type === "rules" && (
                  <div className="p-4 bg-[#0B0D10] border border-indigo-500/30 rounded-xl space-y-2">
                    <h4 className="text-xs font-black text-indigo-300">{sec.visualSnippet.data.title}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sec.visualSnippet.data.steps.map((st: string, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-[#14171C] border border-[#22252A] text-[11px] text-gray-300">
                          {st}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 🧮 INTERACTIVE WIDGET 1: Position Size & 1:2 R:R Calculator (Embedded directly in Course) */}
          <div className="p-5 rounded-2xl bg-[#12151A] border border-indigo-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Interactive Position Size & R:R Calculator Drill</h3>
                  <p className="text-[10px] text-gray-400">Calculate exact contract size & dollar risk before you place any trade.</p>
                </div>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                Formula: Max Risk / Stop Distance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Account Size */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Account Equity ($)</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={calcAccountSize}
                  onChange={(e) => setCalcAccountSize(Number(e.target.value))}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              {/* Risk % */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Max Risk % (Recommended: 1%)</label>
                <input
                  type="number"
                  min="0.25"
                  max="5"
                  step="0.25"
                  value={calcRiskPct}
                  onChange={(e) => setCalcRiskPct(Number(e.target.value))}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              {/* Instrument */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Instrument</label>
                <select
                  value={calcInstrument}
                  onChange={(e) => setCalcInstrument(e.target.value as any)}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                >
                  <option value="MNQ">Micro Nasdaq (MNQ) - $2/pt</option>
                  <option value="MES">Micro S&P (MES) - $5/pt</option>
                  <option value="NQ">E-mini Nasdaq (NQ) - $20/pt</option>
                  <option value="ES">E-mini S&P (ES) - $50/pt</option>
                </select>
              </div>

              {/* Stop Distance */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Chart Stop Loss (Points)</label>
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={calcStopPoints}
                  onChange={(e) => setCalcStopPoints(Number(e.target.value))}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Output Calculation Result Bar */}
            <div className="p-3 bg-[#08090A] rounded-xl border border-[#22252A] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Max Dollar Risk</span>
                <span className="text-sm font-black text-rose-400 font-mono">-${calcDollarRisk.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Allowed Size</span>
                <span className="text-sm font-black text-indigo-300 font-mono">
                  {maxContracts} {calcInstrument} {maxContracts === 1 ? "Contract" : "Contracts"}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase block">1:2 Target Profit</span>
                <span className="text-sm font-black text-emerald-400 font-mono">+${potentialProfitAt2R.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase block">1:3 Target Profit</span>
                <span className="text-sm font-black text-teal-300 font-mono">+${potentialProfitAt3R.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 🎮 INTERACTIVE WIDGET 2: First Trade Execution Simulator Drill */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#13161C] via-[#0E1014] to-[#0A0C0E] border border-amber-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Interactive Setup & Execution Drill</h3>
                  <p className="text-[10px] text-gray-400">Rehearse a 15m Trend Pullback scenario with zero real money risk.</p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Setup: NQ 15m Pullback to VWAP
              </span>
            </div>

            {/* Visual Setup Box */}
            <div className="p-3.5 bg-[#08090A] border border-[#22252A] rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Market: NQ Futures @ 20,500.00</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">15m Trend: Bullish Higher-Highs</span>
              </div>

              {/* Order Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Trade Direction</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setSimDirection("long");
                        setSimEntryPrice(20500);
                        setSimStopLoss(20480);
                        setSimTakeProfit(20540);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                        simDirection === "long"
                          ? "bg-emerald-500 text-black border-emerald-400 shadow-md"
                          : "bg-[#1E2023] text-emerald-400 border-[#2A2D31] hover:bg-emerald-950/30"
                      }`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      onClick={() => {
                        setSimDirection("short");
                        setSimEntryPrice(20500);
                        setSimStopLoss(20520);
                        setSimTakeProfit(20460);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                        simDirection === "short"
                          ? "bg-rose-500 text-white border-rose-400 shadow-md"
                          : "bg-[#1E2023] text-rose-400 border-[#2A2D31] hover:bg-rose-950/30"
                      }`}
                    >
                      SELL / SHORT
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Entry Price</label>
                  <input
                    type="number"
                    value={simEntryPrice}
                    onChange={(e) => setSimEntryPrice(Number(e.target.value))}
                    className="w-full bg-[#121417] border border-[#2A2D31] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-400 uppercase">Stop Loss Price</label>
                  <input
                    type="number"
                    value={simStopLoss}
                    onChange={(e) => setSimStopLoss(Number(e.target.value))}
                    className="w-full bg-[#121417] border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase">Take Profit Target</label>
                  <input
                    type="number"
                    value={simTakeProfit}
                    onChange={(e) => setSimTakeProfit(Number(e.target.value))}
                    className="w-full bg-[#121417] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
                  />
                </div>
              </div>

              {/* Action Trigger */}
              <div className="flex justify-end pt-1">
                <button
                  disabled={isSimRunning || !simDirection}
                  onClick={runSimulatorTrade}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSimRunning ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Simulating Execution...
                    </span>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Simulated Rehearsal</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Result Box */}
              {simResult && (
                <div
                  className={`p-3.5 rounded-xl border animate-in zoom-in-95 ${
                    simResult.won
                      ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/20 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                      {simResult.won ? "🎯 Take Profit Reached!" : "🛡️ Stop Loss Triggered"}
                    </span>
                    <span className="text-sm font-black font-mono">
                      {simResult.pnl >= 0 ? "+" : ""}{formatCurrency(simResult.pnl)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{simResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Lesson Knowledge Check Quiz */}
          {activeLesson.quiz && (
            <div className="p-5 rounded-2xl bg-[#121417] border border-[#2A2D31] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Knowledge Check: Test Your Comprehension</span>
                </h3>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  +150 XP Bonus
                </span>
              </div>

              <p className="text-xs text-gray-200 font-bold">{activeLesson.quiz.question}</p>

              <div className="space-y-2">
                {activeLesson.quiz.options.map((opt, oIdx) => {
                  const isSelected = quizAnswers[activeLesson.id] === oIdx;
                  const isSubmitted = quizSubmitted[activeLesson.id];
                  const isCorrect = activeLesson.quiz?.correctIndex === oIdx;

                  let optClass = "bg-[#090A0C] border-[#2A2D31] text-gray-300 hover:border-zinc-500";
                  if (isSelected && !isSubmitted) {
                    optClass = "bg-indigo-600/20 border-indigo-500 text-white font-bold";
                  } else if (isSubmitted) {
                    if (isCorrect) {
                      optClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black";
                    } else if (isSelected && !isCorrect) {
                      optClass = "bg-rose-500/20 border-rose-500 text-rose-300 font-bold";
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectQuizOption(activeLesson.id, oIdx)}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${optClass}`}
                    >
                      <span>{opt}</span>
                      {isSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {isSubmitted && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-gray-500">Pick the best answer and submit.</span>
                <button
                  disabled={quizAnswers[activeLesson.id] === undefined}
                  onClick={() => handleSubmitQuiz(activeLesson.id)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow"
                >
                  Submit Answer
                </button>
              </div>

              {quizSubmitted[activeLesson.id] && (
                <div className="p-3 bg-[#08090A] border border-[#22252A] rounded-xl text-xs text-gray-300 space-y-1">
                  <span className="font-bold text-amber-400 block">Explanation:</span>
                  <p>{activeLesson.quiz.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Bottom Next / Prev Lesson Navigation Bar */}
          <div className="pt-4 border-t border-[#2A2D31] flex items-center justify-between gap-3">
            {prevLesson ? (
              <button
                onClick={() => navigateToLesson(prevLesson.id, prevLesson.moduleId)}
                className="px-4 py-2 bg-[#14171C] hover:bg-[#1C2026] border border-[#2A2D31] text-xs font-bold text-gray-300 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous: {prevLesson.title}</span>
              </button>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <button
                onClick={() => navigateToLesson(nextLesson.id, nextLesson.moduleId)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <span>Next: {nextLesson.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onOpenLogModal?.()}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 text-black text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <Award className="w-4 h-4" />
                <span>Complete Academy & Log First Trade!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
