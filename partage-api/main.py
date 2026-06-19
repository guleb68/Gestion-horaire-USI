from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import uuid
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal, Optional

import jwt
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


DATABASE_URL = os.environ.get("DATABASE_URL", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
TOKEN_HOURS = 8


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@contextmanager
def database():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL n'est pas configuree")
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        yield connection


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 600_000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return "pbkdf2_sha256$%s$%s$%s" % (
        iterations,
        base64.urlsafe_b64encode(salt).decode(),
        base64.urlsafe_b64encode(derived).decode(),
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, expected_text = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        salt = base64.urlsafe_b64decode(salt_text)
        expected = base64.urlsafe_b64decode(expected_text)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def initialize_database() -> None:
    with database() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                code text PRIMARY KEY,
                full_name text NOT NULL,
                email text NOT NULL UNIQUE,
                phone text NOT NULL DEFAULT '',
                role text NOT NULL CHECK (role IN ('admin', 'intensiviste')),
                active boolean NOT NULL DEFAULT true,
                password_hash text NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS schedules (
                id bigserial PRIMARY KEY,
                year integer NOT NULL,
                week_number integer NOT NULL,
                week_start date NOT NULL,
                task text NOT NULL,
                doctor_code text NOT NULL REFERENCES users(code),
                modified_by_swap boolean NOT NULL DEFAULT false,
                updated_at timestamptz NOT NULL DEFAULT now(),
                UNIQUE (year, week_number, task)
            );

            CREATE TABLE IF NOT EXISTS duty_overrides (
                id bigserial PRIMARY KEY,
                year integer NOT NULL,
                week_number integer NOT NULL,
                duty_id text NOT NULL,
                day_index integer NOT NULL CHECK (day_index BETWEEN 0 AND 6),
                doctor_code text NOT NULL REFERENCES users(code),
                updated_at timestamptz NOT NULL DEFAULT now(),
                UNIQUE (year, week_number, duty_id, day_index)
            );

            CREATE TABLE IF NOT EXISTS swap_requests (
                id uuid PRIMARY KEY,
                requester_code text NOT NULL REFERENCES users(code),
                scope text NOT NULL CHECK (scope IN ('weekly', 'individual')),
                offered jsonb,
                requested jsonb NOT NULL,
                message text NOT NULL DEFAULT '',
                status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
                created_at timestamptz NOT NULL DEFAULT now(),
                responded_at timestamptz,
                responded_by text REFERENCES users(code)
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id bigserial PRIMARY KEY,
                actor_code text NOT NULL REFERENCES users(code),
                action text NOT NULL,
                entity_type text NOT NULL,
                entity_id text NOT NULL,
                details jsonb NOT NULL DEFAULT '{}'::jsonb,
                created_at timestamptz NOT NULL DEFAULT now()
            );
            """
        )
        bootstrap_admin(connection)
        connection.commit()


def bootstrap_admin(connection) -> None:
    code = os.environ.get("ADMIN_CODE", "GLEB").strip().upper()
    name = os.environ.get("ADMIN_NAME", "Guillaume Leblanc").strip()
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_INITIAL_PASSWORD", "")
    if not email or not password:
        return
    existing = connection.execute("SELECT code FROM users WHERE code = %s", (code,)).fetchone()
    if existing:
        return
    connection.execute(
        """
        INSERT INTO users (code, full_name, email, role, password_hash)
        VALUES (%s, %s, %s, 'admin', %s)
        """,
        (code, name, email, hash_password(password)),
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="API Horaire USI", version="0.1.0", lifespan=lifespan)
origins = [item.strip() for item in os.environ.get("ALLOWED_ORIGINS", "").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class LoginRequest(BaseModel):
    code: str
    password: str


class UserResponse(BaseModel):
    code: str
    full_name: str
    email: str
    phone: str
    role: Literal["admin", "intensiviste"]
    active: bool


class Assignment(BaseModel):
    scope: Literal["weekly", "individual"]
    year: int
    weekNumber: int = Field(ge=1, le=53)
    code: str
    task: str = ""
    weekDate: str = ""
    dayIndex: Optional[int] = Field(default=None, ge=0, le=6)
    dutyId: Optional[str] = None
    sourceTask: Optional[str] = None
    none: bool = False


class SwapCreate(BaseModel):
    scope: Literal["weekly", "individual"]
    offered: Optional[Assignment] = None
    requested: Assignment
    message: str = Field(default="", max_length=1000)


class SwapDecision(BaseModel):
    decision: Literal["accepted", "declined"]


def issue_token(user: dict) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET n'est pas configure")
    now = utcnow()
    return jwt.encode(
        {"sub": user["code"], "role": user["role"], "iat": now, "exp": now + timedelta(hours=TOKEN_HOURS)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def current_user(authorization: Annotated[Optional[str], Header()] = None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise")
    try:
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalide") from error
    with database() as connection:
        user = connection.execute(
            "SELECT code, full_name, email, phone, role, active FROM users WHERE code = %s",
            (str(payload.get("sub", "")).upper(),),
        ).fetchone()
    if not user or not user["active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte inactif")
    return user


CurrentUser = Annotated[dict, Depends(current_user)]


def public_user(user: dict) -> dict:
    return {key: user[key] for key in ("code", "full_name", "email", "phone", "role", "active")}


def assignment_code(value: Optional[dict]) -> str:
    return str((value or {}).get("code", "")).upper()


def assignment_is_none(value: Optional[dict]) -> bool:
    return not value or bool(value.get("none"))


def audit(connection, actor: str, action: str, entity_type: str, entity_id: str, details: dict) -> None:
    connection.execute(
        "INSERT INTO audit_log (actor_code, action, entity_type, entity_id, details) VALUES (%s, %s, %s, %s, %s)",
        (actor, action, entity_type, entity_id, Jsonb(details)),
    )


def apply_weekly_swap(connection, request: dict) -> None:
    offered = request["offered"]
    requested = request["requested"]
    requester = request["requester_code"]
    requested_code = assignment_code(requested)
    if assignment_is_none(offered):
        connection.execute(
            """
            UPDATE schedules SET doctor_code = %s, modified_by_swap = true, updated_at = now()
            WHERE year = %s AND week_number = %s AND doctor_code = %s
            """,
            (requester, requested["year"], requested["weekNumber"], requested_code),
        )
        return
    offered_code = assignment_code(offered)
    same_week = (
        offered["year"] == requested["year"]
        and offered["weekNumber"] == requested["weekNumber"]
    )
    if same_week:
        connection.execute(
            """
            UPDATE schedules
            SET doctor_code = CASE
                    WHEN doctor_code = %s THEN %s
                    WHEN doctor_code = %s THEN %s
                    ELSE doctor_code
                END,
                modified_by_swap = true,
                updated_at = now()
            WHERE year = %s AND week_number = %s
              AND doctor_code IN (%s, %s)
            """,
            (
                offered_code,
                requested_code,
                requested_code,
                offered_code,
                offered["year"],
                offered["weekNumber"],
                offered_code,
                requested_code,
            ),
        )
        return
    connection.execute(
        """
        UPDATE schedules SET doctor_code = %s, modified_by_swap = true, updated_at = now()
        WHERE year = %s AND week_number = %s AND doctor_code = %s
        """,
        (requested_code, offered["year"], offered["weekNumber"], offered_code),
    )
    connection.execute(
        """
        UPDATE schedules SET doctor_code = %s, modified_by_swap = true, updated_at = now()
        WHERE year = %s AND week_number = %s AND doctor_code = %s
        """,
        (offered_code, requested["year"], requested["weekNumber"], requested_code),
    )


def upsert_override(connection, assignment: dict, code: str) -> None:
    if assignment.get("dutyId") is None or assignment.get("dayIndex") is None:
        raise HTTPException(status_code=400, detail="Garde individuelle incomplete")
    connection.execute(
        """
        INSERT INTO duty_overrides (year, week_number, duty_id, day_index, doctor_code)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (year, week_number, duty_id, day_index)
        DO UPDATE SET doctor_code = EXCLUDED.doctor_code, updated_at = now()
        """,
        (assignment["year"], assignment["weekNumber"], assignment["dutyId"], assignment["dayIndex"], code),
    )


def apply_individual_swap(connection, request: dict) -> None:
    offered = request["offered"]
    requested = request["requested"]
    requester = request["requester_code"]
    requested_code = assignment_code(requested)
    upsert_override(connection, requested, requester if assignment_is_none(offered) else assignment_code(offered))
    if not assignment_is_none(offered):
        upsert_override(connection, offered, requested_code)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(credentials: LoginRequest) -> dict:
    with database() as connection:
        user = connection.execute("SELECT * FROM users WHERE code = %s", (credentials.code.strip().upper(),)).fetchone()
    if not user or not user["active"] or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Code ou mot de passe invalide")
    return {"access_token": issue_token(user), "token_type": "bearer", "user": public_user(user)}


@app.get("/api/me", response_model=UserResponse)
def me(user: CurrentUser) -> dict:
    return public_user(user)


@app.get("/api/users", response_model=list[UserResponse])
def users(user: CurrentUser) -> list[dict]:
    del user
    with database() as connection:
        rows = connection.execute(
            "SELECT code, full_name, email, phone, role, active FROM users WHERE active = true ORDER BY full_name"
        ).fetchall()
    return [public_user(row) for row in rows]


@app.get("/api/schedules")
def schedules(user: CurrentUser, year: int = Query(ge=2020, le=2100)) -> dict:
    del user
    with database() as connection:
        weeks = connection.execute(
            """
            SELECT year, week_number, week_start, task, doctor_code, modified_by_swap
            FROM schedules WHERE year = %s ORDER BY week_number, task
            """,
            (year,),
        ).fetchall()
        overrides = connection.execute(
            """
            SELECT year, week_number, duty_id, day_index, doctor_code
            FROM duty_overrides WHERE year = %s ORDER BY week_number, duty_id, day_index
            """,
            (year,),
        ).fetchall()
    return {"schedules": weeks, "overrides": overrides}


@app.post("/api/swaps", status_code=status.HTTP_201_CREATED)
def create_swap(payload: SwapCreate, user: CurrentUser) -> dict:
    offered = payload.offered.model_dump() if payload.offered else None
    requested = payload.requested.model_dump()
    if offered and not assignment_is_none(offered) and assignment_code(offered) != user["code"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez offrir que votre propre garde")
    if assignment_code(requested) == user["code"] and assignment_is_none(offered):
        raise HTTPException(status_code=400, detail="Cette garde vous appartient deja")
    request_id = uuid.uuid4()
    with database() as connection:
        connection.execute(
            """
            INSERT INTO swap_requests (id, requester_code, scope, offered, requested, message, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            """,
            (request_id, user["code"], payload.scope, Jsonb(offered) if offered else None, Jsonb(requested), payload.message),
        )
        audit(connection, user["code"], "swap.requested", "swap_request", str(request_id), {"offered": offered, "requested": requested})
        connection.commit()
    return {"id": str(request_id), "status": "pending"}


@app.get("/api/swaps")
def list_swaps(user: CurrentUser) -> list[dict]:
    with database() as connection:
        if user["role"] == "admin":
            rows = connection.execute("SELECT * FROM swap_requests ORDER BY created_at DESC").fetchall()
        else:
            rows = connection.execute(
                """
                SELECT * FROM swap_requests
                WHERE requester_code = %s
                   OR requested->>'code' = %s
                   OR offered->>'code' = %s
                ORDER BY created_at DESC
                """,
                (user["code"], user["code"], user["code"]),
            ).fetchall()
    return rows


@app.post("/api/swaps/{request_id}/decision")
def decide_swap(request_id: uuid.UUID, payload: SwapDecision, user: CurrentUser) -> dict:
    with database() as connection:
        request = connection.execute("SELECT * FROM swap_requests WHERE id = %s FOR UPDATE", (request_id,)).fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable")
        if request["status"] != "pending":
            raise HTTPException(status_code=409, detail="Cette demande a deja ete traitee")
        requested_owner = assignment_code(request["requested"])
        if user["role"] != "admin" and user["code"] != requested_owner:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas traiter cette demande")
        if payload.decision == "accepted":
            if request["scope"] == "weekly":
                apply_weekly_swap(connection, request)
            else:
                apply_individual_swap(connection, request)
        connection.execute(
            """
            UPDATE swap_requests
            SET status = %s, responded_at = now(), responded_by = %s
            WHERE id = %s
            """,
            (payload.decision, user["code"], request_id),
        )
        audit(connection, user["code"], f"swap.{payload.decision}", "swap_request", str(request_id), {})
        connection.commit()
    return {"id": str(request_id), "status": payload.decision}


@app.get("/api/audit")
def audit_entries(user: CurrentUser, limit: int = Query(default=100, ge=1, le=500)) -> list[dict]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Reserve a l'administrateur")
    with database() as connection:
        return connection.execute(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT %s", (limit,)
        ).fetchall()
