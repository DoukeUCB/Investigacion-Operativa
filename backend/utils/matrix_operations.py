"""
Capa de Datos / Utilidades
==========================
Operaciones fundamentales sobre matrices representadas como listas de listas.
Todas las funciones son puras (sin efectos secundarios) y trabajan con
matrices de dimensión máxima 5×5.
"""

from __future__ import annotations
from typing import List
import copy
import math

Matrix = List[List[float]]

# ──────────────────────────── Validaciones ────────────────────────────

MAX_DIM = 10  # dimensión máxima permitida


def _validate_matrix(m: Matrix, name: str = "Matriz") -> None:
    """Valida que la estructura sea una matriz rectangular no vacía."""
    if not m or not m[0]:
        raise ValueError(f"{name} no puede estar vacía.")
    rows = len(m)
    cols = len(m[0])
    if rows > MAX_DIM or cols > MAX_DIM:
        raise ValueError(f"{name} excede la dimensión máxima permitida ({MAX_DIM}×{MAX_DIM}).")
    for i, row in enumerate(m):
        if len(row) != cols:
            raise ValueError(f"{name}: la fila {i} tiene {len(row)} columnas, se esperaban {cols}.")


def _validate_same_shape(a: Matrix, b: Matrix) -> None:
    """Verifica que dos matrices tengan las mismas dimensiones."""
    if len(a) != len(b) or len(a[0]) != len(b[0]):
        raise ValueError(
            f"Las matrices deben tener las mismas dimensiones: "
            f"A es {len(a)}×{len(a[0])}, B es {len(b)}×{len(b[0])}."
        )


def _validate_square(m: Matrix, name: str = "Matriz") -> None:
    """Verifica que la matriz sea cuadrada."""
    if len(m) != len(m[0]):
        raise ValueError(f"{name} debe ser cuadrada ({len(m)}×{len(m[0])}).")


# ──────────────────────── Operaciones básicas ─────────────────────────

def add(a: Matrix, b: Matrix) -> Matrix:
    """Suma de dos matrices A + B."""
    _validate_matrix(a, "A")
    _validate_matrix(b, "B")
    _validate_same_shape(a, b)
    rows, cols = len(a), len(a[0])
    return [[a[i][j] + b[i][j] for j in range(cols)] for i in range(rows)]


def subtract(a: Matrix, b: Matrix) -> Matrix:
    """Resta de dos matrices A − B."""
    _validate_matrix(a, "A")
    _validate_matrix(b, "B")
    _validate_same_shape(a, b)
    rows, cols = len(a), len(a[0])
    return [[a[i][j] - b[i][j] for j in range(cols)] for i in range(rows)]


def scalar_multiply(scalar: float, m: Matrix) -> Matrix:
    """Multiplicación escalar k · M."""
    _validate_matrix(m)
    rows, cols = len(m), len(m[0])
    return [[scalar * m[i][j] for j in range(cols)] for i in range(rows)]


def multiply(a: Matrix, b: Matrix) -> Matrix:
    """Multiplicación de matrices A × B.  (A: m×n, B: n×p → resultado: m×p)"""
    _validate_matrix(a, "A")
    _validate_matrix(b, "B")
    if len(a[0]) != len(b):
        raise ValueError(
            f"No se puede multiplicar: A tiene {len(a[0])} columnas y B tiene {len(b)} filas."
        )
    m, n, p = len(a), len(a[0]), len(b[0])
    result = [[0.0] * p for _ in range(m)]
    for i in range(m):
        for j in range(p):
            s = 0.0
            for k in range(n):
                s += a[i][k] * b[k][j]
            result[i][j] = s
    return result


def transpose(m: Matrix) -> Matrix:
    """Transpuesta de M."""
    _validate_matrix(m)
    rows, cols = len(m), len(m[0])
    return [[m[i][j] for i in range(rows)] for j in range(cols)]


# ──────────────────────── Determinante ────────────────────────────────

def determinant(m: Matrix) -> float:
    """Calcula el determinante de una matriz cuadrada usando eliminación gaussiana."""
    _validate_matrix(m)
    _validate_square(m)
    n = len(m)
    # Copia de trabajo
    mat = [row[:] for row in m]
    det = 1.0
    for col in range(n):
        # Pivoteo parcial
        max_row = col
        for row in range(col + 1, n):
            if abs(mat[row][col]) > abs(mat[max_row][col]):
                max_row = row
        if max_row != col:
            mat[col], mat[max_row] = mat[max_row], mat[col]
            det *= -1
        pivot = mat[col][col]
        if abs(pivot) < 1e-12:
            return 0.0
        det *= pivot
        for row in range(col + 1, n):
            factor = mat[row][col] / pivot
            for j in range(col, n):
                mat[row][j] -= factor * mat[col][j]
    return det


# ──────────────────────── Matriz identidad ────────────────────────────

def identity(n: int) -> Matrix:
    """Genera la matriz identidad de n×n."""
    if n < 1 or n > MAX_DIM:
        raise ValueError(f"Dimensión inválida: {n}. Debe estar entre 1 y {MAX_DIM}.")
    return [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]


# ──────────────────────── Inversa ─────────────────────────────────────

