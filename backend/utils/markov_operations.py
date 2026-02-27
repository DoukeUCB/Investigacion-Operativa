"""
Capa de Datos / Utilidades – Cadenas de Markov (estados transitorios / ergódicas)
=================================================================================
Operaciones fundamentales para cadenas de Markov ergódicas:
  1. Chapman-Kolmogorov:       π(n) = π(0) · P^n
  2. Distribución estacionaria: πP = π,  Σπᵢ = 1
  3. Tiempo medio de primer pasaje (Mean First Passage Time)
"""

from __future__ import annotations
from typing import List, Tuple
from utils.matrix_operations import (
    multiply, power, identity, inverse, subtract, add,
    _validate_matrix, _validate_square, Matrix,
)

TOLERANCE = 1e-9


# ─────────────────── Validaciones específicas de Markov ───────────────────

def validate_stochastic_matrix(P: Matrix) -> None:
    """
    Verifica que P sea una matriz estocástica por filas:
    - Cuadrada
    - Todos los elementos ≥ 0
    - Cada fila suma 1 (con tolerancia)
    """
    _validate_matrix(P, "P")
    _validate_square(P, "P")
    n = len(P)
    for i in range(n):
        row_sum = sum(P[i])
        if abs(row_sum - 1.0) > 1e-6:
            raise ValueError(
                f"La fila {i + 1} de la matriz P suma {row_sum:.6f}, debe sumar 1.0. "
                f"No es una matriz estocástica válida."
            )
        for j in range(n):
            if P[i][j] < -1e-9:
                raise ValueError(
                    f"P[{i + 1}][{j + 1}] = {P[i][j]:.6f} es negativo. "
                    f"Las probabilidades de transición deben ser ≥ 0."
                )


def validate_probability_vector(pi: List[float], n: int) -> None:
    """Verifica que π sea un vector de probabilidad válido de tamaño n."""
    if len(pi) != n:
        raise ValueError(
            f"El vector π(0) tiene {len(pi)} elementos, pero P es {n}×{n}."
        )
    s = sum(pi)
    if abs(s - 1.0) > 1e-6:
        raise ValueError(
            f"El vector π(0) suma {s:.6f}, debe sumar 1.0."
        )
    for i, v in enumerate(pi):
        if v < -1e-9:
            raise ValueError(
                f"π(0)[{i + 1}] = {v:.6f} es negativo."
            )


# ─────────────────── 1. Chapman-Kolmogorov ───────────────────

def chapman_kolmogorov(pi_0: List[float], P: Matrix, n: int) -> List[float]:
    """
    Calcula π(n) = π(0) · P^n

    Args:
        pi_0: Vector de probabilidad inicial (1×k como lista).
        P:    Matriz de transición k×k.
        n:    Número de pasos (unidades de tiempo).

    Returns:
        Vector π(n) como lista de floats.
    """
    validate_stochastic_matrix(P)
    k = len(P)
    validate_probability_vector(pi_0, k)
    if n < 0:
        raise ValueError("El número de pasos n debe ser ≥ 0.")

    # P^n
    Pn = power(P, n)

    # π(0) · P^n  →  vector fila × matriz
    # Representamos π(0) como matriz 1×k
    pi_0_mat = [pi_0]
    result_mat = multiply(pi_0_mat, Pn)
    return result_mat[0]


def chapman_kolmogorov_matrix(P: Matrix, n: int) -> Matrix:
    """
    Calcula P^n (la matriz de transición en n pasos).
    Útil para ver todas las probabilidades de transición a n pasos.
    """
    validate_stochastic_matrix(P)
    if n < 0:
        raise ValueError("El número de pasos n debe ser ≥ 0.")
    return power(P, n)


# ─────────────────── 2. Distribución estacionaria ───────────────────

def steady_state(P: Matrix) -> List[float]:
    """
    Calcula la distribución estacionaria π tal que πP = π y Σπᵢ = 1.

    Método:
        πP = π  ⟹  π(P - I) = 0  ⟹  (Pᵀ - I)πᵀ = 0
        Reemplazamos la última fila del sistema con la restricción Σπᵢ = 1.
        Resolvemos el sistema Ax = b por eliminación gaussiana.

    Returns:
        Vector π como lista de floats.
    """
    validate_stochastic_matrix(P)
    n = len(P)

    # Construir A = (Pᵀ - I)
    A = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            A[i][j] = P[j][i] - (1.0 if i == j else 0.0)

    b = [0.0] * n

    # Reemplazar última fila con restricción: π₁ + π₂ + ... + πₙ = 1
    for j in range(n):
        A[n - 1][j] = 1.0
    b[n - 1] = 1.0

    # Resolver Ax = b con eliminación gaussiana con pivoteo parcial
    pi = _solve_linear_system(A, b)

    # Ajustar posibles negativos muy pequeños por error numérico
    for i in range(n):
        if abs(pi[i]) < TOLERANCE:
            pi[i] = 0.0
        if pi[i] < 0:
            # Si es ligeramente negativo, ajustar
            if pi[i] > -1e-6:
                pi[i] = 0.0
            else:
                raise ValueError(
                    "No se pudo encontrar una distribución estacionaria válida. "
                    "Verifique que la cadena sea ergódica (irreducible y aperiódica)."
                )

    return pi


