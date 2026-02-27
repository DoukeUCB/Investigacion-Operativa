"""
Capa de Datos / Utilidades – Cadenas de Markov
===============================================
Operaciones para cadenas de Markov:

  A) Ergódicas (estados transitorios):
    1. Chapman-Kolmogorov:       π(n) = π(0) · P^n
    2. Distribución estacionaria: πP = π,  Σπᵢ = 1
    3. Tiempo medio de primer pasaje (Mean First Passage Time)

  B) Absorbentes:
    1. Forma canónica:  [ I  0 ]
                        [ R  Q ]
    2. Matriz fundamental:  N = (I − Q)⁻¹
    3. Probabilidades de absorción:  B = N · R
    4. Predicción con vector inicial b:  b · B
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


# ═══════════════════════════════════════════════════════════════════════════
#  CADENAS DE MARKOV CON ESTADOS ABSORBENTES
# ═══════════════════════════════════════════════════════════════════════════

def identify_absorbing_states(P: Matrix) -> List[int]:
    """
    Identifica los estados absorbentes de la matriz P.
    Un estado i es absorbente si P[i][i] == 1 (y el resto de la fila es 0).

    Returns:
        Lista de índices (0-based) de estados absorbentes.
    """
    validate_stochastic_matrix(P)
    n = len(P)
    absorbing = []
    for i in range(n):
        if abs(P[i][i] - 1.0) < 1e-9:
            # Verificar que el resto sea 0
            all_zero = all(abs(P[i][j]) < 1e-9 for j in range(n) if j != i)
            if all_zero:
                absorbing.append(i)
    return absorbing


def canonical_form(
    P: Matrix,
    absorbing_indices: List[int] | None = None,
) -> dict:
    """
    Reordena P en forma canónica para cadenas absorbentes:

        | I  0 |     absorbing (s estados)
        | R  Q |     transient  (t estados)

    Args:
        P: Matriz de transición original.
        absorbing_indices: Índices de estados absorbentes (auto-detectados si None).

    Returns:
        dict con:
          - order_absorbing: índices originales de estados absorbentes
          - order_transient: índices originales de estados transitorios
          - I_mat: matriz identidad s×s
          - O_mat: matriz de ceros s×t
          - R: sub-matriz t×s (transitorios → absorbentes)
          - Q: sub-matriz t×t (transitorios → transitorios)
          - P_canonical: la matriz completa reordenada (s+t)×(s+t)
    """
    validate_stochastic_matrix(P)
    n = len(P)

    if absorbing_indices is None:
        absorbing_indices = identify_absorbing_states(P)

    if len(absorbing_indices) == 0:
        raise ValueError(
            "No se encontraron estados absorbentes (ninguna fila tiene P[i][i]=1). "
            "Esta cadena no es absorbente."
        )

    absorbing_set = set(absorbing_indices)
    transient_indices = [i for i in range(n) if i not in absorbing_set]

    if len(transient_indices) == 0:
        raise ValueError(
            "Todos los estados son absorbentes. No hay estados transitorios."
        )

    s = len(absorbing_indices)   # cantidad de absorbentes
    t = len(transient_indices)   # cantidad de transitorios

    # Sub-matrices
    # R (t × s): transitorios → absorbentes
    R = [[P[i][j] for j in absorbing_indices] for i in transient_indices]

    # Q (t × t): transitorios → transitorios
    Q = [[P[i][j] for j in transient_indices] for i in transient_indices]

    # I (s × s) y 0 (s × t)
    I_mat = identity(s)
    O_mat = [[0.0] * t for _ in range(s)]

    # Matriz canónica completa
    P_canonical = []
    for i in range(s):
        P_canonical.append(I_mat[i] + O_mat[i])
    for i in range(t):
        P_canonical.append(R[i] + Q[i])

    return {
        "order_absorbing": absorbing_indices,
        "order_transient": transient_indices,
        "s": s,
        "t": t,
        "I_mat": I_mat,
        "O_mat": O_mat,
        "R": R,
        "Q": Q,
        "P_canonical": P_canonical,
    }


def fundamental_matrix(Q: Matrix) -> Matrix:
    """
    Calcula la matriz fundamental N = (I − Q)⁻¹.

    N_ij = número esperado de veces que se visita el estado transitorio j
           partiendo del estado transitorio i antes de la absorción.

    Args:
        Q: Sub-matriz cuadrada de transiciones entre estados transitorios.

    Returns:
        Matriz fundamental N.
    """
    t = len(Q)
    I_t = identity(t)
    I_minus_Q = subtract(I_t, Q)
    N = inverse(I_minus_Q)
    return N


def absorption_probabilities(N: Matrix, R: Matrix) -> Matrix:
    """
    Calcula las probabilidades de absorción B = N · R.

    B_ij = probabilidad de ser absorbido por el estado absorbente j
           partiendo del estado transitorio i.

    Args:
        N: Matriz fundamental (t × t).
        R: Sub-matriz de transición transitorios → absorbentes (t × s).

    Returns:
        Matriz B (t × s).
    """
    return multiply(N, R)


def absorbing_chain_analysis(
    P: Matrix,
    b: List[float] | None = None,
    absorbing_indices: List[int] | None = None,
) -> dict:
    """
    Análisis completo de una cadena de Markov absorbente.

    Pasos:
      1. Identificar estados absorbentes y reordenar en forma canónica
      2. Calcular la matriz fundamental  N = (I − Q)⁻¹
      3. Calcular probabilidades de absorción  B = N · R
      4. (Opcional) Si se da un vector b (distribución sobre estados transitorios):
         Resultado = b · B

    Args:
        P: Matriz de transición original.
        b: Vector de distribución inicial sobre estados transitorios (opcional).
        absorbing_indices: Índices de estados absorbentes (auto-detectados si None).

    Returns:
        Diccionario con toda la información intermedia y final.
    """
    canon = canonical_form(P, absorbing_indices)

    Q = canon["Q"]
    R = canon["R"]
    t = canon["t"]

    # Paso 2: Matriz fundamental
    N = fundamental_matrix(Q)

    # Paso 3: Probabilidades de absorción
    B = absorption_probabilities(N, R)

    result = {
        **canon,
        "N": N,
        "B": B,
    }

    # Paso 4: Predicción con vector b (opcional)
    if b is not None:
        if len(b) != t:
            raise ValueError(
                f"El vector b tiene {len(b)} elementos, pero hay {t} estados transitorios."
            )
        # b · B  →  vector fila × matriz
        b_mat = [b]
        bB = multiply(b_mat, B)
        result["b"] = b
        result["b_B"] = bB[0]

    return result
