from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import uuid
from contextlib import asynccontextmanager, contextmanager
from datetime import date, datetime, timedelta, timezone
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

            ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_doctor_code_fkey;
            ALTER TABLE duty_overrides DROP CONSTRAINT IF EXISTS duty_overrides_doctor_code_fkey;
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
origins = sorted({
    "https://gestion-horaire-usi-hej.onrender.com",
    *[item.strip().rstrip("/") for item in os.environ.get("ALLOWED_ORIGINS", "").split(",") if item.strip()],
})
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


class UserUpsert(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(default="", max_length=40)
    role: Literal["admin", "intensiviste"] = "intensiviste"
    active: bool = True
    password: Optional[str] = Field(default=None, min_length=12, max_length=200)


class ScheduleAssignment(BaseModel):
    task: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=20)


class ScheduleWeek(BaseModel):
    weekNumber: int = Field(ge=1, le=53)
    weekStart: date
    assignments: list[ScheduleAssignment]


class ScheduleReplace(BaseModel):
    weeks: list[ScheduleWeek]


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


def require_admin(user: dict) -> None:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Reserve a l'administrateur")


def public_user(user: dict) -> dict:
    return {key: user[key] for key in ("code", "full_name", "email", "phone", "role", "active")}


def assignment_code(value: Optional[dict]) -> str:
    return str((value or {}).get("code", "")).upper()


def assignment_is_none(value: Optional[dict]) -> bool:
    return not value or bool(value.get("none"))


def validate_assignment(connection, assignment: Optional[dict], user: dict, allow_past: bool = False) -> None:
    if assignment_is_none(assignment):
        return
    year = assignment.get("year")
    week_number = assignment.get("weekNumber")
    code = assignment_code(assignment)
    week = connection.execute(
        "SELECT min(week_start) AS week_start FROM schedules WHERE year = %s AND week_number = %s",
        (year, week_number),
    ).fetchone()
    if not week or not week["week_start"]:
        raise HTTPException(status_code=409, detail="Cette semaine n'existe plus dans l'horaire")
    if not allow_past and user["role"] != "admin" and week["week_start"] + timedelta(days=6) < date.today():
        raise HTTPException(status_code=403, detail="Les semaines passees ne sont pas echangeables")
    if assignment.get("scope") == "individual":
        if assignment.get("dutyId") is None or assignment.get("dayIndex") is None:
            raise HTTPException(status_code=400, detail="Garde individuelle incomplete")
        override = connection.execute(
            """
            SELECT doctor_code FROM duty_overrides
            WHERE year = %s AND week_number = %s AND duty_id = %s AND day_index = %s
            """,
            (year, week_number, assignment["dutyId"], assignment["dayIndex"]),
        ).fetchone()
        if override and override["doctor_code"] != code:
            raise HTTPException(status_code=409, detail="Cette garde a deja ete modifiee")
    exists = connection.execute(
        """
        SELECT 1 FROM schedules
        WHERE year = %s AND week_number = %s AND doctor_code = %s
        LIMIT 1
        """,
        (year, week_number, code),
    ).fetchone()
    if not exists and not (
        assignment.get("scope") == "individual"
        and connection.execute(
            """
            SELECT 1 FROM duty_overrides
            WHERE year = %s AND week_number = %s AND duty_id = %s
              AND day_index = %s AND doctor_code = %s
            """,
            (year, week_number, assignment.get("dutyId"), assignment.get("dayIndex"), code),
        ).fetchone()
    ):
        raise HTTPException(status_code=409, detail="Cette affectation n'appartient plus a cet utilisateur")


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
    if assignment_is_none(requested):
        connection.execute(
            """
            UPDATE schedules SET doctor_code = %s, modified_by_swap = true, updated_at = now()
            WHERE year = %s AND week_number = %s AND doctor_code = %s
            """,
            (requested_code, offered["year"], offered["weekNumber"], offered_code),
        )
        return
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
    if assignment_is_none(requested):
        upsert_override(connection, offered, requested_code)
        return
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
    with database() as connection:
        if user["role"] == "admin":
            rows = connection.execute(
                "SELECT code, full_name, email, phone, role, active FROM users ORDER BY full_name"
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT code, full_name, email, phone, role, active FROM users WHERE active = true ORDER BY full_name"
            ).fetchall()
    if user["role"] == "admin":
        return [public_user(row) for row in rows]
    return [
        {**public_user(row), "email": "", "phone": ""}
        for row in rows
    ]


