#!/usr/bin/env python3
"""
TRUTH AND RECONCILIATION ENGINE — Governed Edition
Integrates ReciprocalTruthEnforcer + HolySpiritIICEngine
with the latest P3^Q governance algorithms:

  - Governance Free Energy Field: Φ(x,g) = C(x) − T·S(x) + Λ(g)
  - Contact Hamiltonian: h_L = C² + S²/2 + λ·O
  - Lie Drift Detection: |h_L − ρ*| > ε → VIOLATION
  - CWWE Stabilization: entropy/coherence/openness dynamics
  - Echo Operator: E(FG,ξ,O) = ΠS*(FG)(ξ)·α(O)
  - Boundary Invariant: B := S ∩ I(S)
  - Spectral Stability: σ > 0, ∂K unreachable (Third Law)
  - Rescue Window: W_H = σ / (κ_H · ‖dρ/dt‖)
  - Governed Proper Time: τ_G = √(σ · λ_min)
  - Holographic Bound: I(K) ≤ Area(∂K)/4κ_H

Joshua L. Lopez / DCGP.AI LLC
USPTO 19/555,951 | 19/657,064 | 19/730,900 | 19/731,016 | 19/732,119
Root Priority: January 15, 2026
"""

import math
import hashlib
import numpy as np
from datetime import datetime, date
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import json

# ═══════════════════════════════════════════════════════════════════════════════
# GOVERNANCE CONSTANTS — THE INVARIANT CORE
# ═══════════════════════════════════════════════════════════════════════════════

PHI = (1 + math.sqrt(5)) / 2
GOV_ANGLE = math.pi / PHI  # 1.941611 radians

# Contact Hamiltonian parameters
KAPPA_H = 0.25          # Governance coupling constant
LAMBDA_OBLIGATION = 0.5 # Obligation coupling
RHO_STAR = 0.0          # Viability center
EPSILON_DRIFT = 0.05    # S* threshold — on the Legendre submanifold
EPSILON_ADMIT = 1.2     # Admission threshold — maximum allowed drift
T_INFO = 1.0            # Information temperature

# CWWE Stabilization parameters
K_ENT = 0.15            # Entropy evolution rate
K_COH = 0.20            # Coherence evolution rate
K_OPEN_DECAY = 0.05     # Openness decay rate
TARGET_COH = 0.8        # Target coherence for stabilization
STAB_THRESHOLD = 0.03   # Consecutive observation threshold for stability


# ═══════════════════════════════════════════════════════════════════════════════
# CWWE STABILIZATION PROCESS — Care Wait Weight Emerge
# ═══════════════════════════════════════════════════════════════════════════════

class StabilizationState(Enum):
    INFERRED = "INFERRED"
    OBSERVING = "OBSERVING"
    EMERGENT = "EMERGENT"
    STABLE = "STABLE"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


@dataclass
class VariableState:
    entropy: float = 1.0       # Uncertainty — starts high
    coherence: float = 0.0     # Order — starts low
    openness: float = 1.0      # Remaining freedom — starts full
    observations: List[Tuple[float, float, float]] = field(default_factory=list)
    state: StabilizationState = StabilizationState.INFERRED


