#!/usr/bin/env python3
"""Calculate averages from manually entered human ratings in results.json."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from statistics import fmean
from typing import Any

DEFAULT_RESULTS = Path(__file__).with_name("results.json")
SCORE_FIELDS = ("adequacy", "fluency", "terminology_accuracy", "overall_quality")


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    scores: dict[str, dict[str, Any]] = {}
    rated_case_ids: set[str] = set()
    for field in SCORE_FIELDS:
        values: list[float] = []
        for row in rows:
            score = row.get("human_scores", {}).get(field)
            if score is None:
                continue
            if isinstance(score, bool) or not isinstance(score, (int, float)) or not 1 <= score <= 5:
                raise ValueError(f"Case {row.get('id', '?')} has an invalid {field} score; expected a number from 1 to 5 or null.")
            values.append(float(score))
            rated_case_ids.add(str(row.get("id", "?")))
        scores[field] = {"n": len(values), "mean": round(fmean(values), 3) if values else None}
    return {"rated_case_count": len(rated_case_ids), "scores": scores}


def grouped(rows: list[dict[str, Any]], field: str) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        key = row.get(field)
        if isinstance(key, str):
            groups.setdefault(key, []).append(row)
    return {key: summarize(group) for key, group in sorted(groups.items())}


def save(path: Path, results: dict[str, Any]) -> None:
    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as handle:
            json.dump(results, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            temporary_path = handle.name
        os.replace(temporary_path, path)
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=DEFAULT_RESULTS, help="Results JSON path")
    args = parser.parse_args()
    try:
        results = json.loads(args.results.read_text(encoding="utf-8"))
        rows = results.get("cases")
        if not isinstance(rows, list):
            raise ValueError("Results JSON must contain a cases array.")
        summary = summarize(rows)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        parser.error(str(error))

    results["human_evaluation"] = {
        "status": "rated" if summary["rated_case_count"] else "pending_manual_ratings",
        "score_scale": "1-5",
        "rated_case_count": summary["rated_case_count"],
        "averages": summary["scores"],
        "by_direction": grouped(rows, "direction"),
        "by_category": grouped(rows, "category"),
    }
    save(args.results, results)
    print(f"Saved averages for {summary['rated_case_count']} manually rated cases to {args.results}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())