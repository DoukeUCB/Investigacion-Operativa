"""
Capa de Datos / Utilidades – Teoría de Colas
============================================
Implementa fórmulas de desempeño para modelos clásicos de colas.
"""

from __future__ import annotations
from math import factorial
from typing import Dict, List

EPS = 1e-12


def _require_positive(value: float, name: str) -> None:
    if value <= 0:
        raise ValueError(f"{name} debe ser > 0.")


def _require_int_ge(value: int, name: str, minimum: int) -> None:
    if int(value) != value or value < minimum:
        raise ValueError(f"{name} debe ser un entero >= {minimum}.")


def _check_stability(rho: float, context: str = "") -> None:
    if rho >= 1.0 - EPS:
        suffix = f" en {context}" if context else ""
        raise ValueError(f"El sistema no es estable{suffix}: se requiere ρ < 1.")


def _pn_mm1(rho: float, n: int) -> float:
    return (1.0 - rho) * (rho ** n)


def _calc_mm1(lambda_rate: float, mu: float, n: int | None = None, max_n: int = 10) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    rho = lambda_rate / mu
    _check_stability(rho, "M/M/1")

    p0 = 1.0 - rho
    pw = rho
    lq = (rho ** 2) / (1.0 - rho)
    l = rho / (1.0 - rho)
    wq = lq / lambda_rate
    w = l / lambda_rate

    probs: List[Dict[str, float]] = []
    up_to = max_n if n is None else n
    _require_int_ge(up_to, "n/max_n", 0)
    for i in range(up_to + 1):
        probs.append({"n": i, "P_n": _pn_mm1(rho, i)})

    result = {
        "model": "M/M/1",
        "rho": rho,
        "P0": p0,
        "Pw": pw,
        "Lq": lq,
        "L": l,
        "Wq": wq,
        "W": w,
        "probabilities": probs,
    }
    if n is not None:
        result["Pn"] = _pn_mm1(rho, n)
    return result


def _mmk_core(lambda_rate: float, mu: float, k: int) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_int_ge(k, "k", 1)

    a = lambda_rate / mu
    rho = lambda_rate / (k * mu)
    _check_stability(rho, "M/M/k")

    sum1 = sum((a ** n) / factorial(n) for n in range(k))
    sum2 = (a ** k) / (factorial(k) * (1.0 - rho))
    p0 = 1.0 / (sum1 + sum2)

    pw = ((a ** k) / (factorial(k) * (1.0 - rho))) * p0
    lq = (pw * rho) / (1.0 - rho)
    l = lq + (lambda_rate / mu)
    wq = lq / lambda_rate
    w = wq + (1.0 / mu)

    return {
        "a": a,
        "rho": rho,
        "P0": p0,
        "Pw": pw,
        "Lq": lq,
        "L": l,
        "Wq": wq,
        "W": w,
    }


def _pn_mmk(a: float, p0: float, k: int, n: int) -> float:
    if n <= k:
        return ((a ** n) / factorial(n)) * p0
    return ((a ** n) / (factorial(k) * (k ** (n - k)))) * p0


def _calc_mmk(lambda_rate: float, mu: float, k: int, n: int | None = None, max_n: int = 15) -> Dict:
    core = _mmk_core(lambda_rate, mu, k)
    probs: List[Dict[str, float]] = []
    up_to = max_n if n is None else n
    _require_int_ge(up_to, "n/max_n", 0)

    for i in range(up_to + 1):
        probs.append({"n": i, "P_n": _pn_mmk(core["a"], core["P0"], k, i)})

    result = {
        "model": "M/M/k",
        "k": k,
        **core,
        "probabilities": probs,
    }
    if n is not None:
        result["Pn"] = _pn_mmk(core["a"], core["P0"], k, n)
    return result


def _calc_mg1(lambda_rate: float, mu: float, e_s2: float) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_positive(e_s2, "E[S^2]")

    rho = lambda_rate / mu
    _check_stability(rho, "M/G/1")

    p0 = 1.0 - rho
    pw = rho
    lq = (lambda_rate ** 2) * e_s2 / (2.0 * (1.0 - rho))
    l = lq + rho
    wq = lq / lambda_rate
    w = wq + (1.0 / mu)

    return {
        "model": "M/G/1",
        "rho": rho,
        "P0": p0,
        "Pw": pw,
        "Lq": lq,
        "L": l,
        "Wq": wq,
        "W": w,
        "E_S2": e_s2,
    }


def _calc_md1(lambda_rate: float, mu: float) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")

    rho = lambda_rate / mu
    _check_stability(rho, "M/D/1")

    p0 = 1.0 - rho
    pw = rho
    lq = (rho ** 2) / (2.0 * (1.0 - rho))
    l = lq + rho
    wq = lq / lambda_rate
    w = wq + (1.0 / mu)

    return {
        "model": "M/D/1",
        "rho": rho,
        "P0": p0,
        "Pw": pw,
        "Lq": lq,
        "L": l,
        "Wq": wq,
        "W": w,
    }


def _calc_mgk(lambda_rate: float, mu: float, k: int, c_s2: float) -> Dict:
    _require_positive(c_s2 + 1.0, "C_s^2 + 1")
    mmk = _mmk_core(lambda_rate, mu, k)

    pw_approx = mmk["Pw"] * ((1.0 + c_s2) / 2.0)
    pw_approx = min(max(pw_approx, 0.0), 1.0)

    rho = mmk["rho"]
    lq = pw_approx * (rho / (1.0 - rho)) * k
    l = lq + (lambda_rate / mu)
    wq = lq / lambda_rate
    w = wq + (1.0 / mu)

    return {
        "model": "M/G/k",
        "k": k,
        "rho": rho,
        "C_s2": c_s2,
        "Pw_MMk": mmk["Pw"],
        "Pw": pw_approx,
        "Lq": lq,
        "L": l,
        "Wq": wq,
        "W": w,
        "approximation": "Allen–Cunneen",
    }


