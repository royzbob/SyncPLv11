import React, { useState } from "react";
import {
  ListTodo,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  PlusCircle,
  AlertCircle,
  Check,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { TradingRule } from "../types";

interface ChecklistViewProps {
  rules: TradingRule[];
  onAddRule: (text: string) => Promise<void>;
  onUpdateRule: (id: string, text: string) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onSeedDefaultRules: () => Promise<void>;
  isCreatorOrMod: boolean;
}

export default function ChecklistView({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onSeedDefaultRules,
  isCreatorOrMod,
}: ChecklistViewProps) {
  const [newRuleText, setNewRuleText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({});

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddRule(newRuleText.trim());
      setNewRuleText("");
    } catch (err) {
      console.error("Failed to add rule:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (rule: TradingRule) => {
    setEditingId(rule.id);
    setEditingText(rule.text);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      await onUpdateRule(id, editingText.trim());
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update rule:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleSeed = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSeedDefaultRules();
    } catch (err) {
      console.error("Failed to seed default rules:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedRules = [...rules].sort((a, b) => a.order - b.order);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto h-full text-[#DCDDDE]">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center flex-wrap gap-4 border-b border-[#2A2D31]/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 bg-indigo-500/10 text-indigo-400 rounded">
              <ListTodo className="w-5 h-5" />
            </span>
            <h3 className="font-black text-2xl text-white tracking-tight">Trading Entry Checklist</h3>
          </div>
          <p className="text-xs text-[#8E9297] mt-1">
            Define mandatory confirmation rules that every trader in this workspace must check off before entering any trade.
          </p>
        </div>

        {rules.length === 0 && (
          <button
            onClick={handleSeed}
            disabled={isSubmitting}
            className="bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-400 font-bold text-xs px-3 py-2 rounded transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Seed Professional Rules
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Listing Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#121417]/40 border border-[#2A2D31]/50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-extrabold text-white block">Active Entry Protocol</span>
              <p className="text-[#8E9297] leading-relaxed">
                Rules listed here will block trade execution until checked. Everyone in Room <span className="text-indigo-400 font-mono font-bold">PL-Room</span> is held accountable to the same trading plan.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {sortedRules.length === 0 ? (
              <div className="p-12 text-center bg-[#121417]/50 border border-dashed border-[#2A2D31]/60 rounded-xl flex flex-col items-center justify-center space-y-3">
                <ListTodo className="w-10 h-10 text-gray-600" />
                <p className="text-gray-400 text-sm font-bold">No trading rules configured</p>
                <p className="text-[#8E9297] text-xs max-w-sm">
                  Seed the professional rules template or add your own technical triggers below. A disciplined trader always trades with a plan!
                </p>
                <button
                  onClick={handleSeed}
                  className="mt-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-4 py-2 rounded transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Seed Default Template
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedRules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="bg-[#121417] border border-[#2A2D31] rounded-xl p-4 flex items-center justify-between gap-3 hover:border-indigo-500/20 transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-grow">
                      <span className="font-mono text-xs font-bold text-[#8E9297] bg-[#1E2023] px-2.5 py-1 rounded border border-[#2A2D31] shrink-0">
                        {idx + 1}
                      </span>

                      <input
                        type="checkbox"
                        checked={!!checkedRules[rule.id]}
                        onChange={(e) => {
                          setCheckedRules((prev) => ({
                            ...prev,
                            [rule.id]: e.target.checked
                          }));
                        }}
                        className="rounded border-[#2A2D31] text-[#5865F2] focus:ring-[#5865F2] bg-[#1A1C1E] cursor-pointer w-4 h-4 shrink-0"
                      />

                      {editingId === rule.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="bg-[#1E2023] border border-[#5865F2] rounded px-3 py-1.5 text-sm text-white flex-grow focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(rule.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                      ) : (
                        <span className={`text-sm font-semibold leading-relaxed break-words whitespace-normal transition-all ${
                          checkedRules[rule.id] 
                            ? "text-gray-500 line-through decoration-[#8E9297]/60" 
                            : "text-gray-200"
                        }`}>
                          {rule.text}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {editingId === rule.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(rule.id)}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded transition"
                            title="Save Changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded transition"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {isCreatorOrMod && (
                            <button
                              onClick={() => handleStartEdit(rule)}
                              className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded opacity-0 group-hover:opacity-100 transition duration-150"
                              title="Edit Rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteRule(rule.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition duration-150"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          {/* Add custom rule */}
          <div className="bg-[#121417]/90 border border-[#2A2D31] rounded-2xl p-5 space-y-4">
            <h4 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="w-4.5 h-4.5 text-indigo-400" /> Add Custom Trigger
            </h4>
            <p className="text-[11px] text-[#8E9297] leading-relaxed">
              Define a specific technical, fundamental, or risk requirement for this desk.
            </p>

            <form onSubmit={handleAdd} className="space-y-3">
              <textarea
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="e.g., Check 4H EMA cross and verify RSI is below 70..."
                rows={3}
                required
                maxLength={180}
                className="w-full bg-[#1A1C1E] border border-[#2A2D31] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newRuleText.trim()}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:hover:bg-[#5865F2] text-white font-bold text-xs py-2.5 rounded-lg transition shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Protocol Rule
              </button>
            </form>
          </div>

          {/* Quick presets guide */}
          <div className="bg-[#121417]/40 border border-[#2A2D31]/40 rounded-2xl p-5 space-y-3.5 text-xs">
            <span className="font-extrabold text-white block uppercase tracking-wider text-[10px]">Rule Writing Guidelines</span>
            <ul className="space-y-2 text-[#8E9297] list-disc list-inside">
              <li>Keep trigger statements short and action-oriented.</li>
              <li>Incorporate risk rules (e.g., maximum size limits).</li>
              <li>Include mental checks to block emotional revenge trades.</li>
              <li>Use the template button above to load standard institutional rules instantly.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
