"""
Capa de Lógica de Negocio – Cadenas de Markov
==============================================
Orquesta las operaciones de Markov, valida entradas y formatea respuestas.
"""

from __future__ import annotations
from typing import Any, Dict, List
from utils import markov_operations as markov

Matrix = List[List[float]]


class MarkovService:
    """Servicio para cadenas de Markov ergódicas y absorbentes."""

    @staticmethod
    def _round_vector(v: List[float], decimals: int = 8) -> List[float]:
        return [round(x, decimals) for x in v]

    @staticmethod
    def _round_matrix(m: Matrix, decimals: int = 4) -> Matrix:
        return [[round(val, decimals) for val in row] for row in m]

    def execute(self, operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Punto de entrada principal."""
        try:
            result = self._dispatch(operation, payload)
            return {"success": True, "operation": operation, "result": result}
        except (ValueError, TypeError, KeyError) as e:
            return {"success": False, "operation": operation, "error": str(e)}

    def _dispatch(self, operation: str, payload: Dict[str, Any]) -> Any:
        if operation == "chapman_kolmogorov":
            return self._chapman_kolmogorov(payload)
        elif operation == "chapman_kolmogorov_matrix":
            return self._chapman_kolmogorov_matrix(payload)
        elif operation == "steady_state":
            return self._steady_state(payload)
        elif operation == "mean_first_passage":
            return self._mean_first_passage(payload)
        elif operation == "full_analysis":
            return self._full_analysis(payload)
        elif operation == "absorbing_analysis":
            return self._absorbing_analysis(payload)
        else:
            raise ValueError(f"Operación de Markov desconocida: '{operation}'")

    # ─────────────── Helpers ───────────────

    def _get_matrix(self, payload: dict, key: str = "matrix_p") -> Matrix:
        m = payload.get(key)
        if m is None:
            raise ValueError(f"Falta el campo '{key}'.")
        return [[float(val) for val in row] for row in m]

    def _get_vector(self, payload: dict, key: str = "pi_0") -> List[float]:
        v = payload.get(key)
        if v is None:
            raise ValueError(f"Falta el campo '{key}'.")
        return [float(x) for x in v]

    def _get_state_names(self, payload: dict, n: int) -> List[str]:
        names = payload.get("state_names")
        if names and len(names) == n:
            return names
        return [f"Estado {i + 1}" for i in range(n)]

    # ─────────────── Operaciones ───────────────

    def _chapman_kolmogorov(self, payload: dict) -> Dict[str, Any]:
        """π(n) = π(0) · P^n"""
        P = self._get_matrix(payload)
        pi_0 = self._get_vector(payload, "pi_0")
        n = int(payload.get("steps", 1))
        names = self._get_state_names(payload, len(P))

        pi_n = markov.chapman_kolmogorov(pi_0, P, n)
        Pn = markov.chapman_kolmogorov_matrix(P, n)

        return {
            "type": "chapman_kolmogorov",
            "pi_0": self._round_vector(pi_0),
            "pi_n": self._round_vector(pi_n, 8),
            "P_n": self._round_matrix(Pn, 8),
            "steps": n,
            "state_names": names,
            "description": f"π({n}) = π(0) · P^{n}",
        }

    def _chapman_kolmogorov_matrix(self, payload: dict) -> Dict[str, Any]:
        """Solo P^n."""
        P = self._get_matrix(payload)
        n = int(payload.get("steps", 1))
        names = self._get_state_names(payload, len(P))

        Pn = markov.chapman_kolmogorov_matrix(P, n)

        return {
            "type": "matrix",
            "value": self._round_matrix(Pn, 8),
            "rows": len(Pn),
            "cols": len(Pn[0]),
            "steps": n,
            "state_names": names,
        }

    def _steady_state(self, payload: dict) -> Dict[str, Any]:
        """Distribución estacionaria: πP = π."""
        P = self._get_matrix(payload)
        names = self._get_state_names(payload, len(P))

        pi = markov.steady_state(P)

        # Construir el sistema de ecuaciones para mostrar al usuario
        n = len(P)
        equations = self._build_equations_display(P, names, n)

        return {
            "type": "steady_state",
            "pi": self._round_vector(pi, 8),
            "state_names": names,
            "equations": equations,
            "description": "πP = π, Σπᵢ = 1",
        }

    def _build_equations_display(self, P: Matrix, names: List[str], n: int) -> List[str]:
        """Construye representación textual del sistema de ecuaciones."""
        equations = []

        # πP = π  ⟹  Para cada estado j: π_j = Σᵢ π_i · p_ij
        for j in range(n):
            terms = []
            for i in range(n):
                if abs(P[i][j]) > 1e-12:
                    coef = round(P[i][j], 4)
                    terms.append(f"{coef}·π{i + 1}")
            eq = f"π{j + 1} = " + " + ".join(terms)
            equations.append(eq)

        # Restricción de normalización
        pi_sum = " + ".join([f"π{i + 1}" for i in range(n)])
        equations.append(f"{pi_sum} = 1")

        return equations

    def _mean_first_passage(self, payload: dict) -> Dict[str, Any]:
        """Tiempo medio de primer pasaje."""
        P = self._get_matrix(payload)
        names = self._get_state_names(payload, len(P))

        M = markov.mean_first_passage_time(P)
        pi = markov.steady_state(P)

        return {
            "type": "mean_first_passage",
            "M": self._round_matrix(M, 4),
            "pi": self._round_vector(pi, 8),
            "state_names": names,
            "description": "M_ij = tiempo esperado del estado i al estado j",
        }

    def _full_analysis(self, payload: dict) -> Dict[str, Any]:
        """Análisis completo: estacionario + primer pasaje + Chapman-Kolmogorov."""
        P = self._get_matrix(payload)
        n = len(P)
        names = self._get_state_names(payload, n)

        # Clasificación
        info = markov.classify_states(P)

        # Distribución estacionaria
        pi = markov.steady_state(P)
        equations = self._build_equations_display(P, names, n)

        # Tiempo de primer pasaje
        M = markov.mean_first_passage_time(P)

        # Chapman-Kolmogorov con π(0) si se proporcionó
        ck_result = None
        if payload.get("pi_0"):
            pi_0 = self._get_vector(payload, "pi_0")
            steps = int(payload.get("steps", 1))
            pi_n = markov.chapman_kolmogorov(pi_0, P, steps)
            Pn = markov.chapman_kolmogorov_matrix(P, steps)
            ck_result = {
                "pi_0": self._round_vector(pi_0),
                "pi_n": self._round_vector(pi_n, 8),
                "P_n": self._round_matrix(Pn, 8),
                "steps": steps,
            }

        return {
            "type": "full_analysis",
            "state_names": names,
            "classification": info,
            "steady_state": {
                "pi": self._round_vector(pi, 8),
                "equations": equations,
            },
            "mean_first_passage": {
                "M": self._round_matrix(M, 4),
            },
            "chapman_kolmogorov": ck_result,
        }

    # ─────────────── Cadenas Absorbentes ───────────────

    def _absorbing_analysis(self, payload: dict) -> Dict[str, Any]:
        """Análisis completo de cadena de Markov absorbente."""
        P = self._get_matrix(payload)
        n = len(P)
        names = self._get_state_names(payload, n)

        # Detectar o usar los estados absorbentes indicados
        absorbing_idx = payload.get("absorbing_states")
        if absorbing_idx is not None:
            absorbing_idx = [int(i) for i in absorbing_idx]
        else:
            absorbing_idx = markov.identify_absorbing_states(P)

        # Vector b (distribución sobre transitorios) – opcional
        b = payload.get("vector_b")
        if b is not None:
            b = [float(x) for x in b]

        result = markov.absorbing_chain_analysis(P, b=b, absorbing_indices=absorbing_idx)

        # Nombres reordenados
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
