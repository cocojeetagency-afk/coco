export const STATUSES = ["Pending", "Loaded", "Cancelled"] as const;

export const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-300",
  Loaded: "bg-green-50 text-green-700 border-green-300",
  Cancelled: "bg-red-50 text-red-600 border-red-300",
};
