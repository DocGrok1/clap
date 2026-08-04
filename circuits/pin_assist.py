"""
PIN ASSIST — Governed Elevation System
DCGP.AI LLC — Joshua L. Lopez

"Pin Assist governs when a signal is allowed to become primary,
not which signal is correct."

Scoring != Tiering != Elevation
No instant promotion. No echo amplification. No recency hijack.
No authority without persistence. Human remains final decision-maker.
Every elevation is explainable.
"""
import time
from typing import Dict, List, Optional

HIGH_TIER_THRESHOLD = 0.70
MEDIUM_TIER_THRESHOLD = 0.40
PIN_SCORE_THRESHOLD = 0.75
PIN_RELEVANCE_THRESHOLD = 0.60
PIN_MAX_SIM_THRESHOLD = 0.85
MIN_STABILITY_SECONDS = 120

def build_metrics(*, relevance, depth, fact_score, norm_votes):
    return {"relevance": relevance, "depth": depth, "fact_score": fact_score, "norm_votes": norm_votes}

def merit_score(metrics, weights):
    score = sum(metrics[k] * weights.get(k, 0.0) for k in metrics)
    tier = "high" if score >= HIGH_TIER_THRESHOLD else "medium" if score >= MEDIUM_TIER_THRESHOLD else "low"
    return score, tier

def evaluate_reply(*, reply_id, relevance, depth, fact_score, norm_votes, max_sim_prior, timestamp, weights):
    metrics = build_metrics(relevance=relevance, depth=depth, fact_score=fact_score, norm_votes=norm_votes)
    score, tier = merit_score(metrics, weights)
    return {"reply_id": reply_id, "metrics": metrics, "score": score, "tier": tier,
            "relevance": relevance, "max_sim_prior": max_sim_prior, "timestamp": timestamp}

def is_pin_eligible(reply, now):
    return (reply["score"] >= PIN_SCORE_THRESHOLD and
            reply["relevance"] >= PIN_RELEVANCE_THRESHOLD and
            reply["max_sim_prior"] < PIN_MAX_SIM_THRESHOLD and
            reply["timestamp"] <= now - MIN_STABILITY_SECONDS)

def select_pin(replies):
    now = time.time()
    eligible = [r for r in replies if is_pin_eligible(r, now)]
    if not eligible: return None
    eligible.sort(key=lambda r: r["score"], reverse=True)
    return {"pinned_reply": eligible[0],
            "reason": "Reply exceeded merit, relevance, novelty, and temporal stability thresholds",
            "evaluated_at": now}