def inverse(m: Matrix) -> Matrix:
    """Calcula la inversa de una matriz cuadrada usando Gauss-Jordan."""
    _validate_matrix(m)
    _validate_square(m)
    n = len(m)
    # Matriz aumentada [M | I]
    aug = [m[i][:] + identity(n)[i] for i in range(n)]

    for col in range(n):
        # Pivoteo parcial
        max_row = col
        for row in range(col + 1, n):
            if abs(aug[row][col]) > abs(aug[max_row][col]):
                max_row = row
        aug[col], aug[max_row] = aug[max_row], aug[col]

        pivot = aug[col][col]
        if abs(pivot) < 1e-12:
            raise ValueError("La matriz es singular (no invertible).")

        # Normalizar fila pivote
        for j in range(2 * n):
            aug[col][j] /= pivot

        # Eliminar columna
        for row in range(n):
            if row == col:
                continue
            factor = aug[row][col]
            for j in range(2 * n):
                aug[row][j] -= factor * aug[col][j]

    # Extraer la parte derecha
    return [row[n:] for row in aug]


# ──────────────────────── Potencia ────────────────────────────────────

def power(m: Matrix, exp: int) -> Matrix:
    """Calcula M^exp para una matriz cuadrada. exp >= 0."""
    _validate_matrix(m)
    _validate_square(m)
    n = len(m)
    if exp < 0:
        raise ValueError("El exponente debe ser >= 0.")
    if exp == 0:
        return identity(n)
    result = identity(n)
    base = [row[:] for row in m]
    e = exp
    while e > 0:
        if e % 2 == 1:
            result = multiply(result, base)
        base = multiply(base, base)
        e //= 2
    return result


# ──────────────────────── Traza ───────────────────────────────────────

def trace(m: Matrix) -> float:
    """Calcula la traza (suma de la diagonal) de una matriz cuadrada."""
    _validate_matrix(m)
    _validate_square(m)
    return sum(m[i][i] for i in range(len(m)))


# ──────────────────────── Rango ───────────────────────────────────────

def rank(m: Matrix) -> int:
    """Calcula el rango de la matriz mediante eliminación gaussiana."""
    _validate_matrix(m)
    rows, cols = len(m), len(m[0])
    mat = [row[:] for row in m]
    r = 0
    for col in range(cols):
        # Buscar pivote
        pivot_row = None
        for row in range(r, rows):
            if abs(mat[row][col]) > 1e-12:
                pivot_row = row
                break
        if pivot_row is None:
            continue
        mat[r], mat[pivot_row] = mat[pivot_row], mat[r]
        pivot = mat[r][col]
        for j in range(cols):
            mat[r][j] /= pivot
        for row in range(rows):
            if row == r:
                continue
            factor = mat[row][col]
            for j in range(cols):
                mat[row][j] -= factor * mat[r][j]
        r += 1
    return r


# ──────────────────── Forma escalonada (RREF) ─────────────────────────

def rref(m: Matrix) -> Matrix:
    """Forma escalonada reducida por filas (Reduced Row Echelon Form)."""
    _validate_matrix(m)
    rows, cols = len(m), len(m[0])
    mat = [row[:] for row in m]
    r = 0
    for col in range(cols):
        pivot_row = None
        for row in range(r, rows):
            if abs(mat[row][col]) > 1e-12:
                pivot_row = row
                break
        if pivot_row is None:
            continue
        mat[r], mat[pivot_row] = mat[pivot_row], mat[r]
        pivot = mat[r][col]
        for j in range(cols):
            mat[r][j] /= pivot
        for row in range(rows):
            if row == r:
                continue
            factor = mat[row][col]
            for j in range(cols):
                mat[row][j] -= factor * mat[r][j]
        r += 1
    return mat


# ──────────────────── Valores propios (2×2 y 3×3) ────────────────────

def eigenvalues_2x2(m: Matrix) -> List[complex]:
    """Valores propios de una matriz 2×2 usando la fórmula cuadrática."""
    _validate_matrix(m)
    _validate_square(m)
    if len(m) != 2:
        raise ValueError("Esta función solo acepta matrices 2×2.")
    a, b = m[0][0], m[0][1]
    c, d = m[1][0], m[1][1]
    tr = a + d
    det = a * d - b * c
    disc = tr * tr - 4 * det
    if disc >= 0:
        sq = math.sqrt(disc)
        return [(tr + sq) / 2, (tr - sq) / 2]
    else:
        sq = math.sqrt(-disc)
        return [complex(tr / 2, sq / 2), complex(tr / 2, -sq / 2)]


# ──────────────────── Adjunta (matriz de cofactores transpuesta) ──────

def _minor(m: Matrix, row: int, col: int) -> Matrix:
    """Submatriz eliminando fila y columna."""
    return [
        [m[i][j] for j in range(len(m[0])) if j != col]
        for i in range(len(m)) if i != row
    ]


def cofactor_matrix(m: Matrix) -> Matrix:
    """Matriz de cofactores."""
    _validate_matrix(m)
    _validate_square(m)
    n = len(m)
    cof = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            minor_det = determinant(_minor(m, i, j))
            cof[i][j] = ((-1) ** (i + j)) * minor_det
    return cof


def adjugate(m: Matrix) -> Matrix:
    """Matriz adjunta (transpuesta de la matriz de cofactores)."""
    return transpose(cofactor_matrix(m))
