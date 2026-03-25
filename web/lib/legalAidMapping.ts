import mappingRules from "@/data/legal-aid-mapping-rules.json";

type MappingTarget = {
  subcategorySlug: string;
  parentCategory: string;
};

type MappingRule = {
  containsAny: string[];
  subcategorySlug: string;
  parentCategory: string;
};

type MappingRules = {
  default: MappingTarget;
  rules: MappingRule[];
};

const rules = mappingRules as unknown as MappingRules;

export function mapGovCategoryToADL(govCategory: string): MappingTarget {
  const t = (govCategory || "").trim().toLowerCase();
  if (!t) return rules.default;

  for (const rule of rules.rules || []) {
    for (const needle of rule.containsAny || []) {
      if (needle.toLowerCase() && t.includes(needle.toLowerCase())) {
        return {
          subcategorySlug: rule.subcategorySlug,
          parentCategory: rule.parentCategory,
        };
      }
    }
  }

  return rules.default;
}

export const legalAidExpectedSanityChecks: Array<{
  govNeedle: string;
  expectedSubcategorySlug: string;
}> = [
  { govNeedle: "Crime", expectedSubcategorySlug: "criminal-defence" },
  { govNeedle: "Housing", expectedSubcategorySlug: "housing-homelessness" },
  { govNeedle: "Debt", expectedSubcategorySlug: "debt-management" },
  { govNeedle: "Education", expectedSubcategorySlug: "education-law" },
  {
    govNeedle: "Mental Health",
    expectedSubcategorySlug: "mental-health-law",
  },
];

