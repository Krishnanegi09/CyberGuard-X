from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.discovery import router as discovery_router
from backend.app.api.v1.ml import router as ml_router
from backend.app.api.v1.monitoring import (
    org_router as monitoring_org_router,
)
from backend.app.api.v1.monitoring import (
    router as monitoring_router,
)
from backend.app.api.v1.network_scopes import router as network_scopes_router
from backend.app.api.v1.nids import router as nids_router
from backend.app.api.v1.organizations import router as organizations_router
from backend.app.api.v1.twin import router as twin_router
from backend.app.core.config import settings
from backend.app.db.session import engine

app = FastAPI(
    title=settings.app_name,
    description="Autonomous AI-Powered Cyber Defense and Digital Twin Security Platform",
    version="0.1.0",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    errors = []

    for error in exc.errors():
        errors.append({
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": error.get("msg"),
        })

    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )


app.include_router(
    auth_router,
    prefix="/api/v1",
)


app.include_router(
    organizations_router,
    prefix="/api/v1",
)

app.include_router(
    network_scopes_router,
    prefix="/api/v1",
)

app.include_router(
    discovery_router,
    prefix="/api/v1",
)

app.include_router(
    nids_router,
    prefix="/api/v1",
)

app.include_router(
    monitoring_router,
    prefix="/api/v1",
)

app.include_router(
    monitoring_org_router,
    prefix="/api/v1",
)

app.include_router(
    ml_router,
    prefix="/api/v1",
)

app.include_router(
    twin_router,
    prefix="/api/v1",
)








@app.get("/")
def root():
    return {
        "project": settings.app_name,
        "message": "CYBERGUARD-X backend is running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": settings.app_name,
        "environment": settings.app_env,
    }


@app.get("/health/database")
def database_health_check():
    try:
        with engine.connect() as connection:
            database_name = connection.execute(
                text("SELECT current_database()")
            ).scalar_one()

        return {
            "status": "connected",
            "database": "PostgreSQL",
            "database_name": database_name,
        }

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "disconnected",
                "error": "Database connection failed",
            },
        ) from exc
