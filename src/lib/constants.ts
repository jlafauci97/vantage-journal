export const CATEGORY_COLORS: Record<string, string> = {
  POLITICS: "#1e40af",
  LIFESTYLE: "#059669",
  RELIGION: "#7c3aed",
  NATIONALITY: "#ea580c",
  ECONOMICS: "#0891b2",
  PHILOSOPHY: "#be185d",
};

export const CATEGORY_LABELS: Record<string, string> = {
  POLITICS: "Politics",
  LIFESTYLE: "Lifestyle",
  RELIGION: "Religion",
  NATIONALITY: "Nationality",
  ECONOMICS: "Economics",
  PHILOSOPHY: "Philosophy",
};

export const REACTION_LABELS: Record<string, { emoji: string; label: string }> = {
  AGREE: { emoji: "👍", label: "Agree" },
  DISAGREE: { emoji: "👎", label: "Disagree" },
  INTERESTING: { emoji: "🤔", label: "Interesting" },
  SURPRISED: { emoji: "😮", label: "Surprised" },
  ANGRY: { emoji: "😡", label: "Angry" },
  LOVE: { emoji: "❤️", label: "Love" },
};

export const ITEMS_PER_PAGE = 20;