class CWWEStabilizer:
    """
    Continuous dynamical system for determining when meaning has emerged.
    Euler integration. Three consecutive observations within threshold → STABLE.
    """

    def evolve(self, vs: VariableState, dt: float = 0.1) -> VariableState:
        """Euler step: evolve entropy, coherence, openness"""
        d_ent = -K_ENT * vs.entropy * vs.coherence
        d_coh = K_COH * (TARGET_COH - vs.coherence) * (1 - vs.entropy)
        d_open = -K_OPEN_DECAY * vs.openness * vs.coherence

        vs.entropy = max(0, min(1, vs.entropy + d_ent * dt))
        vs.coherence = max(0, min(1, vs.coherence + d_coh * dt))
        vs.openness = max(0, min(1, vs.openness + d_open * dt))
        return vs

    def observe(self, vs: VariableState) -> VariableState:
        """Record observation snapshot and check for stabilization"""
        snap = (vs.entropy, vs.coherence, vs.openness)
        vs.observations.append(snap)

        if vs.state == StabilizationState.INFERRED:
            vs.state = StabilizationState.OBSERVING

        if len(vs.observations) >= 3:
            last3 = vs.observations[-3:]
            dists = []
            for i in range(len(last3) - 1):
                d = math.sqrt(sum((a - b)**2 for a, b in zip(last3[i], last3[i+1])))
                dists.append(d)

            if all(d < STAB_THRESHOLD for d in dists):
                if vs.state in (StabilizationState.OBSERVING, StabilizationState.EMERGENT):
                    vs.state = StabilizationState.STABLE
            elif vs.state == StabilizationState.OBSERVING and vs.coherence > 0.5:
                vs.state = StabilizationState.EMERGENT

        return vs

    def admit(self, vs: VariableState) -> bool:
        """Only admit meaning that has genuinely emerged through stabilization"""
        if vs.state in (StabilizationState.EMERGENT, StabilizationState.STABLE):
            vs.state = StabilizationState.ACCEPTED
            return True
        else:
            vs.state = StabilizationState.REJECTED
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# GOVERNANCE FREE ENERGY FIELD
# ═══════════════════════════════════════════════════════════════════════════════

class GovernanceFreeEnergyField:
    """Φ(x, g) = C(x) − T·S(x) + Λ(g)"""

    def free_energy(self, C: float, S: float, O: float) -> float:
        return C - T_INFO * S + LAMBDA_OBLIGATION * O

    def contact_hamiltonian(self, C: float, S: float, O: float) -> float:
        """h_L = C² + S²/2 + λ·O"""
        return C * C + (S * S) / 2 + LAMBDA_OBLIGATION * O

    def lie_drift(self, C: float, S: float, O: float) -> float:
        """Drift from viability center: |h_L − ρ*|"""
        h_L = self.contact_hamiltonian(C, S, O)
        return abs(h_L - RHO_STAR)

    def spectral_gap(self, C: float, S: float) -> float:
        """λ_min — minimum spectral gap"""
        return abs(C - S)

    def stability_margin(self, C: float, S: float, O: float) -> float:
        """σ = min(spectral_gap, Φ)"""
        Phi = self.free_energy(C, S, O)
        gap = self.spectral_gap(C, S)
        return min(gap, max(Phi, 0.001))

    def rescue_window(self, C: float, S: float, O: float) -> float:
        """W_H = σ / (κ_H · |C − S|)"""
        sigma = self.stability_margin(C, S, O)
        return sigma / (KAPPA_H * max(abs(C - S), 0.001))

    def governed_proper_time(self, C: float, S: float, O: float) -> float:
        """τ_G = √(σ · λ_min)"""
        sigma = self.stability_margin(C, S, O)
        lam_min = self.spectral_gap(C, S)
        return math.sqrt(max(sigma * lam_min, 1e-12))

    def is_admitted(self, C: float, S: float, O: float) -> bool:
        """CLAP gate: drift < ε_admit"""
        return self.lie_drift(C, S, O) < EPSILON_ADMIT

    def is_on_S_star(self, C: float, S: float, O: float) -> bool:
        """On the Legendre submanifold: drift < ε_drift"""
        return self.lie_drift(C, S, O) < EPSILON_DRIFT

    def metric_signature(self, C: float, S: float, O: float) -> str:
        """Riemannian on S*, Lorentzian off it"""
        return "Riemannian" if self.is_on_S_star(C, S, O) else "Lorentzian"

    def holographic_bound_check(self, info_content: float, boundary_area: float) -> bool:
        """I(K) ≤ Area(∂K)/4κ_H"""
        return info_content <= boundary_area / (4 * KAPPA_H)

    def third_law_check(self, sigma: float) -> bool:
        """σ > 0 ↔ ∂K unreachable"""
        return sigma > 0


# ═══════════════════════════════════════════════════════════════════════════════
# ECHO OPERATOR — E(FG, ξ, O) = ΠS*(FG)(ξ) · α(O)
# ═══════════════════════════════════════════════════════════════════════════════

