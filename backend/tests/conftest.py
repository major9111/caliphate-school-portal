"""Shared pytest fixtures — isolated in-memory test database per test function."""
import pytest
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, get_db


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """
    The login rate limiter in app.api.v1.endpoints.auth is a module-level
    dict that persists across tests in the same process. Clear it before
    every test so one test's failed logins don't 429 the next test.
    """
    from app.api.v1.endpoints.auth import _LOGIN_ATTEMPTS
    _LOGIN_ATTEMPTS.clear()
    yield
    _LOGIN_ATTEMPTS.clear()


@pytest.fixture(scope="function")
def db_session():
    """Fresh in-memory SQLite database for each test function."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session, TestingSessionLocal
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient wired to the isolated in-memory database via dependency override."""
    _, TestingSessionLocal = db_session

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_session):
    """Factory fixture: create a user directly in the test DB, return the User object."""
    _, TestingSessionLocal = db_session

    def _make_user(**kwargs):
        from app.models.user import User
        from app.core.security import hash_password
        import uuid

        defaults = {
            "id": str(uuid.uuid4()),
            "username": f"user_{uuid.uuid4().hex[:8]}",
            "email": f"{uuid.uuid4().hex[:8]}@test.com",
            "full_name": "Test User",
            "hashed_password": hash_password("Pass1234!"),
            "role": "parent",
            "is_active": True,
            "is_verified": True,
        }
        defaults.update(kwargs)

        db = TestingSessionLocal()
        try:
            user = User(**defaults)
            db.add(user)
            db.commit()
            db.refresh(user)
            db.expunge(user)
            return user
        finally:
            db.close()

    return _make_user


@pytest.fixture
def admin_token(client, make_user):
    """Register an admin directly in the DB, log in via the API, return the bearer token."""
    make_user(
        email="admin_test@school.com", username="admin_test",
        full_name="Test Admin", role="admin",
    )
    r = client.post("/api/v1/auth/login", json={"login": "admin_test@school.com", "password": "Pass1234!"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
