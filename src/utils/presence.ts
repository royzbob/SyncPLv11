/**
 * Presence computation helper
 * Accurately determines if a user is active, idle, dnd, or offline based on real-time heartbeats.
 */

export const computeUserPresence = (
  user: any,
  isSelf: boolean = false,
  selfPresence?: "active" | "idle" | "dnd" | "offline"
): "active" | "idle" | "dnd" | "offline" => {
  if (isSelf) {
    if (selfPresence === "offline" || user?.marketPresence === "offline") return "offline";
    if (selfPresence === "dnd" || user?.marketPresence === "dnd") return "dnd";
    return typeof document !== "undefined" && document.visibilityState === "visible"
      ? (selfPresence || "active")
      : "idle";
  }
  if (!user) return "offline";
  if (user.marketPresence === "offline") return "offline";
  
  // A user without any heartbeat timestamp is definitely offline
  if (!user.lastActiveAt) {
    return "offline";
  }
  
  const lastTime = new Date(user.lastActiveAt).getTime();
  if (isNaN(lastTime)) return "offline";
  
  const diff = Date.now() - lastTime;
  // If no heartbeat within 90 seconds (1.5 minutes), mark as offline
  if (diff > 90000) {
    return "offline";
  }
  if (diff > 45000) {
    return "idle";
  }
  if (user.marketPresence === "dnd") {
    return "dnd";
  }
  return user.marketPresence || "active";
};

export const getPresenceIndicatorColor = (presence?: string) => {
  switch (presence) {
    case "active":
      return "bg-emerald-500";
    case "idle":
      return "bg-amber-500";
    case "dnd":
      return "bg-rose-500";
    case "offline":
    default:
      return "bg-gray-600";
  }
};

export const getPresenceLabel = (presence?: string, customStatus?: string) => {
  if (customStatus && customStatus.trim() && customStatus !== "Analyzing Markets") {
    return customStatus;
  }
  switch (presence) {
    case "active":
      return "Active Desk";
    case "idle":
      return "AFK / Idle";
    case "dnd":
      return "Deep Trading (DND)";
    case "offline":
    default:
      return "Offline";
  }
};
