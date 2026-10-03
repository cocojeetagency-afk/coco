export const STATUSES = ["Pending", "Loaded", "Cancelled"] as const;

export const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-orange-100 text-orange-800 border-orange-400",
  Loaded: "bg-green-100 text-green-800 border-green-400",
  Cancelled: "bg-red-100 text-red-700 border-red-400",
};
