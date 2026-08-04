# ==============================================================================
# GOVERNED BLOCH DYNAMICS ENGINE — Contact-Preserving Parity Measurement
# Complete simulation: bloch_deriv + Bures distance + PM vs Liouville comparison
# Contact enforcement via tangential projection (admissible projection on Bloch sphere)
# Joshua L. Lopez / DCGP.AI LLC · USPTO 19/555,951
# ==============================================================================
import numpy as np
from scipy.integrate import solve_ivp
from scipy.linalg import sqrtm

def bloch_deriv(t, r, omega, gamma0, sigma_noise, mu, mode='PM'):
    """
    Governed Bloch equation derivative.
    
    Three contributions:
    1. Unitary precession: H = ω/2 σ_z → rotation in x-y plane
    2. Dissipative: σ_x Lindblad channel → decoherence
    3. Contact-preserving correction: μ term → geometric phase (Berry)
    
    In PM mode: stochastic noise on γ + tangential projection to enforce |r| ≈ const
    In Liou mode: deterministic γ, no projection (standard Lindblad)
    
    The tangential projection IS the admissible projection operator Π_A
    applied to the Bloch sphere. Same math as the viability engine,
    different substrate.
    """
    x, y, z = r
    norm = np.sqrt(x**2 + y**2 + z**2) + 1e-12
    gamma = gamma0 + sigma_noise * np.random.normal() if mode == 'PM' else gamma0

    # Unitary precession (H = omega/2 σ_z)
    dx_u = omega * y
    dy_u = -omega * x
    dz_u = 0

    # Dissipative (σ_x Lindblad)
    dx_d = -gamma * x
    dy_d = -gamma * y
    dz_d = -gamma * z

    # Contact-preserving correction (μ term)
    # Equivalent to i[σ_y, ρ] effect on Bloch vector
    dx_c = mu * (-2 * y)
    dy_c = mu * (2 * x)
    dz_c = 0

    dr = np.array([dx_u + dx_d + dx_c, dy_u + dy_d + dy_c, dz_u + dz_d + dz_c])

    if mode == 'PM':
        # Project tangential to enforce |r| ≈ const (contact enforcement)
        # This is Π_A on the Bloch sphere
        dr -= (np.dot(r, dr) / norm**2) * r

    return dr


def bures_distance(r1, r2):
    """
    Bures distance between two qubit states on the Bloch sphere.
    D_B(ρ₁, ρ₂) = √(2 - 2·Tr[√(√ρ₁·ρ₂·√ρ₁)]^½)
    """
    def rho_from_r(r):
        return 0.5 * (np.eye(2) + np.array([
            [r[2], r[0] - 1j * r[1]],
            [r[0] + 1j * r[1], -r[2]]
        ]))
    rho1 = rho_from_r(r1)
    rho2 = rho_from_r(r2)
    sqrt_rho1 = sqrtm(rho1)
    sqrt_term = sqrtm(sqrt_rho1 @ rho2 @ sqrt_rho1)
    return np.sqrt(2 - 2 * np.real(np.trace(sqrt_term) ** 0.5))


# ==============================================================================
# SIMULATION: PM vs Liouville
# ==============================================================================
if __name__ == "__main__":
    omega = 2 * np.pi       # Larmor frequency
    gamma0 = 0.2            # Base decoherence rate
    sigma_noise = 0.05      # Stochastic noise on gamma
    mu = 0.1                # Geometric correction strength
    t_span = (0, 10)
    t_eval = np.linspace(0, 10, 201)
    r0 = np.array([1.0, 0.0, 0.0])  # +x eigenstate

    # Governed parity measurement
    sol_PM = solve_ivp(bloch_deriv, t_span, r0,
                       args=(omega, gamma0, sigma_noise, mu, 'PM'),
                       t_eval=t_eval, method='RK45')

    # Standard Liouville (no geometric correction, no projection)
    sol_Liou = solve_ivp(bloch_deriv, t_span, r0,
                         args=(omega, gamma0, sigma_noise, 0.0, 'Liou'),
                         t_eval=t_eval, method='RK45')

    # Theta trajectory and rate
    theta_PM = np.arccos(np.clip(
        sol_PM.y[2] / (np.linalg.norm(sol_PM.y, axis=0) + 1e-12), -1, 1))
    dtheta_num = np.gradient(theta_PM, t_eval)

    # Bures distance trajectory
    bures = [bures_distance(sol_PM.y[:, i], sol_Liou.y[:, i])
             for i in range(len(t_eval))]

    # Verification metrics
    contact_fidelity = np.mean(np.abs(np.linalg.norm(sol_PM.y, axis=0) - 1))
    mean_bures = np.mean(bures)

    print("=" * 60)
    print("GOVERNED BLOCH DYNAMICS — PM vs Liouville")
    print("=" * 60)
    print(f"Contact fidelity (|r_PM| - 1 mean): {contact_fidelity:.6f}")
    print(f"Mean Bures distance PM vs Liou:     {mean_bures:.6f}")
    print(f"Final |r_PM|:  {np.linalg.norm(sol_PM.y[:, -1]):.6f}")
    print(f"Final |r_Liou|: {np.linalg.norm(sol_Liou.y[:, -1]):.6f}")
    print(f"dθ/dt range: [{dtheta_num.min():.4f}, {dtheta_num.max():.4f}]")
    print()
    print("The governed protocol (PM) preserves contact geometry.")
    print("The ungoverned protocol (Liou) loses it to decoherence.")
    print("Joshua Lopez / DCGP.AI LLC · USPTO 19/555,951")
