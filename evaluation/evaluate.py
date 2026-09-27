#!/usr/bin/env python3
"""Run the fixed English-Urdu reference set against the local translator API."""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DATASET = Path(__file__).with_name("dataset.json")
DEFAULT_RESULTS = Path(__file__).with_name("results.json")
EXPECTED_DIRECTIONS = {"en-ur", "ur-en"}
REQUIRED_CATEGORIES = {"general", "academic", "technical", "formal", "idiomatic", "roman_urdu"}
VALID_AUDIENCES = {"casual", "student", "professional", "developer", "institutional", "creator"}
VALID_DOMAINS = {"general", "academic", "medical", "legal", "journalism"}
HUMAN_SCORE_FIELDS = ("adequacy", "fluency", "terminology_accuracy", "overall_quality")


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_dataset(path: Path) -> dict[str, Any]:
    try:
        dataset = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Could not read dataset {path}: {error}") from error

    cases = dataset.get("cases") if isinstance(dataset, dict) else None
    if not isinstance(cases, list):
        raise ValueError("Dataset must be a JSON object with a cases array.")
    if len(cases) != 100:
        raise ValueError(f"Expected exactly 100 test cases; found {len(cases)}.")

    identifiers: set[str] = set()
    direction_counts = defaultdict(int)
    categories: set[str] = set()
    required_fields = {"id", "direction", "category", "source", "reference", "romanUrdu", "tone", "audienceId", "domain"}
    for index, case in enumerate(cases, start=1):
        if not isinstance(case, dict) or not required_fields.issubset(case):
            raise ValueError(f"Case {index} is missing required fields.")
        if not all(isinstance(case[field], str) and case[field].strip() for field in ("id", "category", "source", "reference")):
            raise ValueError(f"Case {index} has an empty id, category, source, or reference.")
        if case["id"] in identifiers:
            raise ValueError(f"Duplicate case id: {case['id']}.")
        identifiers.add(case["id"])
        if case["direction"] not in EXPECTED_DIRECTIONS:
            raise ValueError(f"Case {case['id']} has unsupported direction {case['direction']!r}.")
        if case["tone"] not in {"natural", "formal", "casual"}:
            raise ValueError(f"Case {case['id']} has an unsupported tone.")
        if case["audienceId"] not in VALID_AUDIENCES or case["domain"] not in VALID_DOMAINS:
            raise ValueError(f"Case {case['id']} has an unsupported audience or domain.")
        if not isinstance(case["romanUrdu"], bool) or (case["romanUrdu"] and case["direction"] != "ur-en"):
            raise ValueError(f"Case {case['id']} has invalid Roman Urdu settings.")
        if len(case["source"]) > 5000:
            raise ValueError(f"Case {case['id']} exceeds the API's 5,000-character input limit.")
        direction_counts[case["direction"]] += 1
        categories.add(case["category"])

    if dict(direction_counts) != {"en-ur": 50, "ur-en": 50}:
        raise ValueError(f"Expected 50 cases per direction; found {dict(direction_counts)}.")
    if not REQUIRED_CATEGORIES.issubset(categories):
        raise ValueError(f"Missing required categories: {sorted(REQUIRED_CATEGORIES - categories)}.")
    return dataset


def empty_human_scores() -> dict[str, None]:
    return {field: None for field in HUMAN_SCORE_FIELDS}


def bleu_summary(rows: list[dict[str, Any]], metric: Any) -> dict[str, Any]:
    completed = [row for row in rows if row.get("translation")]
    if not completed:
        return {"score": None, "sample_count": 0, "tokenizer": "intl"}
    hypotheses = [unicodedata.normalize("NFC", row["translation"]) for row in completed]
    references = [unicodedata.normalize("NFC", row["reference"]) for row in completed]
    score = metric.corpus_score(hypotheses, [references])
    return {
        "score": round(float(score.score), 4),
        "sample_count": len(completed),
        "tokenizer": "intl",
        "brevity_penalty": round(float(score.bp), 6),
        "system_length": int(score.sys_len),
        "reference_length": int(score.ref_len),
    }


