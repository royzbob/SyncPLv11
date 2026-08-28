import React, { useState } from "react";
import {
  Globe,
  PlusCircle,
  Settings,
  Lock,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Channel, Room, UserProfile } from "../../types";
import WorkspaceMonetizationSection from "../WorkspaceMonetizationSection";

interface WorkspaceSettingsTabProps {
  activeRoom: Room;
  channels: Channel[];
  isCreatorOrMod: boolean;
  isRoomOwner?: boolean;
  profile: UserProfile | null;
  currentUser: any;
  onCopyRoomCode: () => void;
  onJoinRoomCode: (code: string) => Promise<void>;
  onCreateNewRoom: (roomName?: string) => Promise<void>;
  onRenameRoom?: (roomId: string, newName: string) => Promise<void>;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onAddChannel: (name: string, type: "text" | "voice") => Promise<void>;
  onDeleteChannel: (id: string, name: string) => Promise<void>;
  onRenameChannel: (id: string, name: string) => void;
  onSetChannelPin: (id: string, pin: string) => Promise<void>;
  onMoveChannel?: (id: string, direction: "up" | "down") => Promise<void>;
  onUpdateRoomMonetization?: (
    isPaid: boolean,
    price: number,
    paypalLink?: string,
    venmoUsername?: string,
    cashappTag?: string,
    stripePaymentLink?: string,
    customPaymentInstructions?: string
  ) => Promise<void>;
  onOpenStripeConnectOnboarding: () => void;
  triggerToast?: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export default function WorkspaceSettingsTab({
  activeRoom,
  channels,
  isCreatorOrMod,
  isRoomOwner,
  profile,
  currentUser,
  onCopyRoomCode,
  onJoinRoomCode,
  onCreateNewRoom,
  onRenameRoom,
  onDeleteRoom,
  onAddChannel,
  onDeleteChannel,
  onRenameChannel,
  onSetChannelPin,
  onMoveChannel,
  onUpdateRoomMonetization,
  onOpenStripeConnectOnboarding,
  triggerToast,
}: WorkspaceSettingsTabProps) {
  const [joinCode, setJoinCode] = useState("");
  const [newChanName, setNewChanName] = useState("");
  const [newChanType, setNewChanType] = useState<"text" | "voice">("text");
  const [editingPinChannelId, setEditingPinChannelId] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState("");

  // Room Rename & Create State
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [editingRoomNameVal, setEditingRoomNameVal] = useState(activeRoom.name || "");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomNameVal, setCreateRoomNameVal] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const handleJoinRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    await onJoinRoomCode(joinCode.trim().toUpperCase());
    setJoinCode("");
    if (triggerToast) {
      triggerToast("Workspace Joined", `Successfully synchronized workspace room ${joinCode.trim().toUpperCase()}!`, "success");
    } else {
      alert(`Successfully synchronized workspace room ${joinCode.trim().toUpperCase()}!`);
    }
  };

  const handleAddChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;
    const formatted = newChanName.trim().toLowerCase().replace(/\s+/g, "-");
    await onAddChannel(formatted, newChanType);
    setNewChanName("");
    if (triggerToast) {
      triggerToast("Channel Created", `Channel #${formatted} created successfully!`, "success");
    } else {
      alert(`Channel #${formatted} created successfully!`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Room Integration & Hub Connect */}
      <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] shadow-lg">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
            <Globe className="text-[#5865F2] w-4.5 h-4.5" /> Workspace Room Details & Management
          </h4>
          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded">
            ID: #{activeRoom.id}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Shared Room Box with Rename & Delete */}
          <div className="bg-[#121417] p-3.5 rounded-lg border border-[#2A2D31] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8E9297] uppercase tracking-widest block">
                  Active Shared Room
                </span>
                {isRoomOwner && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    Room Owner
                  </span>
                )}
              </div>

              {!isEditingRoomName ? (
                <div className="flex items-center justify-between mt-1.5">
                  <div>
                    <div className="font-black text-white text-base tracking-wide flex items-center gap-2">
                      {activeRoom.name || activeRoom.id}
                      {isCreatorOrMod && onRenameRoom && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoomNameVal(activeRoom.name || "");
                            setIsEditingRoomName(true);
                          }}
                          className="text-[#8E9297] hover:text-white p-1 hover:bg-[#1E2023] rounded transition cursor-pointer"
                          title="Rename Room"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {activeRoom.name && (
                      <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                        Code: #{activeRoom.id}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!onRenameRoom) return;
                    setIsSubmittingAction(true);
                    try {
                      await onRenameRoom(activeRoom.id, editingRoomNameVal.trim());
                      setIsEditingRoomName(false);
                      if (triggerToast) {
                        triggerToast("Room Renamed", `Room name updated to "${editingRoomNameVal.trim() || activeRoom.id}"`, "success");
                      }
                    } catch (err: any) {
                      if (triggerToast) triggerToast("Rename Failed", err.message, "error");
                    } finally {
                      setIsSubmittingAction(false);
                    }
                  }}
                  className="mt-2 space-y-2"
                >
                  <input
                    type="text"
                    value={editingRoomNameVal}
                    onChange={(e) => setEditingRoomNameVal(e.target.value)}
                    placeholder="Enter new room name..."
                    className="w-full bg-[#08090A] border border-[#2A2D31] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingRoomName(false)}
                      className="px-2.5 py-1 bg-[#1E2023] hover:bg-[#25282E] text-gray-300 text-[11px] font-bold rounded transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAction}
                      className="px-3 py-1 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-bold rounded transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAction ? "Saving..." : "Save Name"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="space-y-2 pt-1 border-t border-[#2A2D31]/40">
              <button
                type="button"
                onClick={onCopyRoomCode}
                className="w-full text-center py-2 bg-[#1E2023] hover:bg-[#25282E] border border-[#2A2D31] text-xs font-bold text-indigo-300 rounded transition cursor-pointer"
              >
                Copy Room Invitation Link
              </button>

              {/* Room Owner Deletion Option */}
              {isRoomOwner && onDeleteRoom && (
                <div>
                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="w-full text-center py-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-[11px] font-bold text-rose-400 hover:text-rose-300 rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Workspace Room</span>
                    </button>
                  ) : (
                    <div className="bg-rose-950/30 border border-rose-500/30 rounded p-2.5 space-y-2 text-left">
                      <p className="text-[11px] text-rose-300 font-bold leading-tight">
                        Permanently delete this room? All channels and data for this room will be removed.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          className="w-1/2 py-1 bg-[#1E2023] hover:bg-[#25282E] text-gray-300 text-[11px] font-bold rounded transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingAction}
                          onClick={async () => {
                            setIsSubmittingAction(true);
                            try {
                              await onDeleteRoom(activeRoom.id);
                              setIsConfirmingDelete(false);
                            } catch (err: any) {
                              if (triggerToast) triggerToast("Delete Failed", err.message, "error");
                            } finally {
                              setIsSubmittingAction(false);
                            }
                          }}
                          className="w-1/2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded transition cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingAction ? "Deleting..." : "Confirm Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Join or Establish Room Box */}
          <div className="space-y-3">
            <form onSubmit={handleJoinRoomSubmit} className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[#8E9297] uppercase tracking-wider">
                Enter Another Room Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="PL-XXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="bg-[#121417] border border-[#2A2D31] rounded px-3 py-2 text-sm text-white uppercase font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-[#5865F2] flex-grow font-mono"
                />
                <button
                  type="submit"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-4 rounded transition cursor-pointer"
                >
                  Join
                </button>
              </div>
            </form>

            {!isCreatingRoom ? (
              <button
                type="button"
                onClick={() => setIsCreatingRoom(true)}
                className="w-full bg-[#1E2023] border border-[#2A2D31] hover:bg-[#24272C] text-gray-200 font-bold text-xs py-2 px-4 rounded transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Establish New Room</span>
              </button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmittingAction(true);
                  try {
                    await onCreateNewRoom(createRoomNameVal.trim());
                    setCreateRoomNameVal("");
                    setIsCreatingRoom(false);
                  } catch (err: any) {
                    if (triggerToast) triggerToast("Create Failed", err.message, "error");
                  } finally {
                    setIsSubmittingAction(false);
                  }
                }}
                className="bg-[#121417] p-3 rounded-lg border border-[#2A2D31] space-y-2.5"
              >
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                  New Room Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FX Scalpers Desk"
                  value={createRoomNameVal}
                  onChange={(e) => setCreateRoomNameVal(e.target.value)}
                  className="w-full bg-[#08090A] border border-[#2A2D31] rounded px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingRoom(false)}
                    className="w-1/3 bg-[#1E2023] hover:bg-[#25282E] text-gray-300 text-xs font-bold py-1.5 rounded transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAction}
                    className="w-2/3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold py-1.5 rounded transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAction ? "Creating..." : "Establish Room"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Channels Administration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Add Channel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-5 rounded-xl space-y-4 relative overflow-hidden border border-[#2A2D31] shadow-lg">
            {!isCreatorOrMod && (
              <div className="absolute inset-0 bg-[#0F1113]/95 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                <div className="p-3 bg-[#1E2023] text-[#8E9297] rounded border border-[#2A2D31] mb-3 shadow">
                  <Lock className="w-5 h-5" />
                </div>
                <h5 className="text-sm font-bold text-gray-200">Creation Restricted</h5>
                <p className="text-xs text-[#8E9297] mt-1 max-w-[180px]">
                  Only room creators or moderators can establish channels here.
                </p>
              </div>
            )}

            <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
              <PlusCircle className="text-[#5865F2] w-4.5 h-4.5" /> Add Trading Channels
            </h4>

            <form onSubmit={handleAddChannelSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="crypto-scalps"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  className="w-full bg-[#121417] border border-[#2A2D31] rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-semibold lowercase font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9297] uppercase mb-1.5 tracking-wider">
                  Channel Type
                </label>
                <div className="flex rounded overflow-hidden border border-[#2A2D31]">
                  <button
                    type="button"
                    onClick={() => setNewChanType("text")}
                    className={`flex-grow py-2 text-xs font-bold transition cursor-pointer ${
                      newChanType === "text"
                        ? "bg-[#5865F2]/10 text-[#5865F2] border-r border-[#2A2D31]"
                        : "bg-[#121417] text-[#8E9297] border-r border-[#2A2D31]"
                    }`}
                  >
                    # Text Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChanType("voice")}
                    className={`flex-grow py-2 text-xs font-bold transition cursor-pointer ${
                      newChanType === "voice"
                        ? "bg-[#5865F2]/10 text-[#5865F2]"
                        : "bg-[#121417] text-[#8E9297]"
                    }`}
                  >
                    🔊 Voice Room
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs py-2.5 rounded transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                Create Channel
              </button>
            </form>
          </div>
        </div>

        {/* Manage Channels list */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-5 rounded-xl space-y-4 border border-[#2A2D31] shadow-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-100 text-sm flex items-center gap-2">
                <Settings className="text-[#5865F2] w-4.5 h-4.5" /> Manage Channels & Order
              </h4>
              <span className="text-[10px] text-gray-400 font-medium">
                Use ▲ / ▼ or settings to configure
              </span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {(() => {
                const textList = channels.filter((c) => c.type === "text");
                const voiceList = channels.filter((c) => c.type === "voice");

                return (
                  <>
                    {textList.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                          Text Channels ({textList.length})
                        </div>
                        {textList.map((chan, idx) => {
                          const isEditingPin = editingPinChannelId === chan.id;
                          const hasPin = !!chan.pin;
                          const isFirst = idx === 0;
                          const isLast = idx === textList.length - 1;

                          return (
                            <div
                              key={chan.id}
                              className="flex flex-col gap-2 p-2.5 bg-[#121417] border border-[#2A2D31] rounded-lg hover:border-gray-700 transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <span className="text-[10px] bg-[#1E2023] text-gray-400 font-mono px-1.5 py-0.5 rounded border border-[#2A2D31]/40 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs text-indigo-400 font-bold shrink-0">#</span>
                                  <span className="text-xs text-gray-200 font-semibold truncate">
                                    {chan.name}
                                  </span>
                                  {hasPin && (
                                    <span title={`Locked with PIN: ${chan.pin}`}>
                                      <Lock
                                        className="w-3 h-3 text-amber-500 fill-amber-500/10 shrink-0"
                                      />
                                    </span>
                                  )}
                                </div>

                                {isCreatorOrMod ? (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {onMoveChannel && (
                                      <div className="flex items-center bg-[#1E2023] rounded border border-[#2A2D31]/60 p-0.5 mr-1">
                                        <button
                                          type="button"
                                          disabled={isFirst}
                                          onClick={() => onMoveChannel(chan.id, "up")}
                                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition cursor-pointer"
                                          title="Move Up"
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isLast}
                                          onClick={() => onMoveChannel(chan.id, "down")}
                                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition cursor-pointer"
                                          title="Move Down"
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditingPin) {
                                          setEditingPinChannelId(null);
                                        } else {
                                          setEditingPinChannelId(chan.id);
                                          setPinValue(chan.pin || "");
                                        }
                                      }}
                                      className={`text-xs transition p-1.5 rounded cursor-pointer ${
                                        hasPin
                                          ? "text-amber-400 hover:bg-amber-500/10"
                                          : "text-gray-400 hover:text-gray-200 hover:bg-[#1E2023]"
                                      }`}
                                      title={hasPin ? "Edit PIN Protection" : "Set PIN Lock"}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onRenameChannel(chan.id, chan.name)}
                                      className="text-xs text-indigo-400 hover:text-indigo-300 transition p-1.5 hover:bg-[#1E2023] rounded cursor-pointer"
                                      title="Rename"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteChannel(chan.id, chan.name)}
                                      className="text-xs text-rose-400 hover:text-rose-300 transition p-1.5 hover:bg-rose-500/10 rounded cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[8px] text-gray-500 bg-[#121417] px-2 py-1 rounded">
                                    {hasPin ? "PIN Protected" : "Public"}
                                  </span>
                                )}
                              </div>

                              {isEditingPin && (
                                <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-[#2A2D31]/50">
                                  <input
                                    type="text"
                                    placeholder="PIN (e.g. 1234)"
                                    value={pinValue}
                                    onChange={(e) => setPinValue(e.target.value)}
                                    maxLength={10}
                                    className="flex-1 bg-[#0F1113] border border-[#2A2D31] rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#5865F2]"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onSetChannelPin(chan.id, pinValue.trim());
                                      setEditingPinChannelId(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer transition"
                                  >
                                    Save
                                  </button>
                                  {hasPin && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onSetChannelPin(chan.id, "");
                                        setEditingPinChannelId(null);
                                      }}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer transition"
                                    >
                                      Remove
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEditingPinChannelId(null)}
                                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[10px] font-bold cursor-pointer transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {voiceList.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                          Voice Channels ({voiceList.length})
                        </div>
                        {voiceList.map((chan, idx) => {
                          const isEditingPin = editingPinChannelId === chan.id;
                          const hasPin = !!chan.pin;
                          const isFirst = idx === 0;
                          const isLast = idx === voiceList.length - 1;

                          return (
                            <div
                              key={chan.id}
                              className="flex flex-col gap-2 p-2.5 bg-[#121417] border border-[#2A2D31] rounded-lg hover:border-gray-700 transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <span className="text-[10px] bg-[#1E2023] text-gray-400 font-mono px-1.5 py-0.5 rounded border border-[#2A2D31]/40 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs text-emerald-400 font-bold shrink-0">🔊</span>
                                  <span className="text-xs text-gray-200 font-semibold truncate">
                                    {chan.name}
                                  </span>
                                  {hasPin && (
                                    <span title={`Locked with PIN: ${chan.pin}`}>
                                      <Lock
                                        className="w-3 h-3 text-amber-500 fill-amber-500/10 shrink-0"
                                      />
                                    </span>
                                  )}
                                </div>

                                {isCreatorOrMod ? (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {onMoveChannel && (
                                      <div className="flex items-center bg-[#1E2023] rounded border border-[#2A2D31]/60 p-0.5 mr-1">
                                        <button
                                          type="button"
                                          disabled={isFirst}
                                          onClick={() => onMoveChannel(chan.id, "up")}
                                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition cursor-pointer"
                                          title="Move Up"
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isLast}
                                          onClick={() => onMoveChannel(chan.id, "down")}
                                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition cursor-pointer"
                                          title="Move Down"
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditingPin) {
                                          setEditingPinChannelId(null);
                                        } else {
                                          setEditingPinChannelId(chan.id);
                                          setPinValue(chan.pin || "");
                                        }
                                      }}
                                      className={`text-xs transition p-1.5 rounded cursor-pointer ${
                                        hasPin
                                          ? "text-amber-400 hover:bg-amber-500/10"
                                          : "text-gray-400 hover:text-gray-200 hover:bg-[#1E2023]"
                                      }`}
                                      title={hasPin ? "Edit PIN Protection" : "Set PIN Lock"}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onRenameChannel(chan.id, chan.name)}
                                      className="text-xs text-indigo-400 hover:text-indigo-300 transition p-1.5 hover:bg-[#1E2023] rounded cursor-pointer"
                                      title="Rename"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteChannel(chan.id, chan.name)}
                                      className="text-xs text-rose-400 hover:text-rose-300 transition p-1.5 hover:bg-rose-500/10 rounded cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[8px] text-gray-500 bg-[#121417] px-2 py-1 rounded">
                                    {hasPin ? "PIN Protected" : "Public"}
                                  </span>
                                )}
                              </div>

                              {isEditingPin && (
                                <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-[#2A2D31]/50">
                                  <input
                                    type="text"
                                    placeholder="PIN (e.g. 1234)"
                                    value={pinValue}
                                    onChange={(e) => setPinValue(e.target.value)}
                                    maxLength={10}
                                    className="flex-1 bg-[#0F1113] border border-[#2A2D31] rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#5865F2]"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onSetChannelPin(chan.id, pinValue.trim());
                                      setEditingPinChannelId(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer transition"
                                  >
                                    Save
                                  </button>
                                  {hasPin && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onSetChannelPin(chan.id, "");
                                        setEditingPinChannelId(null);
                                      }}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer transition"
                                    >
                                      Remove
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEditingPinChannelId(null)}
                                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[10px] font-bold cursor-pointer transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Course & Private Workspace Monetization Panel (Exclusively for Workspace Owners) */}
      {isRoomOwner && (
        <WorkspaceMonetizationSection
          activeRoom={activeRoom}
          isRoomOwner={isRoomOwner}
          profile={profile}
          currentUser={currentUser}
          onUpdateRoomMonetization={onUpdateRoomMonetization}
          onOpenStripeConnectOnboarding={onOpenStripeConnectOnboarding}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
