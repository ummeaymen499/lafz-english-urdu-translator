"use client";

import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Clapperboard,
  Code2,
  GraduationCap,
  Landmark,
  MessageCircle,
} from "lucide-react";
import { useRef } from "react";
import { audiences, professionalDomains, type ProfessionalDomain } from "@/lib/audiences";
import { useWorkspace } from "../lib/workspace-context";

const audienceIcons = {
  casual: MessageCircle,
  student: GraduationCap,
  professional: BriefcaseBusiness,
  developer: Code2,
  institutional: Landmark,
  creator: Clapperboard,
};

export function TranslationControls() {
  const {
    direction,
    setDirection,
    audienceId,
    setAudienceId,
    domain,
    setDomain,
    tone,
    setTone,
    romanUrduInput,
    setRomanUrduInput,
    isUrduSource,
    clearInput,
    swapDirection,
  } = useWorkspace();
  const carouselRef = useRef<HTMLDivElement>(null);

  function scrollProfiles(direction: -1 | 1) {
    const rail = carouselRef.current;
    const card = rail?.querySelector<HTMLButtonElement>(".audience-card");
    if (!rail || !card) return;
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "auto" });
  }

  return (
    <>
      <section className="audience-section" aria-labelledby="audience-title">
        <div className="audience-heading-row">
          <div>
            <div className="section-kicker">
              Your translation lens <span>·</span> {String(audiences.findIndex((audience) => audience.id === audienceId) + 1).padStart(2, "0")} / 06
            </div>
            <h2 id="audience-title">Who are you translating for?</h2>
          </div>
          <div className="carousel-controls">
            <button type="button" onClick={() => scrollProfiles(-1)} aria-label="Scroll audience profiles left" title="Previous profiles">
              <ArrowLeft size={15} />
            </button>
            <button type="button" onClick={() => scrollProfiles(1)} aria-label="Scroll audience profiles right" title="More profiles">
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="audience-rail" ref={carouselRef} role="group" aria-label="Choose a translation audience">
          {audiences.map((audience, index) => {
            const Icon = audienceIcons[audience.id];
            return (
              <button
                key={audience.id}
                type="button"
                className={`audience-card ${audienceId === audience.id ? "active" : ""}`}
                aria-pressed={audienceId === audience.id}
                onClick={() => {
                  setAudienceId(audience.id);
                  setTone(audience.defaultTone);
                  clearInput();
                }}
              >
                <span className="audience-card-top">
                  <span className="audience-number">0{index + 1}</span>
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span className="audience-name">{audience.shortLabel}</span>
                <span className="audience-desc">{audience.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="control-row">
        <div className="language-switcher" aria-label="Translation direction">
          <button className={direction === "auto" ? "language-option selected" : "language-option"} onClick={() => { setDirection("auto"); setRomanUrduInput(false); }} type="button" aria-pressed={direction === "auto"}>
            <span>Auto</span>
          </button>
          <button className={direction === "en-ur" ? "language-option selected" : "language-option"} onClick={() => { setDirection("en-ur"); setRomanUrduInput(false); }} type="button" aria-pressed={direction === "en-ur"}>
            <span>EN</span> English
          </button>
          <button className="swap-button" type="button" onClick={swapDirection} title="Swap languages" aria-label="Swap languages">
            <ArrowDownUp size={16} strokeWidth={1.8} />
          </button>
          <button className={isUrduSource ? "language-option selected ur-option" : "language-option ur-option"} onClick={() => setDirection("ur-en")} type="button" aria-pressed={isUrduSource}>
            <span>اردو</span> Urdu
          </button>
        </div>
        <div className="tone-control">
          <label htmlFor="tone-select">Tone</label>
          <select id="tone-select" value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}>
            <option value="natural">Natural</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </select>
        </div>
        {audienceId === "professional" && (
          <label className="domain-control">
            <span>Domain</span>
            <select aria-label="Professional domain" value={domain} onChange={(event) => setDomain(event.target.value as ProfessionalDomain)}>
              {professionalDomains.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {direction === "ur-en" && (
        <label className="roman-urdu-toggle">
          <input type="checkbox" checked={romanUrduInput} onChange={(event) => setRomanUrduInput(event.target.checked)} /> Source is Roman Urdu
          <span>Latin-script Urdu is not reliably auto-detectable.</span>
        </label>
      )}
    </>
  );
}