def _solve_linear_system(A: Matrix, b: List[float]) -> List[float]:
    """
    Resuelve Ax = b usando eliminación gaussiana con pivoteo parcial.
    Modifica copias internas.
    """
    n = len(A)
    # Crear matriz aumentada
    aug = [A[i][:] + [b[i]] for i in range(n)]

    for col in range(n):
        # Pivoteo parcial
        max_row = col
        for row in range(col + 1, n):
            if abs(aug[row][col]) > abs(aug[max_row][col]):
                max_row = row
        aug[col], aug[max_row] = aug[max_row], aug[col]

        pivot = aug[col][col]
        if abs(pivot) < 1e-12:
            raise ValueError(
                "El sistema es singular. La cadena podría no ser ergódica."
            )

        # Normalizar fila pivote
        for j in range(n + 1):
            aug[col][j] /= pivot

        # Eliminar
        for row in range(n):
            if row == col:
                continue
            factor = aug[row][col]
            for j in range(n + 1):
                aug[row][j] -= factor * aug[col][j]

    return [aug[i][n] for i in range(n)]


# ─────────────────── 3. Tiempo medio de primer pasaje ───────────────────

def mean_first_passage_time(P: Matrix) -> Matrix:
    """
    Calcula la matriz de tiempos medios de primer pasaje M.

    M_ij = número esperado de pasos para ir del estado i al estado j por primera vez.

    Método (Matriz Fundamental):
        1. Calcular π (distribución estacionaria).
        2. Construir W donde cada fila = π.
        3. Z = (I - P + W)⁻¹   (matriz fundamental)
        4. m_ij = (z_jj - z_ij) / π_j   para i ≠ j
           m_ii = 1 / π_i               (tiempo de recurrencia)

    La fórmula recursiva equivalente es:
        M_ij = 1 + Σ_{k≠j} p_ik · m_kj

    Returns:
        Matriz M de tiempos medios de primer pasaje.
    """
    validate_stochastic_matrix(P)
    n = len(P)

    # Paso 1: Distribución estacionaria
    pi = steady_state(P)

    # Verificar que ningún π_i sea 0 (necesario para dividir)
    for i in range(n):
        if abs(pi[i]) < TOLERANCE:
            raise ValueError(
                f"π[{i + 1}] ≈ 0. El estado {i + 1} podría no ser accesible. "
                f"Verifique que la cadena sea ergódica."
            )

    # Paso 2: Construir W (cada fila = π)
    W = [pi[:] for _ in range(n)]

    # Paso 3: Z = (I - P + W)⁻¹
    I_n = identity(n)
    # I - P
    I_minus_P = subtract(I_n, P)
    # I - P + W
    I_minus_P_plus_W = add(I_minus_P, W)
    # Z = (I - P + W)⁻¹
    Z = inverse(I_minus_P_plus_W)

    # Paso 4: Calcular M
    M = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                # Tiempo de recurrencia
                M[i][j] = 1.0 / pi[j]
            else:
                M[i][j] = (Z[j][j] - Z[i][j]) / pi[j]

    return M


# ─────────────────── Utilidades extra ───────────────────

def classify_states(P: Matrix) -> dict:
    """
    Clasifica los estados de la cadena de Markov.
    Retorna información básica sobre la estructura.
    """
    validate_stochastic_matrix(P)
    n = len(P)

    # Verificar si es ergódica: todos los estados se comunican
    # Usamos alcanzabilidad con potencias sucesivas de P
    # Si P^(n-1) + P^(n-2) + ... + P + I tiene todos > 0 → es irreducible
    A = identity(n)
    cumulative = [row[:] for row in A]
    current = [row[:] for row in P]

    for step in range(1, n * n + 1):
        cumulative = add(cumulative, current)
        current = multiply(current, P)

    is_irreducible = all(
        cumulative[i][j] > TOLERANCE
        for i in range(n) for j in range(n)
    )

    return {
        "num_states": n,
        "is_irreducible": is_irreducible,
        "is_ergodic": is_irreducible,  # Para simplificar (falta verificar aperiodicidad)
    }
