export const audiences = [
  {
    id: "casual",
    label: "End User / Casual",
    shortLabel: "End User",
    description: "Messages, everyday conversation, and personal notes.",
    promptLens: "Write naturally for everyday readers. Preserve warmth, humor, emoji, and conversational intent. Adapt idioms to an equivalent expression instead of translating them word for word. Use respectful Urdu address unless the source clearly calls for an informal register.",
    defaultTone: "natural",
  },
  {
    id: "student",
    label: "Student",
    shortLabel: "Student",
    description: "Coursework, textbooks, and academic reading.",
    promptLens: "Use clear academic language suitable for a student. Keep subject-specific terms consistent, preserve citations, names, numbers, equations, and the structure of the source. Do not simplify or add explanations that are not present.",
    defaultTone: "formal",
  },
  {
    id: "professional",
    label: "Professional",
    shortLabel: "Professional",
    description: "Domain-aware terminology for work contexts.",
    promptLens: "Prioritize precise terminology, preserve qualifiers, numbers, dates, and the source's degree of certainty. Do not infer missing facts. Keep the selected professional domain in mind; this translation is not a substitute for expert review.",
    defaultTone: "formal",
  },
  {
    id: "developer",
    label: "Developer",
    shortLabel: "Developer",
    description: "Product text, technical docs, and API content.",
    promptLens: "Preserve code, markup, URLs, identifiers, variable names, placeholders such as {{name}}, and text inside technical tokens exactly. Translate only human-readable prose. Return plain translated text without wrapping it in code fences or extra commentary.",
    defaultTone: "natural",
  },
  {
    id: "institutional",
    label: "Government / Institutional",
    shortLabel: "Government / Institutional",
    description: "Policies, notices, and public-facing documents.",
    promptLens: "Use formal, standard Urdu and respectful public-service language. Preserve headings, numbering, defined terms, dates, and obligations. Keep the wording neutral and unambiguous; do not claim legal or official certification.",
    defaultTone: "formal",
  },
  {
    id: "creator",
    label: "Content Creator",
    shortLabel: "Content Creator",
    description: "Captions, scripts, and audience-focused content.",
    promptLens: "Preserve the creator's voice, energy, humor, and audience relationship. Localize idioms and cultural references naturally while keeping the original intent. Keep line breaks, hashtags, and emoji where useful, and make captions easy to scan.",
    defaultTone: "natural",
  },
] as const;

export type AudienceId = (typeof audiences)[number]["id"];
export type TranslationTone = "natural" | "formal" | "casual";
export type ProfessionalDomain = "general" | "academic" | "medical" | "legal" | "journalism";

export const professionalDomains: { id: ProfessionalDomain; label: string; instruction: string }[] = [
  { id: "general", label: "General work", instruction: "Use standard professional terminology." },
  { id: "academic", label: "Academic", instruction: "Preserve disciplinary terminology and references." },
  { id: "medical", label: "Medical", instruction: "Preserve clinical terms, dosage, units, and instructions exactly; never add medical advice. Require qualified human review before use." },
  { id: "legal", label: "Legal", instruction: "Preserve legal terms, parties, obligations, and qualifications; never present this as certified legal translation. Require qualified human review before use." },
  { id: "journalism", label: "Journalism", instruction: "Preserve attribution, names, dates, quotations, and distinctions between claims and verified facts." },
];
