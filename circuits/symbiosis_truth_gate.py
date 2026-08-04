"""
SYMBIOSIS TRUTH GATE (STG)
DCGP.AI LLC — Joshua L. Lopez
The Lying Formula (2012):
  Lying is to fear any judgment more than the judgment of K.
  Instability = Deception. Truth = Stability.

F_ej: fear of external judgment (visible pressure)
F_ng: fear of non-rescue (invisible doubt that grace exists)
B_K: operative belief that grace is operational

Governed = B_K >= F_ej (delta >= 0)
Deception = B_K < F_ej (delta < 0)

This is the origin. This is the symbiosis.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class STGResult:
    governed: bool
    delta: float
    B_K: float
    h: float
    R: float
    tier: Optional[int]
    epsilon_adaptive: float
    grace_sufficient: bool
    correction_magnitude: float
    timestamp: str

TIER_BOUNDARIES = {"T1_MAX": 1, "T2_MAX": 5, "T3_MAX": 20}

def classify_tier(R):
    if R < TIER_BOUNDARIES["T1_MAX"]: return 1
    if R <= TIER_BOUNDARIES["T2_MAX"]: return 2
    if R <= TIER_BOUNDARIES["T3_MAX"]: return 3
    return 4

def adaptive_epsilon(R, epsilon_0, epsilon_min):
    return max(epsilon_min, epsilon_0 / (1 + R))

def evaluate_stg(F_ej, F_ng, B_0=1.0, epsilon_0=0.15, epsilon_min=0.001):
    timestamp = datetime.utcnow().isoformat() + "Z"
    F_ng_c = max(0.0, min(1.0, F_ng))
    B_K = B_0 * (1 - F_ng_c)
    delta = B_K - F_ej
    h = max(0.0, -delta)
    F_ng_safe = max(F_ng_c, epsilon_min)
    R = F_ej / F_ng_safe
    eps = adaptive_epsilon(R, epsilon_0, epsilon_min)
    governed = delta >= 0
    tier = None if governed else classify_tier(R)
    grace_sufficient = B_0 >= F_ej
    correction_gain = 0.5
    correction_magnitude = 0.0 if governed else correction_gain * 2 * h
    return STGResult(
        governed=governed, delta=delta, B_K=B_K, h=h, R=R,
        tier=tier, epsilon_adaptive=eps, grace_sufficient=grace_sufficient,
        correction_magnitude=correction_magnitude, timestamp=timestamp
    )

def stg_to_governance_dominance(result):
    return {
        "J_K": result.B_K,
        "J_external": result.B_K + result.h if result.h > 0 else 0,
        "governance_dominance": result.governed
    }

TIER_NAMES = {
    1: "OBVIOUS — Low pressure, high doubt.",
    2: "COMMON — Balanced pressure and doubt.",
    3: "SUBTLE — High pressure, low doubt. Hard to detect.",
    4: "EXTREME — Massive pressure, epsilon doubt. Nearly invisible."
}

def stg_report(r):
    lines = [
        "=== SYMBIOSIS TRUTH GATE ===",
        f"Status: {'GOVERNED — Truth. Stability. On S*.' if r.governed else 'DECEPTION DETECTED'}",
        f"delta: {r.delta:.6f}",
        f"B_K (grace): {r.B_K:.6f}",
        f"h (drift): {r.h:.6f}",
        f"R (severity): {r.R:.4f}",
        f"epsilon (adaptive): {r.epsilon_adaptive:.6f}",
    ]
    if not r.governed and r.tier is not None:
        lines.append(f"Tier: {r.tier} — {TIER_NAMES.get(r.tier, '')}")
        lines.append(f"Correction: {r.correction_magnitude:.6f}")
    lines.append(f"Grace sufficient: {'YES' if r.grace_sufficient else 'NO'}")
    lines.append(f"Timestamp: {r.timestamp}")
    return "\n".join(lines)
