"""
Capa de Datos / Utilidades – Teoría de Colas
============================================
Implementa fórmulas de desempeño para modelos clásicos de colas.
"""

from __future__ import annotations
from math import factorial
from typing import Dict, List

EPS = 1e-12


def _parse_real(value, name: str) -> float:
    if isinstance(value, (int, float)):
        parsed = float(value)
    else:
        raw = str(value).strip()
        if raw == "":
            raise ValueError(f"{name} no puede estar vacío.")
        if "/" in raw:
            parts = [p.strip() for p in raw.split("/")]
            if len(parts) != 2 or parts[0] == "" or parts[1] == "":
                raise ValueError(f"{name} tiene formato de fracción inválido. Use a/b.")
            numerator = float(parts[0])
            denominator = float(parts[1])
            if abs(denominator) <= EPS:
                raise ValueError(f"{name} tiene denominador 0.")
            parsed = numerator / denominator
        else:
            parsed = float(raw)

    if parsed != parsed or parsed in (float("inf"), float("-inf")):
        raise ValueError(f"{name} debe ser un número real finito.")
    return parsed


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

    e_s = 1.0 / mu
    var_s = e_s2 - (e_s ** 2)
    if var_s < 0 and abs(var_s) <= EPS:
        var_s = 0.0
    sigma_s = (var_s ** 0.5) if var_s >= 0 else float("nan")

    p0 = 1.0 - rho
    pw = rho
    lq = (lambda_rate ** 2) * e_s2 / (2.0 * (1.0 - rho))
    lq_equivalent = ((rho ** 2) + ((lambda_rate ** 2) * var_s)) / (2.0 * (1.0 - rho))
    l = lq + rho
    wq = lq / lambda_rate
    w = wq + (1.0 / mu)

    return {
        "model": "M/G/1",
        "rho": rho,
        "P0": p0,
        "Pw": pw,
        "Lq": lq,
        "Lq_equivalent": lq_equivalent,
        "L": l,
        "Wq": wq,
        "W": w,
        "Sigma_S": sigma_s,
        "E_S": e_s,
        "E_S2": e_s2,
        "Var_S": var_s,
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


def _calc_mgk(lambda_rate: float, mu: float, k: int, n: int | None = None) -> Dict:
    """
    Modelo M/G/k: llegadas Poisson, k servidores, servicio general.
    
    Fórmula de Pj (prob. de j servidores ocupados):
        Pj = (ρ^j / j!) / Σ(ρ^i / i!, i=0..k)
    donde ρ = λ/μ (intensidad de tráfico, no utilización).
    """
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_int_ge(k, "k", 1)
    if n is not None:
        _require_int_ge(n, "n", 0)
        if n > k:
            raise ValueError("Para M/G/k por estados, se requiere n <= k.")

    rho = lambda_rate / mu

    # Calcular denominador de la fórmula de Pj
    denominator = sum((rho ** i) / factorial(i) for i in range(k + 1))
    if denominator <= EPS:
        raise ValueError("No se puede calcular Pj: denominador no positivo.")

    # Calcular Pj para j = 0, 1, ..., k
    # Pj = (ρ^j / j!) / Σ(ρ^i / i!)
    p_list = [((rho ** j) / factorial(j)) / denominator for j in range(k + 1)]
    p0 = p_list[0]
    p_k = p_list[k]

    lambda_eff = lambda_rate * (1.0 - p_k)
    l = sum(j * p_list[j] for j in range(k + 1))
    if lambda_eff <= EPS:
        raise ValueError("λ_eff es no positivo. Verifica parámetros del modelo M/G/k.")

    w = l / lambda_eff
    wq = w - (1.0 / mu)
    lq = lambda_eff * wq

    # Lista de probabilidades Pj
    probs = [{"n": j, "P_n": p_list[j]} for j in range(k + 1)]

    return {
        "model": "M/G/k",
        "k": k,
        "rho": rho,
        "P0": p0,
        "Pk": p_k,
        "P_system_full": p_k,
        "Pw": p_k,
        "lambda_eff": lambda_eff,
        "L": l,
        "W": w,
        "Wq": wq,
        "Lq": lq,
        "probabilities": probs,
        "formula_Pj": "Pj = (ρ^j / j!) / Σ(ρ^i / i!, i=0..k)",
        **({"n": n, "Pn": p_list[n]} if n is not None else {}),
    }


def _build_pn_finite_mm1(lambda_rate: float, mu: float, n_pop: int) -> List[float]:
    terms = []
    for n in range(n_pop + 1):
        term = (factorial(n_pop) / factorial(n_pop - n)) * ((lambda_rate / mu) ** n)
        terms.append(term)

    p0 = 1.0 / sum(terms)
    return [term * p0 for term in terms]


def _calc_finite_mm1(lambda_rate: float, mu: float, n_pop: int, n: int | None = None) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_int_ge(n_pop, "N", 1)
    if n is not None:
        _require_int_ge(n, "n", 0)
        if n > n_pop:
            raise ValueError("Para M/M/1/N (fuente finita), se requiere n <= N.")

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

    result = {
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

    if n is not None:
        rho_n = ((n_pop - n) * lambda_rate) / mu
        result["n"] = n
        result["Pn"] = pn[n]
        result["rho_n"] = rho_n

    return result


def _pn_finite_mmk(lambda_rate: float, mu: float, k: int, n_pop: int, n: int, p0: float) -> float:
    common = (factorial(n_pop) / factorial(n_pop - n)) * ((lambda_rate / mu) ** n)
    if n <= k:
        return common * (1.0 / factorial(n)) * p0
    return common * (1.0 / (factorial(k) * (k ** (n - k)))) * p0


def _calc_finite_mmk(lambda_rate: float, mu: float, k: int, n_pop: int, n: int | None = None) -> Dict:
    _require_positive(lambda_rate, "λ")
    _require_positive(mu, "μ")
    _require_int_ge(k, "k", 1)
    _require_int_ge(n_pop, "N", 1)
    if k > n_pop:
        raise ValueError("Para fuente finita, se requiere k <= N.")
    if n is not None:
        _require_int_ge(n, "n", 0)
        if n > n_pop:
            raise ValueError("Para M/M/k/N (fuente finita), se requiere n <= N.")

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

    result = {
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

    if n is not None:
        result["n"] = n
        result["Pn"] = pn[n]

    return result


def calculate_queue_metrics(model: str, payload: Dict) -> Dict:
    model = (model or "").strip().lower()
    n_value = payload.get("n")
    n_optional = int(n_value) if n_value is not None and str(n_value) != "" else None

    if model == "mm1":
        return _calc_mm1(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
            n_optional,
            int(payload.get("max_n", 10)),
        )

    if model == "mmk":
        return _calc_mmk(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
            int(payload.get("k", 1)),
            n_optional,
            int(payload.get("max_n", 15)),
        )

    if model == "mg1":
        mu_value = _parse_real(payload.get("mu", 0), "μ")
        sigma_s_raw = payload.get("sigma_s")
        if sigma_s_raw is not None and str(sigma_s_raw) != "":
            sigma_s = _parse_real(sigma_s_raw, "σ (desviación estándar de servicio)")
            if sigma_s < 0:
                raise ValueError("σ (desviación estándar de servicio) debe ser >= 0.")
            e_s2_value = (sigma_s ** 2) + ((1.0 / mu_value) ** 2)
        else:
            e_s2_value = _parse_real(payload.get("e_s2", 0), "E[S²]")

        return _calc_mg1(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            mu_value,
            e_s2_value,
        )

    if model == "md1":
        return _calc_md1(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
        )

    if model == "mgk":
        return _calc_mgk(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
            int(payload.get("k", 1)),
            n_optional,
        )

    if model == "finite_mm1":
        return _calc_finite_mm1(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
            int(payload.get("N", 1)),
            n_optional,
        )

    if model == "finite_mmk":
        return _calc_finite_mmk(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
            int(payload.get("k", 1)),
            int(payload.get("N", 1)),
            n_optional,
        )

    if model == "mmk_infinite_finite_peps":
        result = _calc_finite_mmk(
            _parse_real(payload.get("lambda_rate", 0), "λ"),
            _parse_real(payload.get("mu", 0), "μ"),
            int(payload.get("k", 1)),
            int(payload.get("N", 1)),
            n_optional,
        )
        result["model"] = "M/M/k/∞/N/PEPS"
        return result

    raise ValueError(
        "Modelo de colas desconocido. Use: "
        "mm1, mmk, mg1, md1, mgk, finite_mm1, finite_mmk, mmk_infinite_finite_peps"
    )


def _extract_server_count(result: Dict, payload: Dict) -> int:
    if "k" in result:
        return int(result["k"])

    model = (payload.get("model") or "").strip().lower()
    if model in {"mm1", "mg1", "md1", "finite_mm1"}:
        return 1

    return int(payload.get("k", 1))


def calculate_economic_analysis(model: str, payload: Dict, result: Dict | None = None) -> Dict:
    cw = _parse_real(payload.get("cw", 0), "Cw")
    cs = _parse_real(payload.get("cs", 0), "Cs")
    basis = str(payload.get("wait_cost_basis", "Lq")).upper()
    optimize_k = bool(payload.get("optimize_k_economic", False))
    manual_economic = bool(payload.get("manual_economic", False))

    if cw < 0:
        raise ValueError("Cw debe ser >= 0.")
    if cs < 0:
        raise ValueError("Cs debe ser >= 0.")
    if basis not in {"L", "LQ"}:
        raise ValueError("wait_cost_basis debe ser 'L' o 'Lq'.")

    queue_metric_name = "L" if basis == "L" else "Lq"

    metrics = result if result is not None else calculate_queue_metrics(model, payload)

    if manual_economic:
        wait_metric_value = _parse_real(payload.get("manual_wait_metric_value", 0), f"{queue_metric_name} manual")
        if wait_metric_value < 0:
            raise ValueError(f"{queue_metric_name} manual debe ser >= 0.")
        k_current = int(payload.get("manual_k", 1))
        if k_current < 1:
            raise ValueError("K actual manual debe ser entero >= 1.")
    else:
        wait_metric_value = float(metrics.get(queue_metric_name, 0.0))
        k_current = _extract_server_count(metrics, payload)

    waiting_cost = cw * wait_metric_value
    service_cost = cs * k_current
    total_cost = waiting_cost + service_cost

    economic = {
        "cost_basis": queue_metric_name,
        "Cw": cw,
        "Cs": cs,
        "K": k_current,
        "wait_metric_value": wait_metric_value,
        "waiting_cost": waiting_cost,
        "service_cost": service_cost,
        "total_cost": total_cost,
        "formula": f"CT = Cw·{queue_metric_name} + K·Cs",
        "recommendation_text": "Decisión base: usar la configuración actual y comparar alternativas de K para validar si existe un CT menor.",
        "manual_mode": manual_economic,
    }

    if not optimize_k:
        return economic

    model_key = (model or "").strip().lower()
    optimizable_models = {"mmk", "mgk", "finite_mmk", "mmk_infinite_finite_peps"}

    if model_key not in optimizable_models:
        economic["optimization"] = {
            "enabled": False,
            "message": "Este modelo no admite optimización por K (o K es fijo).",
            "candidates": [],
        }
        economic["recommendation_text"] = "Decisión recomendada: mantener K actual (modelo sin optimización de servidores)."
        return economic

    k_min = int(payload.get("k_min", 1))
    k_max = int(payload.get("k_max", max(k_current, 1)))
    if k_min < 1 or k_max < k_min:
        raise ValueError("Rango de K inválido: se requiere 1 <= k_min <= k_max.")

    n_pop = int(payload.get("N", 1))
    candidates = []
    for candidate_k in range(k_min, k_max + 1):
        if model_key in {"finite_mmk", "mmk_infinite_finite_peps"} and candidate_k > n_pop:
            continue

        candidate_payload = dict(payload)
        candidate_payload["k"] = candidate_k
        candidate_payload["model"] = model_key

        try:
            metrics_k = calculate_queue_metrics(model_key, candidate_payload)
        except ValueError:
            continue

        metric_value_k = float(metrics_k.get(queue_metric_name, 0.0))
        waiting_cost_k = cw * metric_value_k
        service_cost_k = cs * candidate_k
        total_cost_k = waiting_cost_k + service_cost_k

        candidates.append({
            "K": candidate_k,
            queue_metric_name: metric_value_k,
            "waiting_cost": waiting_cost_k,
            "service_cost": service_cost_k,
            "total_cost": total_cost_k,
        })

    if not candidates:
        economic["optimization"] = {
            "enabled": False,
            "message": "No se encontraron alternativas estables en el rango de K indicado.",
            "candidates": [],
        }
        economic["recommendation_text"] = "Decisión recomendada: mantener K actual y ampliar/revisar el rango de K para evaluar más alternativas estables."
        return economic

    best = min(candidates, key=lambda x: x["total_cost"])
    savings = total_cost - best["total_cost"]

    economic["optimization"] = {
        "enabled": True,
        "k_min": k_min,
        "k_max": k_max,
        "best": best,
        "candidates": candidates,
        "savings_vs_current": savings,
        "message": "Se minimiza CT eligiendo el K con menor costo total en el rango analizado.",
    }

    if best["K"] == k_current:
        economic["recommendation_text"] = (
            f"Decisión recomendada: mantener K={k_current}, ya que minimiza el costo total en el rango evaluado."
        )
    elif savings > 0:
        direction = "incrementar" if best["K"] > k_current else "reducir"
        economic["recommendation_text"] = (
            f"Decisión recomendada: {direction} K de {k_current} a {best['K']} para minimizar CT, "
            f"con ahorro estimado de {savings:.6f} por período."
        )
    else:
        economic["recommendation_text"] = (
            f"Decisión sugerida por rango evaluado: K={best['K']} (CT mínimo dentro del rango), "
            "aunque no mejora económicamente frente al escenario actual."
        )

    return economic


def calculate_wait_time_optimization(model: str, payload: Dict) -> Dict:
    model_key = (model or "").strip().lower()
    target_metric = str(payload.get("wait_target_metric", "Wq")).strip()
    target_max = _parse_real(payload.get("wait_target_max", 0), "Tiempo máximo objetivo")
    k_min = int(payload.get("k_min", 1))
    k_max = int(payload.get("k_max", 1))

    if target_metric not in {"Wq", "W"}:
        raise ValueError("wait_target_metric debe ser 'Wq' o 'W'.")
    if target_max < 0:
        raise ValueError("Tiempo máximo objetivo debe ser >= 0.")
    if k_min < 1 or k_max < k_min:
        raise ValueError("Rango de K inválido: se requiere 1 <= k_min <= k_max.")

    optimizable_models = {"mmk", "mgk", "finite_mmk", "mmk_infinite_finite_peps"}
    if model_key not in optimizable_models:
        return {
            "enabled": False,
            "message": "Este modelo no admite optimización por K para objetivo de tiempo.",
            "target_metric": target_metric,
            "target_max": target_max,
            "k_min": k_min,
            "k_max": k_max,
            "candidates": [],
        }

    n_pop = int(payload.get("N", 1))
    candidates = []
    for candidate_k in range(k_min, k_max + 1):
        if model_key in {"finite_mmk", "mmk_infinite_finite_peps"} and candidate_k > n_pop:
            continue

        candidate_payload = dict(payload)
        candidate_payload["k"] = candidate_k
        candidate_payload["model"] = model_key

        try:
            metrics_k = calculate_queue_metrics(model_key, candidate_payload)
        except ValueError:
            continue

        wq = float(metrics_k.get("Wq", 0.0))
        w = float(metrics_k.get("W", 0.0))
        metric_value = wq if target_metric == "Wq" else w

        candidates.append({
            "K": candidate_k,
            "Wq": wq,
            "W": w,
            "target_value": metric_value,
            "meets_target": metric_value <= target_max,
        })

    if not candidates:
        return {
            "enabled": False,
            "message": "No se encontraron alternativas estables en el rango de K indicado.",
            "target_metric": target_metric,
            "target_max": target_max,
            "k_min": k_min,
            "k_max": k_max,
            "candidates": [],
        }

    feasible = [c for c in candidates if c["meets_target"]]
    best_feasible = min(feasible, key=lambda x: (x["K"], x["target_value"])) if feasible else None

    return {
        "enabled": True,
        "message": "Se recomienda el menor K que cumple el objetivo de tiempo máximo.",
        "target_metric": target_metric,
        "target_max": target_max,
        "k_min": k_min,
        "k_max": k_max,
        "best_feasible": best_feasible,
        "candidates": candidates,
    }