@app.post("/api/admin/users", response_model=UserResponse)
def save_user(payload: UserUpsert, user: CurrentUser) -> dict:
    require_admin(user)
    code = payload.code.strip().upper()
    email = payload.email.strip().lower()
    with database() as connection:
        existing = connection.execute("SELECT * FROM users WHERE code = %s", (code,)).fetchone()
        if not existing and not payload.password:
            raise HTTPException(status_code=400, detail="Un mot de passe initial est requis")
        password_hash = hash_password(payload.password) if payload.password else existing["password_hash"]
        try:
            saved = connection.execute(
                """
                INSERT INTO users (code, full_name, email, phone, role, active, password_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    role = EXCLUDED.role,
                    active = EXCLUDED.active,
                    password_hash = EXCLUDED.password_hash,
                    updated_at = now()
                RETURNING code, full_name, email, phone, role, active
                """,
                (code, payload.full_name.strip(), email, payload.phone.strip(), payload.role, payload.active, password_hash),
            ).fetchone()
        except psycopg.errors.UniqueViolation as error:
            raise HTTPException(status_code=409, detail="Ce courriel est deja utilise") from error
        audit(connection, user["code"], "user.saved", "user", code, {"role": payload.role, "active": payload.active})
        connection.commit()
    return public_user(saved)


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


@app.post("/api/admin/schedules/{year}")
def replace_schedule(year: int, payload: ScheduleReplace, user: CurrentUser) -> dict:
    require_admin(user)
    if year < 2020 or year > 2100:
        raise HTTPException(status_code=400, detail="Annee invalide")
    with database() as connection:
        connection.execute("DELETE FROM duty_overrides WHERE year = %s", (year,))
        connection.execute("DELETE FROM swap_requests WHERE requested->>'year' = %s", (str(year),))
        connection.execute("DELETE FROM schedules WHERE year = %s", (year,))
        inserted = 0
        for week in payload.weeks:
            for assignment in week.assignments:
                connection.execute(
                    """
                    INSERT INTO schedules (year, week_number, week_start, task, doctor_code)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (year, week.weekNumber, week.weekStart, assignment.task, assignment.code.strip().upper()),
                )
                inserted += 1
        audit(connection, user["code"], "schedule.replaced", "schedule", str(year), {"weeks": len(payload.weeks), "assignments": inserted})
        connection.commit()
    return {"year": year, "weeks": len(payload.weeks), "assignments": inserted}


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
        validate_assignment(connection, offered, user)
        validate_assignment(connection, requested, user)
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


@app.post("/api/admin/swaps/direct", status_code=status.HTTP_201_CREATED)
def direct_swap(payload: SwapCreate, user: CurrentUser) -> dict:
    require_admin(user)
    offered = payload.offered.model_dump() if payload.offered else None
    requested = payload.requested.model_dump()
    request_id = uuid.uuid4()
    request = {
        "requester_code": user["code"],
        "scope": payload.scope,
        "offered": offered,
        "requested": requested,
    }
    with database() as connection:
        validate_assignment(connection, offered, user, allow_past=True)
        validate_assignment(connection, requested, user, allow_past=True)
        if payload.scope == "weekly":
            apply_weekly_swap(connection, request)
        else:
            apply_individual_swap(connection, request)
        connection.execute(
            """
            INSERT INTO swap_requests
                (id, requester_code, scope, offered, requested, message, status, responded_at, responded_by)
            VALUES (%s, %s, %s, %s, %s, %s, 'accepted', now(), %s)
            """,
            (request_id, user["code"], payload.scope, Jsonb(offered) if offered else None, Jsonb(requested), payload.message, user["code"]),
        )
        audit(connection, user["code"], "swap.direct", "swap_request", str(request_id), {"offered": offered, "requested": requested})
        connection.commit()
    return {"id": str(request_id), "status": "accepted"}


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
            validate_assignment(connection, request["offered"], user, allow_past=user["role"] == "admin")
            validate_assignment(connection, request["requested"], user, allow_past=user["role"] == "admin")
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
