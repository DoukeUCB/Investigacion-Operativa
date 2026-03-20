"""
Capa de Lógica de Negocio – Teoría de Colas
===========================================
Orquesta operaciones de modelos de colas.
"""

from __future__ import annotations
from typing import Any, Dict
from utils.queue_operations import (
    calculate_queue_metrics,
    calculate_economic_analysis,
    calculate_wait_time_optimization,
)


class QueueService:
    def execute(self, model: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = calculate_queue_metrics(model, payload)
            has_economic_data = bool(payload.get("economic_enabled"))

            if payload.get("optimize_k_wait"):
                result["wait_optimization"] = calculate_wait_time_optimization(model, payload)

            if has_economic_data:
                result["economic"] = calculate_economic_analysis(model, payload, result)

            return {"success": True, "model": model, "result": result}
        except (ValueError, TypeError, KeyError) as e:
            return {"success": False, "model": model, "error": str(e)}
