from collections.abc import Iterator
from contextlib import contextmanager
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_auth_context,
    get_settings,
    require_allowed_origin,
    require_csrf,
)
from app.contracts.identity import AgentCreateRequest, AgentStatus
from app.contracts.pagination import AgentListResponse
from app.contracts.passport import AgentPassportResponse
from app.core.agent_crypto import KeyEncryptionUnavailableError
from app.db.session import get_session
from app.services import agents
from app.services.auth import AuthContext

router = APIRouter(prefix="/v1", tags=["agents"])


@contextmanager
def agent_errors() -> Iterator[None]:
    try:
        yield
    except agents.AgentNotFoundError as exc:
        raise HTTPException(status_code=404) from exc
    except agents.AgentForbiddenError as exc:
        raise HTTPException(status_code=403) from exc
    except agents.AgentPolicyError as exc:
        raise HTTPException(status_code=422) from exc
    except agents.AgentStateError as exc:
        raise HTTPException(status_code=409) from exc
    except KeyEncryptionUnavailableError as exc:
        raise HTTPException(status_code=503) from exc


@router.post(
    "/principals/{principal_id}/agents", response_model=AgentPassportResponse, status_code=201
)
def create(
    request: Request,
    principal_id: UUID,
    payload: AgentCreateRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> AgentPassportResponse:
    with agent_errors():
        return agents.create_agent(db, context, principal_id, payload, get_settings(request))


@router.get("/principals/{principal_id}/agents", response_model=AgentListResponse)
def list_owned(
    principal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AgentListResponse:
    with agent_errors():
        return agents.list_agents(db, context, principal_id, limit, offset)


@router.get("/agents/{agent_id}/passport", response_model=AgentPassportResponse)
def passport(agent_id: UUID, db: Annotated[Session, Depends(get_session)]) -> AgentPassportResponse:
    with agent_errors():
        return agents.get_passport(db, agent_id)


@router.post("/agents/{agent_id}/pause", response_model=AgentPassportResponse)
def pause(
    agent_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> AgentPassportResponse:
    with agent_errors():
        return agents.set_agent_status(db, context, agent_id, AgentStatus.PAUSED)


@router.post("/agents/{agent_id}/resume", response_model=AgentPassportResponse)
def resume(
    agent_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> AgentPassportResponse:
    with agent_errors():
        return agents.set_agent_status(db, context, agent_id, AgentStatus.ACTIVE)


@router.post("/agents/{agent_id}/revoke", response_model=AgentPassportResponse)
def revoke(
    agent_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> AgentPassportResponse:
    with agent_errors():
        return agents.set_agent_status(db, context, agent_id, AgentStatus.REVOKED)


@router.post("/agents/{agent_id}/keys/rotate", response_model=AgentPassportResponse)
def rotate(
    request: Request,
    agent_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> AgentPassportResponse:
    with agent_errors():
        return agents.rotate_agent_key(db, context, agent_id, get_settings(request))
