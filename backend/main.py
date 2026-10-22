from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.schemas import AuditRequest, AuditResponse
from backend.audit_service import execute_audit, get_available_reference_data

app = FastAPI(
    title="Invoice Audit Intelligence API",
    description="Deterministic six-check invoice auditing API for financial exposure detection.",
    version="1.0.0",
)

# Enable CORS for Next.js frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Graceful handler for malformed or invalid request payloads."""
    errors = []
    for err in exc.errors():
        field_loc = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        msg = err.get("msg", "Invalid value")
        errors.append({
            "field": field_loc or "request_body",
            "message": msg,
            "type": err.get("type", "value_error"),
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "The submitted invoice audit request is malformed or missing required fields.",
            "details": errors,
        },
    )


@app.get("/api/health", tags=["System"])
async def health_check():
    """Health status endpoint."""
    return {
        "status": "healthy",
        "service": "invoice-audit-intelligence",
        "engine": "deterministic-python-6check",
        "version": "1.0.0",
    }


@app.get("/api/reference-data", tags=["Reference Data"])
async def get_reference_data():
    """
    Returns available vendor rate cards and statutory GST reference rates
    for UI autocomplete and validation.
    """
    return get_available_reference_data()


@app.post("/api/audit", response_model=AuditResponse, tags=["Audit"])
async def run_audit_endpoint(request: AuditRequest):
    """
    Audit a batch of invoices against contracted rate cards and GST reference rates.
    Accepts manual entries or parsed upload files along with optional custom references.
    """
    return execute_audit(request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
