# ==============================================================================
# QSTASH FLOW CONTROL — Governed Message Dispatch for AURA Constellation
#
# This is the Πₐ gate on the message queue.
# Parallelism = capacity (how many messages fire simultaneously)
# Rate limit = obligation (how fast the system is allowed to spend)
# Pause/Resume = rescue window (halt and recover)
# Pin/Unpin = governance lock (override incoming configs)
#
# Maps directly to the Contact Hamiltonian:
#   parallelism_max → C (capability bound)
#   rate_max → O (obligation rate)
#   is_paused → rescue state (W_H active)
#   is_pinned → Πₐ CONSTRAIN mode
#
# Dual-region: EU Central (Frankfurt) + US East
# Joshua L. Lopez / DCGP.AI LLC
# ==============================================================================
import dataclasses
from typing import Any, Dict, TypedDict

@dataclasses.dataclass
class FlowControlInfo:
    """Governance state of a flow control key."""
    key: str
    wait_list_size: int      # messages queued (backpressure)
    parallelism_max: int     # capability bound C
    parallelism_count: int   # current active (capability used)
    rate_max: int            # obligation rate O
    rate_count: int          # current rate consumed
    rate_period: int         # obligation period (seconds)
    rate_period_start: int   # period start timestamp
    is_paused: bool          # rescue state active
    is_pinned_parallelism: bool  # Πₐ locked on parallelism
    is_pinned_rate: bool     # Πₐ locked on rate

@dataclasses.dataclass
class GlobalParallelismInfo:
    """Global governance — total constellation capacity."""
    parallelism_max: int     # max global capacity
    parallelism_count: int   # current global usage

class FlowControlApi:
    """
    The Admissible Projection Operator on the message queue.
    
    get()     → read governance state
    pause()   → activate rescue window
    resume()  → exit rescue window
    pin()     → lock Πₐ CONSTRAIN mode
    unpin()   → release to dynamic governance
    reset_rate() → clear obligation counter
    """
    def __init__(self, http):
        self._http = http

    def get(self, flow_control_key: str) -> FlowControlInfo:
        response = self._http.request(path=f"/v2/flowControl/{flow_control_key}", method="GET")
        return FlowControlInfo(
            key=response["flowControlKey"],
            wait_list_size=response.get("waitListSize", 0),
            parallelism_max=response.get("parallelismMax", 0),
            parallelism_count=response.get("parallelismCount", 0),
            rate_max=response.get("rateMax", 0),
            rate_count=response.get("rateCount", 0),
            rate_period=response.get("ratePeriod", 0),
            rate_period_start=response.get("ratePeriodStart", 0),
            is_paused=response.get("isPaused", False),
            is_pinned_parallelism=response.get("isPinnedParallelism", False),
            is_pinned_rate=response.get("isPinnedRate", False),
        )

    def pause(self, key: str): 
        self._http.request(path=f"/v2/flowControl/{key}/pause", method="POST", parse_response=False)

    def resume(self, key: str):
        self._http.request(path=f"/v2/flowControl/{key}/resume", method="POST", parse_response=False)

    def pin(self, key: str, parallelism=None, rate=None, period=None):
        params = {}
        if parallelism: params["parallelism"] = str(parallelism)
        if rate: params["rate"] = str(rate)
        if period: params["period"] = str(period)
        self._http.request(path=f"/v2/flowControl/{key}/pin", method="POST", params=params or None, parse_response=False)

    def unpin(self, key: str, parallelism=False, rate=False):
        params = {}
        if parallelism: params["parallelism"] = "true"
        if rate: params["rate"] = "true"
        self._http.request(path=f"/v2/flowControl/{key}/unpin", method="POST", params=params or None, parse_response=False)

    def reset_rate(self, key: str):
        self._http.request(path=f"/v2/flowControl/{key}/resetRate", method="POST", parse_response=False)
