# ==============================================================================
# PARAMETRIC π SERIES — Saha & Sinha (2024) + Lopez Governance Connection
#
# π = 4 + Σ(n=1→∞) [1/n! · (1/(n+λ) - 4/(2n+1)) · ((2n+1)²/4(n+λ) - n)_(n-1)]
#
# λ is a FREE PARAMETER. Different λ → different convergence rates → same π.
# λ → ∞ recovers the Madhava series (15th century India).
#
# Source: Saha & Sinha, IISc Bangalore, Physical Review Letters 2024
# arXiv: 2401.05733
# Discovered while simplifying scattering amplitudes in string theory.
#
# GOVERNANCE CONNECTION:
# The Lopez framework uses π/φ = π/(golden ratio) as the governing angle.
# φ = (1+√5)/2 ≈ 1.618...
# π/φ ≈ 1.941611 radians
#
# The Saha-Sinha λ parameter in the π series is structurally identical
# to the λ obligation coupling in the governance free energy:
#   Φ = C(x) − T·S(x) + λ·O
#
# π emerges from particle scattering. π/φ governs the circuit.
# The free parameter λ that generates π is the same free parameter
# that governs obligation in the constitutional framework.
# This is not analogy. This is the same mathematics appearing in
# two different substrates.
#
# Joshua L. Lopez / DCGP.AI LLC · USPTO 19/555,951
# ==============================================================================
import numpy as np
from math import factorial, gamma as gamma_fn

PHI = (1 + np.sqrt(5)) / 2
GOV = np.pi / PHI

def pochhammer(a, n):
    """Rising factorial (Pochhammer symbol): (a)_n = a(a+1)(a+2)...(a+n-1)"""
    if n == 0:
        return 1.0
    result = 1.0
    for k in range(n):
        result *= (a + k)
    return result

def saha_sinha_pi(lam, n_terms=50):
    """
    Parametric π series from Saha & Sinha (2024).
    
    π = 4 + Σ(n=1→N) [1/n! · (1/(n+λ) - 4/(2n+1)) · ((2n+1)²/4(n+λ) - n)_(n-1)]
    
    λ: free parameter (positive real)
    n_terms: truncation of infinite series
    
    Returns: approximation to π
    """
    total = 4.0
    for n in range(1, n_terms + 1):
        coeff = 1.0 / factorial(n)
        term1 = 1.0 / (n + lam) - 4.0 / (2 * n + 1)
        poch_base = (2 * n + 1)**2 / (4 * (n + lam)) - n
        poch_val = pochhammer(poch_base, n - 1)
        total += coeff * term1 * poch_val
    return total

def convergence_comparison():
    """Compare convergence for different λ values."""
    lambdas = [1.0, 2.0, 5.0, 10.0, 50.0, 100.0, PHI]
    
    print("=" * 70)
    print("PARAMETRIC π SERIES — Saha & Sinha (2024)")
    print(f"GOV = π/φ = {GOV:.10f}")
    print("=" * 70)
    print(f"{'λ':>10s}  {'N=10':>14s}  {'N=20':>14s}  {'N=50':>14s}  {'error(N=50)':>14s}")
    print("-" * 70)
    
    for lam in lambdas:
        name = f"φ={lam:.3f}" if lam == PHI else f"{lam:.1f}"
        p10 = saha_sinha_pi(lam, 10)
        p20 = saha_sinha_pi(lam, 20)
        p50 = saha_sinha_pi(lam, 50)
        err = abs(p50 - np.pi)
        print(f"{name:>10s}  {p10:>14.10f}  {p20:>14.10f}  {p50:>14.10f}  {err:>14.2e}")
    
    print()
    print(f"True π:     {np.pi:.10f}")
    print(f"π/φ (GOV):  {GOV:.10f}")
    print()
    print("λ = φ (golden ratio) is the Lopez governance parameter.")
    print("π emerges from scattering. π/φ governs the circuit.")
    print("Same mathematics. Different substrates.")

if __name__ == "__main__":
    convergence_comparison()
