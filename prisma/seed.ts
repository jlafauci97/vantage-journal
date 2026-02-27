import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

const perspectives = [
  // POLITICS
  { name: "Conservative", category: "POLITICS", color: "#dc2626" },
  { name: "Liberal", category: "POLITICS", color: "#2563eb" },
  { name: "Libertarian", category: "POLITICS", color: "#f59e0b" },
  { name: "Socialist", category: "POLITICS", color: "#e11d48" },
  { name: "Progressive", category: "POLITICS", color: "#7c3aed" },
  { name: "Centrist", category: "POLITICS", color: "#6b7280" },
  { name: "Populist", category: "POLITICS", color: "#ea580c" },
  { name: "Nationalist", category: "POLITICS", color: "#1e40af" },
  { name: "Green Party", category: "POLITICS", color: "#16a34a" },
  { name: "Democratic Socialist", category: "POLITICS", color: "#db2777" },
  { name: "Fiscal Conservative", category: "POLITICS", color: "#991b1b" },
  { name: "Social Democrat", category: "POLITICS", color: "#1d4ed8" },
  { name: "Independent", category: "POLITICS", color: "#a855f7" },
  { name: "Reformist", category: "POLITICS", color: "#0ea5e9" },
  { name: "Constitutionalist", category: "POLITICS", color: "#78350f" },
  { name: "Pro-Labor", category: "POLITICS", color: "#b91c1c" },
  { name: "Feminist", category: "POLITICS", color: "#c026d3" },
  { name: "Civil Libertarian", category: "POLITICS", color: "#0891b2" },
  { name: "Anti-Establishment", category: "POLITICS", color: "#374151" },
  { name: "Traditionalist", category: "POLITICS", color: "#92400e" },

  // ECONOMICS
  { name: "Free Market", category: "ECONOMICS", color: "#059669" },
  { name: "Keynesian", category: "ECONOMICS", color: "#2563eb" },
  { name: "Supply-Side", category: "ECONOMICS", color: "#dc2626" },
  { name: "Modern Monetary Theory", category: "ECONOMICS", color: "#7c3aed" },
  { name: "Austrian School", category: "ECONOMICS", color: "#b45309" },
  { name: "Labor Economics", category: "ECONOMICS", color: "#b91c1c" },
  { name: "Globalist", category: "ECONOMICS", color: "#0891b2" },
  { name: "Protectionist", category: "ECONOMICS", color: "#4338ca" },
  { name: "Small Business", category: "ECONOMICS", color: "#15803d" },
  { name: "Tech Industry", category: "ECONOMICS", color: "#6366f1" },
  { name: "Wall Street", category: "ECONOMICS", color: "#1e3a5f" },
  { name: "Anti-Corporate", category: "ECONOMICS", color: "#991b1b" },

  // LIFESTYLE
  { name: "Environmentalist", category: "LIFESTYLE", color: "#16a34a" },
  { name: "Minimalist", category: "LIFESTYLE", color: "#78716c" },
  { name: "Traditionalist Values", category: "LIFESTYLE", color: "#92400e" },
  { name: "Urban", category: "LIFESTYLE", color: "#3b82f6" },
  { name: "Rural", category: "LIFESTYLE", color: "#65a30d" },
  { name: "Tech Enthusiast", category: "LIFESTYLE", color: "#6366f1" },
  { name: "Health & Wellness", category: "LIFESTYLE", color: "#10b981" },
  { name: "Parent", category: "LIFESTYLE", color: "#f472b6" },
  { name: "Student", category: "LIFESTYLE", color: "#f97316" },
  { name: "Veteran", category: "LIFESTYLE", color: "#1e3a5f" },
  { name: "Immigrant", category: "LIFESTYLE", color: "#8b5cf6" },
  { name: "Entrepreneur", category: "LIFESTYLE", color: "#ea580c" },
  { name: "Artist", category: "LIFESTYLE", color: "#ec4899" },
  { name: "Athlete", category: "LIFESTYLE", color: "#ef4444" },
  { name: "Academic", category: "LIFESTYLE", color: "#1e40af" },
  { name: "Blue Collar", category: "LIFESTYLE", color: "#0369a1" },
  { name: "LGBTQ+", category: "LIFESTYLE", color: "#a855f7" },
  { name: "Millennial", category: "LIFESTYLE", color: "#f59e0b" },
  { name: "Gen Z", category: "LIFESTYLE", color: "#06b6d4" },
  { name: "Baby Boomer", category: "LIFESTYLE", color: "#78716c" },

  // RELIGION
  { name: "Christian", category: "RELIGION", color: "#1e40af" },
  { name: "Catholic", category: "RELIGION", color: "#7e22ce" },
  { name: "Evangelical", category: "RELIGION", color: "#b91c1c" },
  { name: "Muslim", category: "RELIGION", color: "#059669" },
  { name: "Jewish", category: "RELIGION", color: "#1d4ed8" },
  { name: "Hindu", category: "RELIGION", color: "#ea580c" },
  { name: "Buddhist", category: "RELIGION", color: "#f59e0b" },
  { name: "Mormon", category: "RELIGION", color: "#0f766e" },
  { name: "Secular", category: "RELIGION", color: "#6b7280" },
  { name: "Atheist", category: "RELIGION", color: "#374151" },
  { name: "Agnostic", category: "RELIGION", color: "#64748b" },
  { name: "Interfaith", category: "RELIGION", color: "#a855f7" },

  // NATIONALITY
  { name: "American", category: "NATIONALITY", color: "#1e40af" },
  { name: "European", category: "NATIONALITY", color: "#2563eb" },
  { name: "British", category: "NATIONALITY", color: "#dc2626" },
  { name: "Chinese", category: "NATIONALITY", color: "#ef4444" },
  { name: "Indian", category: "NATIONALITY", color: "#f97316" },
  { name: "African", category: "NATIONALITY", color: "#16a34a" },
  { name: "Latin American", category: "NATIONALITY", color: "#eab308" },
  { name: "Middle Eastern", category: "NATIONALITY", color: "#a16207" },
  { name: "Japanese", category: "NATIONALITY", color: "#dc2626" },
  { name: "Russian", category: "NATIONALITY", color: "#1e3a5f" },
  { name: "German", category: "NATIONALITY", color: "#1f2937" },
  { name: "French", category: "NATIONALITY", color: "#1e40af" },
  { name: "Korean", category: "NATIONALITY", color: "#0284c7" },
  { name: "Australian", category: "NATIONALITY", color: "#15803d" },
  { name: "Canadian", category: "NATIONALITY", color: "#dc2626" },
  { name: "Mexican", category: "NATIONALITY", color: "#16a34a" },
  { name: "Brazilian", category: "NATIONALITY", color: "#eab308" },
  { name: "African American", category: "NATIONALITY", color: "#1e293b" },
  { name: "Irish", category: "NATIONALITY", color: "#22c55e" },
  { name: "Italian", category: "NATIONALITY", color: "#16a34a" },

  // PHILOSOPHY
  { name: "Utilitarian", category: "PHILOSOPHY", color: "#0891b2" },
  { name: "Deontological", category: "PHILOSOPHY", color: "#7c3aed" },
  { name: "Pragmatist", category: "PHILOSOPHY", color: "#059669" },
  { name: "Existentialist", category: "PHILOSOPHY", color: "#374151" },
  { name: "Stoic", category: "PHILOSOPHY", color: "#78716c" },
  { name: "Humanist", category: "PHILOSOPHY", color: "#2563eb" },
  { name: "Objectivist", category: "PHILOSOPHY", color: "#b45309" },
  { name: "Communitarian", category: "PHILOSOPHY", color: "#be185d" },
  { name: "Nihilist", category: "PHILOSOPHY", color: "#1f2937" },
  { name: "Rationalist", category: "PHILOSOPHY", color: "#4338ca" },
] as const;

async function main() {
  console.log("Seeding perspectives...");

  for (const p of perspectives) {
    const slug = slugify(p.name, { lower: true, strict: true });
    await prisma.perspective.upsert({
      where: { slug },
      update: { name: p.name, category: p.category, color: p.color },
      create: {
        name: p.name,
        slug,
        category: p.category,
        color: p.color,
      },
    });
  }

  console.log(`Seeded ${perspectives.length} perspectives.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
