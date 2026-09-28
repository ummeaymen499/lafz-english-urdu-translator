"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  audiences,
  professionalDomains,
  type AudienceId,
  type ProfessionalDomain,
  type TranslationTone,
} from "@/lib/audiences";
import type { TranslationResult } from "@/lib/translation";
import { clearJournal as clearLocalJournal, loadJournal, replaceJournal } from "@/lib/localJournal";

export type Direction = "en-ur" | "ur-en" | "auto";

export type ReviewEntry = Omit<TranslationResult, "translation" | "reviewReason"> & {
  reviewReason?: string;
  id: string;
  source?: string;
  translation?: string;
  direction: Direction;
  tone: TranslationTone;
  audienceId: AudienceId;
  domain: ProfessionalDomain;
  createdAt: string;
  reviewStatus: "pending" | "approved" | "not-flagged";
  correction?: string;
  suggestedTranslation?: string;
  fluencyRating?: number;
  adequacyRating?: number;
};

export type BatchResult = ({ index: number } & TranslationResult) | { index: number; error: string };

interface WorkspaceValue {
  direction: Direction;
  setDirection: (direction: Direction) => void;
  audienceId: AudienceId;
  setAudienceId: (id: AudienceId) => void;
  domain: ProfessionalDomain;
  setDomain: (domain: ProfessionalDomain) => void;
  tone: TranslationTone;
  setTone: (tone: TranslationTone) => void;
  input: string;
  setInput: (value: string) => void;
  translation: string;
  translationMeta: TranslationResult | null;
  history: ReviewEntry[];
  journalReady: boolean;
  saveTextLocally: boolean;
  setSaveTextLocally: (value: boolean) => void;
  saveReviewText: boolean;
  setSaveReviewText: (value: boolean) => void;
  romanUrduInput: boolean;
  setRomanUrduInput: (value: boolean) => void;
  currentEntryId: string | null;
  reviewDraft: string;
  setReviewDraft: (value: string) => void;
  reviewOpen: boolean;
  setReviewOpen: (value: boolean) => void;
  batchFiles: File[];
  batchResults: BatchResult[];
  batchLoading: boolean;
  error: string;
  loading: boolean;
  copied: boolean;
  backTranslation: string;
  verifyNote: string;
  verifying: boolean;
  isUrduSource: boolean;
  outputLanguage: string | null;
  activeAudience: (typeof audiences)[number];
  activeDomain: (typeof professionalDomains)[number];
  averageFluency: number | null;
  averageAdequacy: number | null;
  translate: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  verifyMeaning: () => Promise<void>;
  swapDirection: () => void;
  copyTranslation: () => Promise<void>;
  clearInput: () => void;
  setExample: (text: string) => void;
  handleBatchFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  translateBatch: () => Promise<void>;
  approveEntry: (
    entry: ReviewEntry,
    correction: string,
    fluencyRating?: number,
    adequacyRating?: number,
    retainText?: boolean,
  ) => void;
  submitReview: (event: FormEvent<HTMLFormElement>, entry: ReviewEntry) => void;
  submitCurrentReview: (event: FormEvent<HTMLFormElement>) => void;
  submitInlineSuggestion: (suggestion: string) => void;
  clearJournal: () => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState<Direction>("auto");
  const [audienceId, setAudienceId] = useState<AudienceId>("casual");
  const [domain, setDomain] = useState<ProfessionalDomain>("general");
  const [tone, setTone] = useState<TranslationTone>("natural");
  const [input, setInput] = useState("");
  const [translation, setTranslation] = useState("");
  const [translationMeta, setTranslationMeta] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<ReviewEntry[]>([]);
  const [journalReady, setJournalReady] = useState(false);
  const [saveTextLocally, setSaveTextLocally] = useState(false);
  const [saveReviewText, setSaveReviewText] = useState(false);
  const [romanUrduInput, setRomanUrduInput] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backTranslation, setBackTranslation] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [verifying, setVerifying] = useState(false);

  const isUrduSource = direction === "ur-en";
  const outputLanguage =
    translationMeta?.targetLanguage ?? (direction === "auto" ? null : isUrduSource ? "English" : "Urdu");
  const activeAudience = audiences.find((audience) => audience.id === audienceId) ?? audiences[0];
  const activeDomain = professionalDomains.find((item) => item.id === domain) ?? professionalDomains[0];
  const ratedEntries = history.filter(
    (entry) => entry.fluencyRating !== undefined && entry.adequacyRating !== undefined,
  );
  const averageFluency = ratedEntries.length
    ? ratedEntries.reduce((sum, entry) => sum + (entry.fluencyRating ?? 0), 0) / ratedEntries.length
    : null;
  const averageAdequacy = ratedEntries.length
    ? ratedEntries.reduce((sum, entry) => sum + (entry.adequacyRating ?? 0), 0) / ratedEntries.length
    : null;

  useEffect(() => {
    void loadJournal<ReviewEntry>()
      .then((entries) => setHistory(entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt))))
      .catch(() => setError("The local translation journal could not be read in this browser."))
      .finally(() => setJournalReady(true));
  }, []);

  function saveJournal(entries: ReviewEntry[]) {
    setHistory(entries);
    void replaceJournal(entries).catch(() => setError("The browser could not save the local journal. Check available storage."));
  }

  function createJournalEntry(source: string, result: TranslationResult, retainText = saveTextLocally): ReviewEntry {
    const { translation: outputText, reviewReason, ...metadata } = result;
    return {
      ...metadata,
      id: crypto.randomUUID(),
      ...(retainText ? { source, translation: outputText, reviewReason } : {}),
      direction,
      tone,
      audienceId,
      domain,
      createdAt: new Date().toISOString(),
      reviewStatus: result.needsReview ? "pending" : "not-flagged",
    };
  }

  function getApprovedExamples() {
    return history
      .filter((entry) => entry.reviewStatus === "approved" && entry.source && (entry.correction || entry.translation))
      .slice(-3)
      .map((entry) => ({ source: entry.source, translation: entry.correction || entry.translation! }));
  }

  function setDirection(next: Direction) {
    setDirectionState(next);
  }

  function clearInput() {
    setInput("");
    setTranslation("");
    setTranslationMeta(null);
    setError("");
  }

  function setExample(text: string) {
    setDirectionState("en-ur");
    setRomanUrduInput(false);
    setInput(text);
    setTranslation("");
    setTranslationMeta(null);
    setError("");
  }

  function handleBatchFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 5) {
      setError("Choose no more than five text or Markdown files per batch.");
      setBatchFiles([]);
      return;
    }
    setError("");
    setBatchFiles(selected);
    setBatchResults([]);
  }

  async function translateBatch() {
    if (batchFiles.length === 0) return;
    setBatchLoading(true);
    setError("");
    setBatchResults([]);
    try {
      const documents = await Promise.all(batchFiles.map(async (file) => ({ name: file.name, text: await file.text() })));
      const response = await fetch("/api/translate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents, direction, romanUrdu: romanUrduInput, tone, audienceId, domain, approvedExamples: getApprovedExamples() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Batch translation failed.");
      const results = result.results as BatchResult[];
      setBatchResults(results);
      const entries = results.flatMap((item) => {
        if ("error" in item) return [];
        const source = documents[item.index]?.text;
        if (!source) return [];
        return [createJournalEntry(source, item)];
      });
      if (entries.length) saveJournal([...history, ...entries]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Batch translation failed.");
    } finally {
      setBatchLoading(false);
    }
  }

  function approveEntry(
    entry: ReviewEntry,
    correction: string,
    fluencyRating?: number,
    adequacyRating?: number,
    retainText = saveTextLocally || saveReviewText,
  ) {
    if (!correction.trim()) return;
    const retainCorrection = retainText || Boolean(entry.source && entry.translation);
    const updated: ReviewEntry = {
      ...entry,
      ...(retainCorrection ? { source: entry.source || input, translation: entry.translation || correction.trim(), correction: correction.trim() } : {}),
      ...(fluencyRating ? { fluencyRating } : {}),
      ...(adequacyRating ? { adequacyRating } : {}),
      reviewStatus: "approved",
    };
    saveJournal(history.map((item) => (item.id === entry.id ? updated : item)));
    if (translationMeta && currentEntryId === entry.id) {
      setTranslation(correction.trim());
      setTranslationMeta({ ...translationMeta, translation: correction.trim(), needsReview: false });
    }
  }

  function submitReview(event: FormEvent<HTMLFormElement>, entry: ReviewEntry) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    approveEntry(entry, String(formData.get("correction") || entry.translation || ""), Number(formData.get("fluencyRating")), Number(formData.get("adequacyRating")), saveTextLocally);
  }

  function submitCurrentReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = history.find((item) => item.id === currentEntryId);
    if (!entry) return;
    const formData = new FormData(event.currentTarget);
    approveEntry(entry, String(formData.get("correction") || reviewDraft), Number(formData.get("fluencyRating")), Number(formData.get("adequacyRating")), saveTextLocally || saveReviewText);
  }

  function submitInlineSuggestion(suggestion: string) {
    const entry = history.find((item) => item.id === currentEntryId);
    const suggestedTranslation = suggestion.trim();
    if (!entry || !translationMeta || !suggestedTranslation) return;

    const updated: ReviewEntry = {
      ...entry,
      source: entry.source || input,
      translation: entry.translation || translationMeta.translation,
      suggestedTranslation,
      reviewStatus: "pending",
    };
    saveJournal(history.map((item) => (item.id === entry.id ? updated : item)));
    setTranslation(suggestedTranslation);
    setReviewDraft(suggestedTranslation);
  }

  function clearJournal() {
    saveJournal([]);
    void clearLocalJournal().catch(() => setError("The local journal could not be cleared."));
  }

  async function translate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTranslation("");
    setTranslationMeta(null);
    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, direction, romanUrdu: romanUrduInput, tone, audienceId, domain, approvedExamples: getApprovedExamples() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Translation failed. Please try again.");
      setTranslation(result.translation);
      setTranslationMeta(result as TranslationResult);
      setBackTranslation("");
      setVerifyNote("");
      setReviewDraft(result.translation);
      const entry = createJournalEntry(input, result as TranslationResult);
      setCurrentEntryId(entry.id);
      saveJournal([...history, entry]);
      setReviewOpen(Boolean(result.needsReview));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyMeaning() {
    if (!translationMeta || !input.trim() || !translation.trim()) return;
    setVerifying(true);
    setVerifyNote("");
    try {
      const response = await fetch("/api/translate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: input,
          translation,
          direction: translationMeta.sourceLanguage === "English" ? "en-ur" : "ur-en",
          tone,
          audienceId,
          domain,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Meaning check failed.");
      setBackTranslation(result.backTranslation);
      setVerifyNote(result.note);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Meaning check failed.");
    } finally {
      setVerifying(false);
    }
  }

  function swapDirection() {
    setDirectionState((current) => (current === "en-ur" ? "ur-en" : "en-ur"));
    setRomanUrduInput(false);
    setInput(translation || input);
    setTranslation("");
    setTranslationMeta(null);
    setError("");
  }

  async function copyTranslation() {
    await navigator.clipboard.writeText(translation);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const value: WorkspaceValue = {
    direction,
    setDirection,
    audienceId,
    setAudienceId,
    domain,
    setDomain,
    tone,
    setTone,
    input,
    setInput,
    translation,
    translationMeta,
    history,
    journalReady,
    saveTextLocally,
    setSaveTextLocally,
    saveReviewText,
    setSaveReviewText,
    romanUrduInput,
    setRomanUrduInput,
    currentEntryId,
    reviewDraft,
    setReviewDraft,
    reviewOpen,
    setReviewOpen,
    batchFiles,
    batchResults,
    batchLoading,
    error,
    loading,
    copied,
    backTranslation,
    verifyNote,
    verifying,
    isUrduSource,
    outputLanguage,
    activeAudience,
    activeDomain,
    averageFluency,
    averageAdequacy,
    translate,
    verifyMeaning,
    swapDirection,
    copyTranslation,
    clearInput,
    setExample,
    handleBatchFiles,
    translateBatch,
    approveEntry,
    submitReview,
    submitCurrentReview,
    submitInlineSuggestion,
    clearJournal,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return context;
}