def compute_metrics(rows: list[dict[str, Any]], metric: Any) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    overall = bleu_summary(rows, metric)
    by_direction = {
        direction: bleu_summary([row for row in rows if row["direction"] == direction], metric)
        for direction in sorted(EXPECTED_DIRECTIONS)
    }
    categories = sorted({row["category"] for row in rows})
    by_category = {
        category: bleu_summary([row for row in rows if row["category"] == category], metric)
        for category in categories
    }
    return overall, by_direction, by_category


def save_results(path: Path, result: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            temporary_path = handle.name
        os.replace(temporary_path, path)
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)


def load_previous_results(path: Path) -> dict[str, dict[str, Any]]:
    try:
        previous = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Could not read existing results {path}: {error}") from error
    cases = previous.get("cases", [])
    if not isinstance(cases, list):
        raise ValueError("Existing results have an invalid cases field.")
    return {case["id"]: case for case in cases if isinstance(case, dict) and isinstance(case.get("id"), str)}


def request_translation(endpoint: str, case: dict[str, Any], timeout: float, retries: int) -> tuple[dict[str, Any], float]:
    payload = {
        "text": case["source"],
        "direction": case["direction"],
        "romanUrdu": case["romanUrdu"],
        "tone": case["tone"],
        "audienceId": case["audienceId"],
        "domain": case["domain"],
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    for attempt in range(retries + 1):
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                wall_latency_ms = (time.perf_counter() - started) * 1000
                body = json.loads(response.read().decode("utf-8"))
                if not isinstance(body, dict) or not isinstance(body.get("translation"), str) or not body["translation"].strip():
                    raise RuntimeError("The API returned a successful response without a translation.")
                return body, wall_latency_ms
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            if error.code in {429, 503} and attempt < retries:
                time.sleep(min(2**attempt, 8))
                continue
            raise RuntimeError(f"HTTP {error.code}: {detail or error.reason}") from error
        except urllib.error.URLError as error:
            if attempt < retries:
                time.sleep(min(2**attempt, 8))
                continue
            raise RuntimeError(f"Could not reach {endpoint}: {error.reason}") from error
    raise RuntimeError("Request retries were exhausted.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3000", help="Translator app origin (default: %(default)s)")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Dataset JSON path")
    parser.add_argument("--output", type=Path, default=DEFAULT_RESULTS, help="Results JSON path")
    parser.add_argument("--timeout", type=float, default=45, help="Per-request timeout in seconds (default: %(default)s)")
    parser.add_argument("--delay-seconds", type=float, default=1, help="Pause between requests (default: %(default)s)")
    parser.add_argument("--retries", type=int, default=2, help="Retries for network, 429, and 503 errors (default: %(default)s)")
    parser.add_argument("--limit", type=int, help="Run only the first N cases (useful for a small smoke test)")
    parser.add_argument("--resume", action="store_true", help="Reuse successful outputs and existing human scores in the output file")
    parser.add_argument("--validate-only", action="store_true", help="Validate dataset structure without contacting the API or requiring SacreBLEU")
    args = parser.parse_args()

    try:
        dataset = load_dataset(args.dataset)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2
    cases = dataset["cases"]
    if args.validate_only:
        print(f"Dataset valid: {len(cases)} cases, 50 per direction, {len({case['category'] for case in cases})} categories.")
        return 0
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    if args.timeout <= 0 or args.delay_seconds < 0 or args.retries < 0:
        parser.error("--timeout must be positive; delay and retries cannot be negative")

    try:
        import sacrebleu
        from sacrebleu.metrics import BLEU
    except ImportError:
        print("SacreBLEU is required. Install it with: python -m pip install sacrebleu", file=sys.stderr)
        return 2

    metric = BLEU(tokenize="intl", effective_order=True)
    endpoint = args.base_url.rstrip("/") + "/api/translate"
    previous = load_previous_results(args.output) if args.resume else {}
    rows: list[dict[str, Any]] = []
    for case in cases:
        prior = previous.get(case["id"], {})
        rows.append({
            "id": case["id"],
            "direction": case["direction"],
            "category": case["category"],
            "source": case["source"],
            "reference": case["reference"],
            "translation": prior.get("translation"),
            "wall_latency_ms": prior.get("wall_latency_ms"),
            "api_latency_ms": prior.get("api_latency_ms"),
            "model": prior.get("model"),
            "used_fallback": prior.get("used_fallback"),
            "input_tokens": prior.get("input_tokens"),
            "output_tokens": prior.get("output_tokens"),
            "error": prior.get("error") if args.resume else None,
            "human_scores": prior.get("human_scores", empty_human_scores()),
        })

    run_cases = cases[: args.limit] if args.limit is not None else cases
    result: dict[str, Any] = {
        "status": "running",
        "dataset_version": dataset.get("dataset_version"),
        "dataset_status": dataset.get("reference_status"),
        "endpoint": endpoint,
        "started_at": now_utc(),
        "finished_at": None,
        "dataset_case_count": len(cases),
        "requested_case_count": len(run_cases),
        "sacrebleu_version": sacrebleu.__version__,
        "bleu_settings": {"metric": "BLEU", "tokenizer": "intl", "effective_order": True, "normalization": "Unicode NFC"},
        "bleu": {"score": None, "sample_count": 0, "tokenizer": "intl"},
        "by_direction": {},
        "by_category": {},
        "human_evaluation": {"status": "pending_manual_ratings", "score_scale": "1-5"},
        "errors": [],
        "cases": rows,
    }
    index_by_id = {case["id"]: index for index, case in enumerate(cases)}
    completed_this_run = 0

    for case in run_cases:
        row = rows[index_by_id[case["id"]]]
        if args.resume and row.get("translation"):
            completed_this_run += 1
            continue
        try:
            response, wall_latency_ms = request_translation(endpoint, case, args.timeout, args.retries)
            row.update({
                "translation": response["translation"].strip(),
                "wall_latency_ms": round(wall_latency_ms, 2),
                "api_latency_ms": response.get("latencyMs"),
                "model": response.get("model"),
                "used_fallback": response.get("usedFallback"),
                "input_tokens": response.get("inputTokens"),
                "output_tokens": response.get("outputTokens"),
                "error": None,
            })
            completed_this_run += 1
            print(f"[{completed_this_run}/{len(run_cases)}] {case['id']} {case['direction']} via {row['model']} ({row['wall_latency_ms']} ms)")
        except (RuntimeError, TimeoutError, json.JSONDecodeError) as error:
            row["error"] = str(error)
            result["errors"].append({"id": case["id"], "error": str(error)})
            print(f"Stopped at {case['id']}: {error}", file=sys.stderr)

        overall, by_direction, by_category = compute_metrics(rows, metric)
        result["bleu"] = overall
        result["by_direction"] = by_direction
        result["by_category"] = by_category
        result["status"] = "partial" if any(item.get("translation") for item in rows) else "failed"
        save_results(args.output, result)
        if row.get("error"):
            break
        if args.delay_seconds and case is not run_cases[-1]:
            time.sleep(args.delay_seconds)

    overall, by_direction, by_category = compute_metrics(rows, metric)
    result["bleu"] = overall
    result["by_direction"] = by_direction
    result["by_category"] = by_category
    full_dataset_complete = all(row.get("translation") for row in rows)
    result["status"] = "completed" if full_dataset_complete else ("partial" if any(row.get("translation") for row in rows) else "failed")
    result["finished_at"] = now_utc()
    result["successful_case_count"] = sum(bool(row.get("translation")) for row in rows)
    save_results(args.output, result)
    print(f"Saved {result['status']} results ({result['successful_case_count']}/{len(cases)} translations) to {args.output}.")
    return 0 if not result["errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())