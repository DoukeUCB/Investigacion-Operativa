"""
Capa de Presentación – API REST (Flask)
=======================================
Expone endpoints HTTP para las operaciones matriciales.
Sirve también los archivos estáticos del frontend.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from services.matrix_service import MatrixService
from services.markov_service import MarkovService
from services.queue_service import QueueService
import os
from dotenv import load_dotenv

load_dotenv()  # carga backend/.env con los valores de configuración por defecto

# ── Configuración ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

matrix_service = MatrixService()
markov_service = MarkovService()
queue_service = QueueService()


# ─────────────────── Endpoints de API ───────────────────

@app.route("/api/matrix/operate", methods=["POST"])
def matrix_operate():
    """
    Endpoint principal para operaciones matriciales.

    Body JSON esperado:
    {
        "operation": "add" | "subtract" | "multiply" | "transpose" | ...
        "matrix_a": [[...], [...]],            // requerido
        "matrix_b": [[...], [...]],            // solo para binarias
        "scalar": 3.0,                         // solo para scalar_multiply
        "exponent": 2,                         // solo para power
        "size": 3                              // solo para identity
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Se requiere un cuerpo JSON válido."}), 400

    operation = data.get("operation")
    if not operation:
        return jsonify({"success": False, "error": "Falta el campo 'operation'."}), 400

    result = matrix_service.execute(operation, data)

    status_code = 200 if result["success"] else 422
    return jsonify(result), status_code


@app.route("/api/matrix/operations", methods=["GET"])
def list_operations():
    """Lista todas las operaciones disponibles con su descripción."""
    operations = {
        "add": {
            "description": "Suma de matrices A + B",
            "requires": ["matrix_a", "matrix_b"],
            "returns": "matrix",
        },
        "subtract": {
            "description": "Resta de matrices A − B",
            "requires": ["matrix_a", "matrix_b"],
            "returns": "matrix",
        },
        "multiply": {
            "description": "Multiplicación A × B",
            "requires": ["matrix_a", "matrix_b"],
            "returns": "matrix",
        },
        "scalar_multiply": {
            "description": "Multiplicación escalar k · A",
            "requires": ["matrix_a", "scalar"],
            "returns": "matrix",
        },
        "transpose": {
            "description": "Transpuesta de A",
            "requires": ["matrix_a"],
            "returns": "matrix",
        },
        "determinant": {
            "description": "Determinante de A",
            "requires": ["matrix_a"],
            "returns": "scalar",
        },
        "inverse": {
            "description": "Inversa de A",
            "requires": ["matrix_a"],
            "returns": "matrix",
        },
        "power": {
            "description": "Potencia A^n",
            "requires": ["matrix_a", "exponent"],
            "returns": "matrix",
        },
        "trace": {
            "description": "Traza de A (suma diagonal)",
            "requires": ["matrix_a"],
            "returns": "scalar",
        },
        "rank": {
            "description": "Rango de A",
            "requires": ["matrix_a"],
            "returns": "scalar",
        },
        "rref": {
            "description": "Forma escalonada reducida (RREF)",
            "requires": ["matrix_a"],
            "returns": "matrix",
        },
        "cofactor": {
            "description": "Matriz de cofactores",
            "requires": ["matrix_a"],
            "returns": "matrix",
        },
        "adjugate": {
            "description": "Matriz adjunta",
            "requires": ["matrix_a"],
            "returns": "matrix",
        },
        "eigenvalues": {
            "description": "Valores propios (solo 2×2)",
            "requires": ["matrix_a"],
            "returns": "eigenvalues",
        },
        "identity": {
            "description": "Generar matriz identidad de tamaño n",
            "requires": ["size"],
            "returns": "matrix",
        },
    }
    return jsonify({"success": True, "operations": operations})


# ─────────────────── Endpoints de Markov ───────────────────

@app.route("/api/markov/operate", methods=["POST"])
def markov_operate():
    """
    Endpoint principal para cadenas de Markov.

    Body JSON esperado:
    {
        "operation": "chapman_kolmogorov" | "steady_state" | "mean_first_passage" | "full_analysis",
        "matrix_p": [[0.7, 0.3], [0.4, 0.6]],
        "pi_0": [1, 0],                       // solo para chapman_kolmogorov
        "steps": 5,                            // solo para chapman_kolmogorov
        "state_names": ["Bueno", "Malo"]       // opcional
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Se requiere un cuerpo JSON válido."}), 400

    operation = data.get("operation")
    if not operation:
        return jsonify({"success": False, "error": "Falta el campo 'operation'."}), 400

    result = markov_service.execute(operation, data)

    status_code = 200 if result["success"] else 422
    return jsonify(result), status_code


@app.route("/api/markov/operations", methods=["GET"])
def list_markov_operations():
    """Lista las operaciones de Markov disponibles."""
    operations = {
        "chapman_kolmogorov": {
            "description": "π(n) = π(0) · P^n – Probabilidad total en n pasos",
            "requires": ["matrix_p", "pi_0", "steps"],
        },
        "steady_state": {
            "description": "Distribución estacionaria πP = π",
            "requires": ["matrix_p"],
            "optional": ["pi_0", "state_names"],
        },
        "mean_first_passage": {
            "description": "Tiempo medio de primer pasaje M_ij",
            "requires": ["matrix_p"],
            "optional": ["state_names"],
        },
        "full_analysis": {
            "description": "Análisis completo (estacionario + primer pasaje + Chapman-Kolmogorov)",
            "requires": ["matrix_p"],
            "optional": ["pi_0", "steps", "state_names"],
        },
        "absorbing_analysis": {
            "description": "Análisis de cadena absorbente (forma canónica, N, B, b·B)",
            "requires": ["matrix_p"],
            "optional": ["state_names", "absorbing_states", "vector_b"],
        },
        "probability_tree": {
            "description": "Árbol de probabilidades de transición desde un estado inicial",
            "requires": ["matrix_p", "initial_state", "steps"],
            "optional": ["state_names", "prune_threshold"],
        },
    }
    return jsonify({"success": True, "operations": operations})


# ─────────────────── Endpoints de Teoría de Colas ───────────────────

@app.route("/api/queues/operate", methods=["POST"])
def queues_operate():
    """
    Endpoint principal para teoría de colas.

    Body JSON esperado:
    {
        "model": "mm1" | "mmk" | "mg1" | "md1" | "mgk" |
                 "finite_mm1" | "finite_mmk" | "mmk_infinite_finite_peps",
        "lambda_rate": 10,
        "mu": 12,
        "k": 2,
        "N": 20,
        "e_s2": 0.02,
        "c_s2": 1.2,
        "n": 4,
        "max_n": 15
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Se requiere un cuerpo JSON válido."}), 400

    model = data.get("model")
    if not model:
        return jsonify({"success": False, "error": "Falta el campo 'model'."}), 400

    result = queue_service.execute(model, data)
    status_code = 200 if result["success"] else 422
    return jsonify(result), status_code


@app.route("/api/queues/models", methods=["GET"])
def list_queue_models():
    models = {
        "mm1": {
            "description": "M/M/1 (fuente infinita)",
            "requires": ["lambda_rate", "mu"],
            "optional": ["n", "max_n"],
        },
        "mmk": {
            "description": "M/M/k (k servidores, fuente infinita)",
            "requires": ["lambda_rate", "mu", "k"],
            "optional": ["n", "max_n"],
        },
        "mg1": {
            "description": "M/G/1",
            "requires": ["lambda_rate", "mu", "e_s2"],
        },
        "md1": {
            "description": "M/D/1",
            "requires": ["lambda_rate", "mu"],
        },
        "mgk": {
            "description": "M/G/k (aprox. Allen–Cunneen)",
            "requires": ["lambda_rate", "mu", "k", "c_s2"],
        },
        "finite_mm1": {
            "description": "Fuente finita M/M/1/N",
            "requires": ["lambda_rate", "mu", "N"],
        },
        "finite_mmk": {
            "description": "Fuente finita M/M/k/N",
            "requires": ["lambda_rate", "mu", "k", "N"],
        },
        "mmk_infinite_finite_peps": {
            "description": "M/M/k/∞/N/PEPS (misma base estructural que finite_mmk)",
            "requires": ["lambda_rate", "mu", "k", "N"],
        },
    }
    return jsonify({"success": True, "models": models})


# ─────────────────── Servir Frontend ───────────────────

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(FRONTEND_DIR, path)


# ─────────────────── Main ───────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"Servidor iniciado en http://{host}:{port}")
    app.run(debug=debug, host=host, port=port)
