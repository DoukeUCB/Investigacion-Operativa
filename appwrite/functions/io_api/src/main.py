import json
import sys
from pathlib import Path
import importlib

REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

MatrixService = importlib.import_module("services.matrix_service").MatrixService
MarkovService = importlib.import_module("services.markov_service").MarkovService
QueueService = importlib.import_module("services.queue_service").QueueService

matrix_service = MatrixService()
markov_service = MarkovService()
queue_service = QueueService()


def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    }


def _json_response(context, data: dict, status_code: int = 200):
    return context.res.json(data, status_code, _cors_headers())


def _empty_response(context, status_code: int = 204):
    return context.res.json({}, status_code, _cors_headers())


def _extract_payload(request):
    body = getattr(request, "body", None)
    if body is None or body == "":
        return {}

    if isinstance(body, (dict, list)):
        return body

    try:
        loaded = json.loads(body)
        return loaded if isinstance(loaded, dict) else {}
    except Exception:
        return {}


def _extract_route(request, payload: dict):
    route = payload.get("_route")
    if route:
        return str(route)

    path = getattr(request, "path", "") or ""
    path = str(path)
    if path.endswith("/matrix/operate"):
        return "/matrix/operate"
    if path.endswith("/markov/operate"):
        return "/markov/operate"
    if path.endswith("/queues/operate"):
        return "/queues/operate"

    query = getattr(request, "query", None)
    if isinstance(query, dict) and query.get("route"):
        return str(query.get("route"))

    return ""


def main(context):
    request = context.req
    method = str(getattr(request, "method", "POST")).upper()

    if method == "OPTIONS":
        return _empty_response(context, 204)

    payload = _extract_payload(request)
    if not isinstance(payload, dict):
        payload = {}
    route = _extract_route(request, payload)

    if route == "/matrix/operate":
        operation = payload.get("operation")
        if not operation:
            return _json_response(context, {"success": False, "error": "Falta el campo 'operation'."}, 400)
        result = matrix_service.execute(operation, payload)
        return _json_response(context, result, 200 if result.get("success") else 422)

    if route == "/markov/operate":
        operation = payload.get("operation")
        if not operation:
            return _json_response(context, {"success": False, "error": "Falta el campo 'operation'."}, 400)
        result = markov_service.execute(operation, payload)
        return _json_response(context, result, 200 if result.get("success") else 422)

    if route == "/queues/operate":
        model = payload.get("model")
        if not model:
            return _json_response(context, {"success": False, "error": "Falta el campo 'model'."}, 400)
        result = queue_service.execute(model, payload)
        return _json_response(context, result, 200 if result.get("success") else 422)

    return _json_response(
        context,
        {
            "success": False,
            "error": "Ruta no reconocida. Use _route con /matrix/operate, /markov/operate o /queues/operate.",
        },
        400,
    )