def _build_pn_finite_mm1(lambda_rate: float, mu: float, n_pop: int) -> List[float]:
    terms = []
    for n in range(n_pop + 1):
        term = (factorial(n_pop) / factorial(n_pop - n)) * ((lambda_rate / mu) ** n)
        terms.append(term)

    p0 = 1.0 / sum(terms)
    return [term * p0 for term in terms]


def _calc_finite_mm1(lambda_rate: float, mu: float, n_pop: int) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_int_ge(n_pop, "N", 1)

    pn = _build_pn_finite_mm1(lambda_rate, mu, n_pop)
    p0 = pn[0]
    l = sum(n * pn[n] for n in range(n_pop + 1))
    lambda_eff = lambda_rate * (n_pop - l)
    if lambda_eff <= EPS:
        raise ValueError("λ_eff es no positivo. Verifica parámetros de fuente finita.")

    w = l / lambda_eff
    wq = w - (1.0 / mu)
    lq = lambda_eff * wq

    probs = [{"n": n, "P_n": pn[n]} for n in range(n_pop + 1)]

    return {
        "model": "M/M/1/N (fuente finita)",
        "N": n_pop,
        "P0": p0,
        "L": l,
        "lambda_eff": lambda_eff,
        "W": w,
        "Wq": wq,
        "Lq": lq,
        "probabilities": probs,
        "P_system_full": pn[n_pop],
    }


def _pn_finite_mmk(lambda_rate: float, mu: float, k: int, n_pop: int, n: int, p0: float) -> float:
    common = (factorial(n_pop) / factorial(n_pop - n)) * ((lambda_rate / mu) ** n)
    if n <= k:
        return common * (1.0 / factorial(n)) * p0
    return common * (1.0 / (factorial(k) * (k ** (n - k)))) * p0


def _calc_finite_mmk(lambda_rate: float, mu: float, k: int, n_pop: int) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_int_ge(k, "k", 1)
    _require_int_ge(n_pop, "N", 1)
    if k > n_pop:
        raise ValueError("Para fuente finita, se requiere k <= N.")

    sum1 = 0.0
    for n in range(0, k + 1):
        sum1 += (factorial(n_pop) / factorial(n_pop - n)) * ((lambda_rate / mu) ** n) / factorial(n)

    sum2 = 0.0
    for n in range(k + 1, n_pop + 1):
        sum2 += (factorial(n_pop) / factorial(n_pop - n)) * ((lambda_rate / mu) ** n) / (factorial(k) * (k ** (n - k)))

    p0 = 1.0 / (sum1 + sum2)

    pn = [_pn_finite_mmk(lambda_rate, mu, k, n_pop, n, p0) for n in range(n_pop + 1)]
    l = sum(n * pn[n] for n in range(n_pop + 1))
    lambda_eff = lambda_rate * (n_pop - l)
    if lambda_eff <= EPS:
        raise ValueError("λ_eff es no positivo. Verifica parámetros de fuente finita.")

    w = l / lambda_eff
    wq = w - (1.0 / mu)
    lq = lambda_eff * wq

    probs = [{"n": n, "P_n": pn[n]} for n in range(n_pop + 1)]

    return {
        "model": "M/M/k/N (fuente finita)",
        "k": k,
        "N": n_pop,
        "P0": p0,
        "L": l,
        "lambda_eff": lambda_eff,
        "W": w,
        "Wq": wq,
        "Lq": lq,
        "probabilities": probs,
        "Pw": sum(pn[n] for n in range(k, n_pop + 1)),
        "P_system_full": pn[n_pop],
    }


def calculate_queue_metrics(model: str, payload: Dict) -> Dict:
    model = (model or "").strip().lower()
    n_value = payload.get("n")
    n_optional = int(n_value) if n_value is not None and str(n_value) != "" else None

    if model == "mm1":
        return _calc_mm1(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            n_optional,
            int(payload.get("max_n", 10)),
        )

    if model == "mmk":
        return _calc_mmk(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            int(payload.get("k", 1)),
            n_optional,
            int(payload.get("max_n", 15)),
        )

    if model == "mg1":
        return _calc_mg1(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            float(payload.get("e_s2", 0)),
        )

    if model == "md1":
        return _calc_md1(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
        )

    if model == "mgk":
        return _calc_mgk(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            int(payload.get("k", 1)),
            float(payload.get("c_s2", 1.0)),
        )

    if model == "finite_mm1":
        return _calc_finite_mm1(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            int(payload.get("N", 1)),
        )

    if model == "finite_mmk":
        return _calc_finite_mmk(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            int(payload.get("k", 1)),
            int(payload.get("N", 1)),
        )

    if model == "mmk_infinite_finite_peps":
        result = _calc_finite_mmk(
            float(payload.get("lambda_rate", 0)),
            float(payload.get("mu", 0)),
            int(payload.get("k", 1)),
            int(payload.get("N", 1)),
        )
        result["model"] = "M/M/k/∞/N/PEPS"
        return result

    raise ValueError(
        "Modelo de colas desconocido. Use: "
        "mm1, mmk, mg1, md1, mgk, finite_mm1, finite_mmk, mmk_infinite_finite_peps"
    )
