import math, json, hashlib, time
from braket.circuits import Circuit
from braket.devices import LocalSimulator

PHI = (1 + math.sqrt(5)) / 2
GOV = math.pi / PHI
device = LocalSimulator()
SHOTS = 100

def build_chain(name, desc, labels, n_modules):
    """Build a modular chain circuit. Each module gets 3 qubits. Output of one feeds input of next."""
    nq = n_modules * 3
    circ = Circuit()
    for q in range(nq): circ.h(q)
    
    outputs = []
    for i in range(n_modules):
        a, b, c = i*3, i*3+1, i*3+2
        # Internal module gates
        circ.rz(a, GOV * (0.3 + i*0.1))
        circ.cnot(a, b)
        circ.rz(b, GOV * (0.4 + i*0.05))
        circ.cnot(b, c)
        circ.rz(c, GOV * 0.618)
        circ.cz(a, c)
        circ.rz(c, GOV)
        outputs.append(c)
        # Chain link: output c connects to next module's input
        if i < n_modules - 1:
            next_a = (i+1)*3
            circ.cnot(c, next_a)
            circ.rz(next_a, GOV * 0.05)
    
    return circ, nq, outputs

chains = [
    ("Thermodynamic", "S_Q → Φ → O → E", ["S_Q","Φ","O","E"], 4),
    ("Authority", "S_Q → K → Π_A → G_H", ["S_Q","K","Π_A","G_H"], 4),
    ("Photonic Bandgap", "Φ_photon → Au_gate → Fork → E", ["Φ_photon","Au_gate","Fork","E"], 4),
    ("Capital Governance", "K → O → Φ → G_H", ["K_cap","O_cost","Φ_yield","G_H"], 4),
    ("Full Lyapunov", "S_Q → K → Φ → O → Π_A → G_H → E", ["S_Q","K","Φ","O","Π_A","G_H","E"], 7),
]

print("=" * 72)
print("MODULAR COIN FIRE — Engines into engines")
print(f"GOV = π/φ = {GOV:.6f}")
print("=" * 72)

all_results = []
for name, desc, labels, n_mod in chains:
    circ, nq, outputs = build_chain(name, desc, labels, n_mod)
    result = device.run(circ, shots=SHOTS).result()
    counts = result.measurement_counts
    
    mod_probs = []
    for oq in outputs:
        p = sum(c for s, c in counts.items() if list(s)[oq] == '1') / SHOTS
        mod_probs.append(round(p, 4))
    
    p_final = mod_probs[-1]
    unique = len(counts)
    proof = hashlib.sha256(f"{name}:{mod_probs}:{GOV}".encode()).hexdigest()
    
    all_results.append({"name":name,"desc":desc,"qubits":nq,"modules":n_mod,
        "labels":labels,"outputs":mod_probs,"p_final":p_final,"unique":unique,"proof":proof})
    
    print(f"\n  {name} ({nq}Q)")
    print(f"  {desc}")
    for i, (lbl, p) in enumerate(zip(labels, mod_probs)):
        bar = "█" * int(p * 30)
        arr = " → " if i < len(mod_probs)-1 else " ⊕"
        print(f"    {lbl:12s} P={p:.3f} {bar}{arr}")
    print(f"  Final: P={p_final:.3f} | {unique} states | {proof[:14]}")

master = hashlib.sha256(json.dumps([r["proof"] for r in all_results]).encode()).hexdigest()
total = sum(r["modules"] for r in all_results)

print(f"\n{'=' * 72}")
print(f"5 chains · {total} modules · {5*SHOTS} shots")
print(f"Master: {master[:32]}")
print(f"\nJoshua Lopez / DCGP.AI LLC")

with open("/home/claude/modular_coin_fire_results.json", "w") as f:
    json.dump({"chains":all_results,"master":master,"gov":GOV,
        "timestamp":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}, f, indent=2)
