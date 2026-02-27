"""
Capa de Lógica de Negocio
=========================
Orquesta las operaciones de matrices, valida entradas del usuario
y formatea las respuestas para la capa de presentación.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from utils import matrix_operations as ops

Matrix = List[List[float]]


class MatrixService:
    """Servicio que encapsula toda la lógica de negocio para operaciones matriciales."""

    # Mapa de operaciones que requieren dos matrices
    BINARY_OPS = {"add", "subtract", "multiply"}

    # Mapa de operaciones que requieren una sola matriz
    UNARY_OPS = {
        "transpose", "determinant", "inverse", "trace",
        "rank", "rref", "cofactor", "adjugate", "eigenvalues",
    }

    # Operaciones especiales
    SPECIAL_OPS = {"scalar_multiply", "power", "identity"}

    @staticmethod
    def _round_matrix(m: Matrix, decimals: int = 8) -> Matrix:
        """Redondea todos los valores de la matriz para presentación limpia."""
        return [[round(val, decimals) for val in row] for row in m]

    @staticmethod
    def _round_value(val: float, decimals: int = 8) -> float:
        return round(val, decimals)

    @staticmethod
    def _format_complex_list(vals: list) -> list:
        """Formatea valores complejos para serialización JSON."""
        result = []
        for v in vals:
            if isinstance(v, complex):
                result.append({"real": round(v.real, 8), "imag": round(v.imag, 8)})
            else:
                result.append({"real": round(v, 8), "imag": 0.0})
        return result

    def execute(self, operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Punto de entrada principal. Ejecuta la operación solicitada.

        Args:
            operation: nombre de la operación (add, multiply, inverse, etc.)
            payload: diccionario con los datos necesarios (matrix_a, matrix_b, scalar, exp, size)

        Returns:
            Diccionario con el resultado y metadatos.
        """
        try:
            result = self._dispatch(operation, payload)
            return {
                "success": True,
                "operation": operation,
                "result": result,
            }
        except (ValueError, TypeError, KeyError) as e:
            return {
                "success": False,
                "operation": operation,
                "error": str(e),
            }

    def _dispatch(self, operation: str, payload: Dict[str, Any]) -> Any:
        """Despacha la operación al método correspondiente."""
        # ── Operaciones binarias ──
        if operation == "add":
            return self._binary(ops.add, payload)
        elif operation == "subtract":
            return self._binary(ops.subtract, payload)
        elif operation == "multiply":
            return self._binary(ops.multiply, payload)

        # ── Operaciones unarias que retornan matriz ──
        elif operation == "transpose":
            return self._unary_matrix(ops.transpose, payload)
        elif operation == "inverse":
            return self._unary_matrix(ops.inverse, payload)
        elif operation == "rref":
            return self._unary_matrix(ops.rref, payload)
        elif operation == "cofactor":
            return self._unary_matrix(ops.cofactor_matrix, payload)
        elif operation == "adjugate":
            return self._unary_matrix(ops.adjugate, payload)

        # ── Operaciones unarias que retornan escalar ──
        elif operation == "determinant":
            return self._unary_scalar(ops.determinant, payload)
        elif operation == "trace":
            return self._unary_scalar(ops.trace, payload)
        elif operation == "rank":
            return self._unary_scalar(ops.rank, payload)

        # ── Operaciones especiales ──
        elif operation == "scalar_multiply":
            return self._scalar_multiply(payload)
        elif operation == "power":
            return self._power(payload)
        elif operation == "identity":
            return self._identity(payload)
        elif operation == "eigenvalues":
            return self._eigenvalues(payload)

        else:
            raise ValueError(f"Operación desconocida: '{operation}'")

    # ─────────────────── Helpers internos ───────────────────

    def _get_matrix(self, payload: dict, key: str) -> Matrix:
        """Extrae y valida una matriz del payload."""
        m = payload.get(key)
        if m is None:
            raise ValueError(f"Falta el campo '{key}' en la solicitud.")
        # Convertir a float
        return [[float(val) for val in row] for row in m]

    def _binary(self, fn, payload: dict) -> Dict[str, Any]:
        a = self._get_matrix(payload, "matrix_a")
        b = self._get_matrix(payload, "matrix_b")
        result = fn(a, b)
        return {
            "type": "matrix",
            "value": self._round_matrix(result),
            "rows": len(result),
            "cols": len(result[0]),
        }

    def _unary_matrix(self, fn, payload: dict) -> Dict[str, Any]:
        m = self._get_matrix(payload, "matrix_a")
        result = fn(m)
        return {
            "type": "matrix",
            "value": self._round_matrix(result),
            "rows": len(result),
            "cols": len(result[0]),
        }

    def _unary_scalar(self, fn, payload: dict) -> Dict[str, Any]:
        m = self._get_matrix(payload, "matrix_a")
        result = fn(m)
        return {
            "type": "scalar",
            "value": self._round_value(result),
        }

    def _scalar_multiply(self, payload: dict) -> Dict[str, Any]:
        scalar = payload.get("scalar")
        if scalar is None:
            raise ValueError("Falta el campo 'scalar'.")
        scalar = float(scalar)
        m = self._get_matrix(payload, "matrix_a")
        result = ops.scalar_multiply(scalar, m)
        return {
            "type": "matrix",
            "value": self._round_matrix(result),
            "rows": len(result),
            "cols": len(result[0]),
        }

    def _power(self, payload: dict) -> Dict[str, Any]:
        exp = payload.get("exponent")
        if exp is None:
            raise ValueError("Falta el campo 'exponent'.")
        exp = int(exp)
        m = self._get_matrix(payload, "matrix_a")
        result = ops.power(m, exp)
        return {
            "type": "matrix",
            "value": self._round_matrix(result),
            "rows": len(result),
            "cols": len(result[0]),
        }

    def _identity(self, payload: dict) -> Dict[str, Any]:
        size = payload.get("size")
        if size is None:
            raise ValueError("Falta el campo 'size'.")
        size = int(size)
        result = ops.identity(size)
        return {
            "type": "matrix",
            "value": self._round_matrix(result),
            "rows": size,
            "cols": size,
        }

    def _eigenvalues(self, payload: dict) -> Dict[str, Any]:
        m = self._get_matrix(payload, "matrix_a")
        if len(m) != 2 or len(m[0]) != 2:
            raise ValueError("El cálculo de valores propios solo está disponible para matrices 2×2 por ahora.")
        vals = ops.eigenvalues_2x2(m)
        return {
            "type": "eigenvalues",
            "value": self._format_complex_list(vals),
        }
