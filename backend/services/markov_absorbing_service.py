"""
Capa de Lógica de Negocio – Markov Absorbente
==============================================
Operaciones para cadenas de Markov con estados absorbentes.
"""

from __future__ import annotations
from typing import Any, Dict, List
from utils import markov_operations as markov

Matrix = List[List[float]]


class MarkovAbsorbingService:
    """Servicio para operaciones absorbentes de Markov."""

    @staticmethod
    def _round_vector(v: List[float], decimals: int = 8) -> List[float]:
        return [round(x, decimals) for x in v]

    @staticmethod
    def _round_matrix(m: Matrix, decimals: int = 4) -> Matrix:
        return [[round(val, decimals) for val in row] for row in m]

    def _get_matrix(self, payload: dict, key: str = "matrix_p") -> Matrix:
        m = payload.get(key)
        if m is None:
            raise ValueError(f"Falta el campo '{key}'.")
        return [[float(val) for val in row] for row in m]

    def _get_state_names(self, payload: dict, n: int) -> List[str]:
        names = payload.get("state_names")
        if names and len(names) == n:
            return names
        return [f"Estado {i + 1}" for i in range(n)]

    def execute(self, operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if operation == "absorbing_analysis":
            return self._absorbing_analysis(payload)
        raise ValueError(f"Operación absorbente desconocida: '{operation}'")

    def _absorbing_analysis(self, payload: dict) -> Dict[str, Any]:
        P = self._get_matrix(payload)
        n = len(P)
        names = self._get_state_names(payload, n)

        absorbing_idx = payload.get("absorbing_states")
        if absorbing_idx is not None:
            absorbing_idx = [int(i) for i in absorbing_idx]
        else:
            absorbing_idx = markov.identify_absorbing_states(P)

        b = payload.get("vector_b")
        if b is not None:
            b = [float(x) for x in b]

        result = markov.absorbing_chain_analysis(P, b=b, absorbing_indices=absorbing_idx)

        abs_names = [names[i] for i in result["order_absorbing"]]
        trans_names = [names[i] for i in result["order_transient"]]

        response = {
            "type": "absorbing_analysis",
            "state_names": names,
            "absorbing_names": abs_names,
            "transient_names": trans_names,
            "absorbing_indices": result["order_absorbing"],
            "transient_indices": result["order_transient"],
            "s": result["s"],
            "t": result["t"],
            "P_canonical": self._round_matrix(result["P_canonical"], 6),
            "Q": self._round_matrix(result["Q"], 6),
            "R": self._round_matrix(result["R"], 6),
            "N": self._round_matrix(result["N"], 6),
            "B": self._round_matrix(result["B"], 6),
        }

        if b is not None and "b_B" in result:
            response["b"] = self._round_vector(b, 6)
            response["b_B"] = self._round_vector(result["b_B"], 6)

        return response