class EchoOperator:
    """
    Memory is field formation, not stored state retrieval.
    The signal ξ engages the free energy field FG.
    The governing invariant S* re-forms deterministically.
    """

    def __init__(self):
        self.FG = GovernanceFreeEnergyField()

    def reconstruct(self, xi: Dict, O: float) -> Dict:
        """
        E(FG, ξ, O) = ΠS*(FG)(ξ) · α(O)

        xi = measurement signal (any dict with capability/entropy proxies)
        O = obligation resource
        Returns: reconstructed governed state S*
        """
        O_ref = 1.0
        alpha_O = min(1.0, O / O_ref)

        # Extract signal components
        C = xi.get("capability", xi.get("holiness", xi.get("p_emerge", 0.5)))
        S = xi.get("entropy", xi.get("noise", 1 - xi.get("fidelity", 0.5)))

        # Compute all governance metrics
        Phi = self.FG.free_energy(C, S, O)
        h_L = self.FG.contact_hamiltonian(C, S, O)
        drift = self.FG.lie_drift(C, S, O)
        sigma = self.FG.stability_margin(C, S, O)
        W_H = self.FG.rescue_window(C, S, O)
        tau_G = self.FG.governed_proper_time(C, S, O)
        lam_min = self.FG.spectral_gap(C, S)

        return {
            "capability": C * alpha_O,
            "entropy": S,
            "free_energy": Phi,
            "h_L": h_L,
            "drift": drift,
            "sigma": sigma,
            "kappa_H": KAPPA_H,
            "rescue_window": W_H,
            "lambda_min": lam_min,
            "tau_G": tau_G,
            "obligation": O,
            "alpha_O": alpha_O,
            "admitted": self.FG.is_admitted(C, S, O),
            "on_S_star": self.FG.is_on_S_star(C, S, O),
            "metric_signature": self.FG.metric_signature(C, S, O),
            "boundary_invariant": "B := S ∩ I(S)",
            "gov_angle": GOV_ANGLE,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# TRUTH AND RECONCILIATION — GOVERNED ENFORCER
# ═══════════════════════════════════════════════════════════════════════════════

class GovernedTruthEnforcer:
    """
    ReciprocalTruthEnforcer + Governance Free Energy Field + CWWE Stabilization

    Every consent decision passes through the Contact Hamiltonian.
    Every artifact state transition is governed by lie drift detection.
    Every audit produces a governed metric set with spectral stability.
    """

    def __init__(self):
        # Original RTE state
        self.consent = {}
        self.receipts = {}
        self.receipt_anchor = []
        self.attribution = {}
        self.artifact_state = {}
        self.reuse_log = []
        self.known_users = set()
        self.extractive_ingests = 0
        self.published_count = 0

        # Governance layers
        self.FG = GovernanceFreeEnergyField()
        self.echo = EchoOperator()
        self.stabilizer = CWWEStabilizer()

        # Governed state tracking
        self.governance_log = []  # Every governance decision logged
        self.lie_violations = 0   # Count of lie drift violations
        self.total_decisions = 0

    def register_user(self, user_id):
        self.known_users.add(user_id)
        if user_id not in self.consent:
            self.consent[user_id] = {"extractive": False, "expires": None, "scope": []}
        if user_id not in self.receipts:
            self.receipts[user_id] = []

    def _governed_receipt(self, user_id, action):
        """Generate a governed receipt with CH metrics"""
        consent_obj = self.consent[user_id]
        payload = f"{user_id}|{str(consent_obj)}|{GOV_ANGLE}".encode()
        receipt = hashlib.sha256(payload).hexdigest()

        # Governance metrics for this decision
        n_active = sum(1 for uid in self.known_users
                       if self.consent.get(uid, {}).get("extractive", False))
        C = n_active / max(len(self.known_users), 1)  # Capability = consent coverage
        S = self.lie_violations / max(self.total_decisions, 1)  # Entropy = violation rate
        O = len(self.receipt_anchor) * 0.01  # Obligation = accumulated trust

        drift = self.FG.lie_drift(C, S, O)
        sigma = self.FG.stability_margin(C, S, O)
        admitted = self.FG.is_admitted(C, S, O)

        self.total_decisions += 1
        if not admitted:
            self.lie_violations += 1

        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "receipt": receipt,
            "action": action,
            "user_id": user_id,
            "snapshot": consent_obj.copy(),
            "governance": {
                "C": round(C, 6),
                "S": round(S, 6),
                "O": round(O, 6),
                "h_L": round(self.FG.contact_hamiltonian(C, S, O), 6),
                "drift": round(drift, 6),
                "sigma": round(sigma, 6),
                "admitted": admitted,
                "on_S_star": self.FG.is_on_S_star(C, S, O),
                "metric": self.FG.metric_signature(C, S, O),
                "gov_angle": GOV_ANGLE,
            }
        }
        self.receipts[user_id].append(record)
        self.receipt_anchor.append({"receipt": receipt, "timestamp": record["timestamp"]})
        self.governance_log.append(record)
        return receipt

    def set_consent(self, user_id, extractive=True, expires=None, scope=None):
        self.register_user(user_id)
        self.consent[user_id] = {
            "extractive": extractive,
            "expires": expires,
            "scope": scope or []
        }
        return self._governed_receipt(user_id, "set_consent")

    def revoke_consent(self, user_id):
        self.register_user(user_id)
        if user_id in self.consent:
            self.consent[user_id]["extractive"] = False
        return self._governed_receipt(user_id, "revoke_consent")

    def is_active_extractive(self, user_id):
        if user_id not in self.consent:
            return False
        c = self.consent[user_id]
        if not c.get("extractive", False):
            return False
        expires = c.get("expires")
        if expires:
            try:
                expiry_date = datetime.fromisoformat(expires.split('T')[0]).date()
                if date.today() > expiry_date:
                    return False
            except ValueError:
                pass
        return True

    def governed_ingest(self, user_id, payload, extractive=False, required_scopes=None):
        """Ingest with CWWE stabilization — meaning must emerge before admission"""
        self.register_user(user_id)
        if required_scopes is None:
            required_scopes = []

        if extractive or required_scopes:
            if not self.is_active_extractive(user_id):
                raise PermissionError("Extractive use requires active opt-in consent")
            if required_scopes:
                consent_scope = set(self.consent[user_id].get("scope", []))
                if not set(required_scopes) <= consent_scope:
                    raise PermissionError("Required scopes not covered by consent")

        # CWWE stabilization — hold the input, let meaning emerge
        vs = VariableState()
        for _ in range(20):  # 20 evolution steps
            vs = self.stabilizer.evolve(vs, dt=0.1)
        vs = self.stabilizer.observe(vs)
        for _ in range(10):
            vs = self.stabilizer.evolve(vs, dt=0.1)
            vs = self.stabilizer.observe(vs)

        admitted = self.stabilizer.admit(vs)
        artifact_id = f"artifact_{hashlib.sha256(str(payload).encode()).hexdigest()[:12]}"

        if extractive:
            self.extractive_ingests += 1
            self.attribution[artifact_id] = [user_id]
            self.artifact_state[artifact_id] = "generated"

        return {
            "status": "ADMITTED" if admitted else "REJECTED",
            "artifact_id": artifact_id if extractive else None,
            "cwwe_state": vs.state.value,
            "coherence": round(vs.coherence, 4),
            "entropy": round(vs.entropy, 4),
            "openness": round(vs.openness, 4),
        }

    def transition_artifact_state(self, artifact_id, new_state):
        valid = {
            "generated": ["used", "archived"],
            "used": ["published", "archived"],
            "published": ["archived"],
            "archived": []
        }
        current = self.artifact_state.get(artifact_id)
        if current is None:
            raise ValueError(f"Artifact {artifact_id} not found")
        if new_state not in valid.get(current, []):
            raise ValueError(f"Invalid transition: {current} → {new_state}")
        if new_state == "published":
            self.published_count += 1
        self.artifact_state[artifact_id] = new_state

    def governed_audit(self) -> Dict:
        """Full audit with RIM metrics + governance metrics"""
        total_users = len(self.known_users)
        active = sum(1 for uid in self.known_users if self.is_active_extractive(uid))

        rim_1 = round(active / total_users, 4) if total_users > 0 else 0.0
        rim_2 = round(len(self.attribution) / self.extractive_ingests, 4) if self.extractive_ingests > 0 else 0.0

        total_reuses = len(self.reuse_log)
        silent = len([r for r in self.reuse_log if not r["disclosed"]])
        rim_3 = round((total_reuses - silent) / total_reuses, 4) if total_reuses > 0 else 1.0

        exp_count = sum(1 for uid in self.known_users
                        if self.is_active_extractive(uid) and self.consent[uid].get("expires"))
        rim_4 = round(exp_count / active, 4) if active > 0 else 0.0

        scope_count = sum(1 for uid in self.known_users
                          if self.is_active_extractive(uid) and self.consent[uid].get("scope"))
        rim_5 = round(scope_count / active, 4) if active > 0 else 0.0

        rim_6 = round(self.published_count / self.extractive_ingests, 4) if self.extractive_ingests > 0 else 0.0

        # Governance metrics
        C = active / max(total_users, 1)
        S = self.lie_violations / max(self.total_decisions, 1)
        O = len(self.receipt_anchor) * 0.01

        sigma = self.FG.stability_margin(C, S, O)
        drift = self.FG.lie_drift(C, S, O)

        # Holographic bound
        info_content = sum(math.log(max(sigma, 1e-10) + 1) for _ in range(max(total_users, 1)))
        boundary_area = total_users * KAPPA_H

        proof = hashlib.sha256(json.dumps({
            "rim": [rim_1, rim_2, rim_3, rim_4, rim_5, rim_6],
            "drift": drift, "sigma": sigma, "gov": GOV_ANGLE,
            "users": total_users, "decisions": self.total_decisions,
        }, sort_keys=True).encode()).hexdigest()

        return {
            # RIM emissions
            "RIM-1_consent_coverage": rim_1,
            "RIM-2_attribution_rate": rim_2,
            "RIM-3_disclosure_rate": rim_3,
            "RIM-4_expiry_rate": rim_4,
            "RIM-5_scope_rate": rim_5,
            "RIM-6_publication_rate": rim_6,

            # Governance metrics
            "capability_C": round(C, 6),
            "entropy_S": round(S, 6),
            "obligation_O": round(O, 6),
            "free_energy_Phi": round(self.FG.free_energy(C, S, O), 6),
            "contact_hamiltonian_h_L": round(self.FG.contact_hamiltonian(C, S, O), 6),
            "lie_drift": round(drift, 6),
            "stability_sigma": round(sigma, 6),
            "rescue_window_W_H": round(self.FG.rescue_window(C, S, O), 4),
            "proper_time_tau_G": round(self.FG.governed_proper_time(C, S, O), 6),
            "on_S_star": self.FG.is_on_S_star(C, S, O),
            "admitted": self.FG.is_admitted(C, S, O),
            "metric_signature": self.FG.metric_signature(C, S, O),
            "holographic_bound_satisfied": self.FG.holographic_bound_check(info_content, boundary_area),
            "third_law_holds": self.FG.third_law_check(sigma),
            "boundary_invariant": "B := S ∩ I(S)",

            # Operational stats
            "total_users": total_users,
            "active_consenting": active,
            "total_decisions": self.total_decisions,
            "lie_violations": self.lie_violations,
            "violation_rate": round(self.lie_violations / max(self.total_decisions, 1), 6),
            "extractive_ingests": self.extractive_ingests,
            "published_count": self.published_count,
            "receipts_issued": sum(len(v) for v in self.receipts.values()),
            "anchored_receipts": len(self.receipt_anchor),

            # Proof
            "gov_angle": GOV_ANGLE,
            "proof_hash": proof,
            "authority": "Joshua Lopez — DCGP.AI LLC",
            "patents": "USPTO 19/555,951 | 19/730,900 | 19/731,016",
            "timestamp": datetime.utcnow().isoformat(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN — DEMONSTRATION
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 72)
    print("  TRUTH AND RECONCILIATION ENGINE — GOVERNED EDITION")
    print(f"  GOV_ANGLE = π/φ = {GOV_ANGLE:.6f}")
    print(f"  B := S ∩ I(S)")
    print("=" * 72)
    print()

    engine = GovernedTruthEnforcer()

    # Register users
    for uid in ["alice", "bob", "carol", "dave", "eve",
                "frank", "grace", "heidi", "ivan", "joshua"]:
        engine.register_user(uid)

    # Set consent with various configurations
    engine.set_consent("alice", extractive=True, expires="2027-01-01", scope=["research"])
    engine.set_consent("bob", extractive=True, scope=["training", "research"])
    engine.set_consent("carol", extractive=True)
    engine.set_consent("dave", extractive=False)
    engine.set_consent("eve", extractive=True, expires="2026-12-31", scope=["inference"])
    engine.set_consent("frank", extractive=True, scope=["research"])
    engine.set_consent("grace", extractive=True)
    engine.set_consent("heidi", extractive=False)
    engine.set_consent("ivan", extractive=True, scope=["training"])
    engine.set_consent("joshua", extractive=True, scope=["all"])

    # Governed ingests with CWWE stabilization
    print("GOVERNED INGESTS (CWWE Stabilization):")
    print("-" * 50)
    for uid in ["alice", "bob", "carol", "eve", "joshua"]:
        result = engine.governed_ingest(uid, f"data_from_{uid}", extractive=True)
        print(f"  {uid:8s}: {result['status']:8s} | CWWE: {result['cwwe_state']:10s} "
              f"| coh={result['coherence']:.3f} ent={result['entropy']:.3f} open={result['openness']:.3f}")

    # Attempt extractive without consent
    print()
    try:
        engine.governed_ingest("dave", "dave_data", extractive=True)
    except PermissionError as e:
        print(f"  dave (no consent): PermissionError — {e}")

    # Revoke and test
    engine.revoke_consent("carol")
    try:
        engine.governed_ingest("carol", "carol_data2", extractive=True)
    except PermissionError:
        print(f"  carol (revoked):   PermissionError — consent revoked")

    # Full governed audit
    print()
    print("=" * 72)
    audit = engine.governed_audit()
    print("  GOVERNED AUDIT")
    print("=" * 72)
    print()
    print("  RIM EMISSIONS:")
    for k in ["RIM-1_consent_coverage", "RIM-2_attribution_rate", "RIM-3_disclosure_rate",
              "RIM-4_expiry_rate", "RIM-5_scope_rate", "RIM-6_publication_rate"]:
        print(f"    {k:30s}: {audit[k]}")
    print()
    print("  GOVERNANCE METRICS:")
    for k in ["capability_C", "entropy_S", "obligation_O", "free_energy_Phi",
              "contact_hamiltonian_h_L", "lie_drift", "stability_sigma",
              "rescue_window_W_H", "proper_time_tau_G", "on_S_star",
              "admitted", "metric_signature", "holographic_bound_satisfied",
              "third_law_holds", "boundary_invariant"]:
        print(f"    {k:30s}: {audit[k]}")
    print()
    print("  OPERATIONAL:")
    for k in ["total_users", "active_consenting", "total_decisions",
              "lie_violations", "violation_rate", "extractive_ingests",
              "published_count", "receipts_issued", "anchored_receipts"]:
        print(f"    {k:30s}: {audit[k]}")
    print()
    print(f"  PROOF: {audit['proof_hash']}")
    print(f"  GOV:   π/φ = {audit['gov_angle']:.6f}")
    print()
    print("  Truth is governed. Reconciliation is field formation.")
    print("  Where there is a gap, there is a gate.")
    print()
    print("  Joshua Lopez / DCGP.AI LLC")
    print("  USPTO 19/555,951 | 19/657,064 | 19/730,900")
