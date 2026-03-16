"""
Capa de Lógica de Negocio – Fachada Markov
===========================================
Despacha operaciones de Markov hacia servicios especializados.
"""

from __future__ import annotations
from typing import Any, Dict
from services.markov_transient_service import MarkovTransientService
from services.markov_absorbing_service import MarkovAbsorbingService


class MarkovService:
    """Fachada para cadenas de Markov (transitorias, absorbentes y árbol)."""

    TRANSIENT_OPS = {
        "chapman_kolmogorov",
        "chapman_kolmogorov_matrix",
        "steady_state",
        "mean_first_passage",
        "full_analysis",
        "probability_tree",
    }

    ABSORBING_OPS = {
        "absorbing_analysis",
    }

    def __init__(self) -> None:
        self.transient_service = MarkovTransientService()
        self.absorbing_service = MarkovAbsorbingService()

    def execute(self, operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Punto de entrada principal del módulo Markov."""
        try:
            if operation in self.TRANSIENT_OPS:
                result = self.transient_service.execute(operation, payload)
            elif operation in self.ABSORBING_OPS:
                result = self.absorbing_service.execute(operation, payload)
            else:
                raise ValueError(f"Operación de Markov desconocida: '{operation}'")

            return {"success": True, "operation": operation, "result": result}
        except (ValueError, TypeError, KeyError) as e:
            return {"success": False, "operation": operation, "error": str(e)}
