from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from backend.app.main import app, engine

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "project": "CYBERGUARD-X",
        "message": "CYBERGUARD-X backend is running",
    }


def test_application_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["application"] == "CYBERGUARD-X"


def test_database_health_success(monkeypatch):
    mock_connection = MagicMock()
    mock_connection.execute.return_value.scalar_one.return_value = "cyberguard_x_test"

    mock_context = MagicMock()
    mock_context.__enter__.return_value = mock_connection

    monkeypatch.setattr(
        engine,
        "connect",
        lambda: mock_context,
    )

    response = client.get("/health/database")

    assert response.status_code == 200
    assert response.json()["status"] == "connected"
    assert response.json()["database_name"] == "cyberguard_x_test"
    mock_connection.execute.assert_called_once()


def test_database_health_failure(monkeypatch):
    def failed_connection():
        raise SQLAlchemyError("Isolated test failure")

    monkeypatch.setattr(
        engine,
        "connect",
        failed_connection,
    )

    response = client.get("/health/database")

    assert response.status_code == 503
    assert response.json()["detail"]["status"] == "disconnected"
