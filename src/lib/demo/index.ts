import type { DemoIndustry } from "./types";
import { hotelDemo } from "./hotel";
import { schoolDemo } from "./school";
import { restaurantDemo } from "./restaurant";

export * from "./types";

export const demoIndustries: DemoIndustry[] = [hotelDemo, schoolDemo, restaurantDemo];

export function getDemoIndustry(slug: string): DemoIndustry | undefined {
  return demoIndustries.find((industry) => industry.slug === slug);
}

export function getDemoSection(industrySlug: string, sectionSlug: string) {
  const industry = getDemoIndustry(industrySlug);
  if (!industry) return undefined;
  const section = industry.sections.find((s) => s.slug === sectionSlug);
  if (!section) return undefined;
  return { industry, section };
}

export const DEMO_BANNER = "DEMO ENVIRONMENT — SAMPLE DATA ONLY";
