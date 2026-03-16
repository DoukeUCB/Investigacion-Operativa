"""
Capa de Lógica de Negocio – Markov Transitorio
==============================================
Operaciones para cadenas ergódicas/transitorias y árbol de probabilidades.
"""

from __future__ import annotations
from typing import Any, Dict, List
from utils import markov_operations as markov

Matrix = List[List[float]]


class MarkovTransientService:
    """Servicio para operaciones transitorias/ergódicas de Markov."""

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

    def execute(self, operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
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
        elif operation == "probability_tree":
            return self._probability_tree(payload)
        raise ValueError(f"Operación transitoria desconocida: '{operation}'")

    def _chapman_kolmogorov(self, payload: dict) -> Dict[str, Any]:
        """π(n) = π(0) · P^n. π(0) puede ser distribución o cantidades."""
        P = self._get_matrix(payload)
        pi_0 = self._get_vector(payload, "pi_0")
        n = int(payload.get("steps", 1))
        names = self._get_state_names(payload, len(P))

        pi_n = markov.chapman_kolmogorov(pi_0, P, n)
        Pn = markov.chapman_kolmogorov_matrix(P, n)

        total = sum(pi_0)
        pi_0_prob = [x / total for x in pi_0]
        pi_n_prob = [x / total for x in pi_n]

        return {
            "type": "chapman_kolmogorov",
            "pi_0": self._round_vector(pi_0, 8),
            "pi_n": self._round_vector(pi_n, 8),
            "pi_0_prob": self._round_vector(pi_0_prob, 8),
            "pi_n_prob": self._round_vector(pi_n_prob, 8),
            "total_units": round(total, 8),
            "P_n": self._round_matrix(Pn, 8),
            "steps": n,
            "state_names": names,
            "description": f"π({n}) = π(0) · P^{n}",
        }

    def _chapman_kolmogorov_matrix(self, payload: dict) -> Dict[str, Any]:
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
        P = self._get_matrix(payload)
        names = self._get_state_names(payload, len(P))

        pi = markov.steady_state(P)
        n = len(P)
        equations = self._build_equations_display(P, n)

        response = {
            "type": "steady_state",
            "pi": self._round_vector(pi, 8),
            "state_names": names,
            "equations": equations,
            "description": "πP = π, Σπᵢ = 1",
        }

        if payload.get("pi_0") is not None:
            pi_0 = self._get_vector(payload, "pi_0")
            total_units = sum(pi_0)
            if total_units > 0:
                final_counts = markov.scale_stationary_distribution(pi, total_units)
                response["total_units"] = round(total_units, 8)
                response["final_counts"] = self._round_vector(final_counts, 4)

        return response

    def _build_equations_display(self, P: Matrix, n: int) -> List[str]:
        equations = []
        for j in range(n):
            terms = []
            for i in range(n):
                if abs(P[i][j]) > 1e-12:
                    coef = round(P[i][j], 4)
                    terms.append(f"{coef}·π{i + 1}")
            eq = f"π{j + 1} = " + " + ".join(terms)
            equations.append(eq)

        pi_sum = " + ".join([f"π{i + 1}" for i in range(n)])
        equations.append(f"{pi_sum} = 1")
        return equations

    def _mean_first_passage(self, payload: dict) -> Dict[str, Any]:
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
        P = self._get_matrix(payload)
        n = len(P)
        names = self._get_state_names(payload, n)

        info = markov.classify_states(P)
        pi = markov.steady_state(P)
        equations = self._build_equations_display(P, n)
        M = markov.mean_first_passage_time(P)

        ck_result = None
        if payload.get("pi_0") is not None:
            pi_0 = self._get_vector(payload, "pi_0")
            steps = int(payload.get("steps", 1))
            pi_n = markov.chapman_kolmogorov(pi_0, P, steps)
            Pn = markov.chapman_kolmogorov_matrix(P, steps)
            total = sum(pi_0)
            ck_result = {
                "pi_0": self._round_vector(pi_0, 8),
                "pi_n": self._round_vector(pi_n, 8),
                "pi_0_prob": self._round_vector([x / total for x in pi_0], 8),
                "pi_n_prob": self._round_vector([x / total for x in pi_n], 8),
                "total_units": round(total, 8),
                "P_n": self._round_matrix(Pn, 8),
                "steps": steps,
            }

        result = {
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

        if payload.get("pi_0") is not None:
            pi_0 = self._get_vector(payload, "pi_0")
            total = sum(pi_0)
            if total > 0:
                result["steady_state"]["total_units"] = round(total, 8)
                result["steady_state"]["final_counts"] = self._round_vector(
                    markov.scale_stationary_distribution(pi, total),
                    4,
                )

        return result

    def _probability_tree(self, payload: dict) -> Dict[str, Any]:
        P = self._get_matrix(payload)
        n = len(P)
        names = self._get_state_names(payload, n)

        initial_state = int(payload.get("initial_state", 0))
        steps = int(payload.get("steps", 3))
        prune_threshold = float(payload.get("prune_threshold", 0.0))

        result = markov.build_probability_tree(
            P,
            initial_state=initial_state,
            steps=steps,
            state_names=names,
            prune_threshold=prune_threshold,
        )

        return {
            "type": "probability_tree",
            "tree": result["tree"],
            "steps": result["steps"],
            "total_nodes": result["total_nodes"],
            "state_names": result["state_names"],
            "num_states": result["num_states"],
            "initial_state": initial_state,
            "prune_threshold": prune_threshold,
        }
