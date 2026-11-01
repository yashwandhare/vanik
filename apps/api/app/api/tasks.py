import re
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_auth_context, require_allowed_origin, require_csrf
from app.contracts.tasks import (
    LineItemRequest,
    ProcurementPolicyRequest,
    ProcurementPolicyResponse,
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
)
from app.contracts.workflow import NaturalTaskRequest
from app.db.models import Product
from app.db.session import get_session
from app.services import tasks
from app.services.auth import AuthContext

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])


@contextmanager
def task_errors() -> Iterator[None]:
    try:
        yield
    except tasks.TaskNotFoundError as exc:
        raise HTTPException(status_code=404) from exc
    except tasks.TaskForbiddenError as exc:
        raise HTTPException(status_code=403) from exc
    except tasks.TaskValidationError as exc:
        raise HTTPException(status_code=422) from exc
    except tasks.TaskConflictError as exc:
        raise HTTPException(status_code=409) from exc


def natural_request(
    db: Session, principal_id: UUID, agent_id: UUID, text: str
) -> TaskCreateRequest:
    text = text.strip()
    if len(text) > 500 or not re.search(
        r"\b(diwali|full basket|40\s+(?:sku|product))", text, re.IGNORECASE
    ):
        # P0 is an explicit full-basket parser, not a general NLP purchasing agent.
        raise tasks.TaskValidationError
    products = list(
        db.scalars(select(Product).where(Product.active.is_(True)).order_by(Product.sku))
    )
    if not products:
        raise tasks.TaskConflictError
    now = datetime.now(UTC)
    budget_match = re.search(
        r"(?:₹\s*|INR\s+|budget\s+)([0-9]{1,9}(?:\.[0-9]{1,2})?)(?![0-9.])", text, re.IGNORECASE
    )
    if budget_match is None or Decimal(budget_match.group(1)) <= 0:
        raise tasks.TaskValidationError
    budget = Decimal(budget_match.group(1))
    return TaskCreateRequest(
        principal_id=principal_id,
        agent_id=agent_id,
        objective=text,
        lines=[
            LineItemRequest(sku=item.sku, quantity=Decimal("1.000"), unit=item.unit)
            for item in products
        ],
        budget=budget,
        delivery_deadline=now + timedelta(days=10),
        expires_at=now + timedelta(days=1),
        priorities={
            "price": Decimal("0.55"),
            "reliability": Decimal("0.20"),
            "delivery": Decimal("0.15"),
            "credit": Decimal("0.10"),
        },
    )


@router.get("/policies/{principal_id}", response_model=ProcurementPolicyResponse)
def get_policy(
    principal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> ProcurementPolicyResponse:
    with task_errors():
        return tasks.procurement_policy(db, context, principal_id)
    raise AssertionError("unreachable")


@router.post("/policies/{principal_id}", response_model=ProcurementPolicyResponse)
def set_policy(
    principal_id: UUID,
    payload: ProcurementPolicyRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> ProcurementPolicyResponse:
    with task_errors():
        return tasks.procurement_policy(db, context, principal_id, payload)
    raise AssertionError("unreachable")


@router.post("/from-text", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_from_text(
    payload: NaturalTaskRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> TaskResponse:
    with task_errors():
        request = natural_request(db, payload.principal_id, payload.agent_id, payload.text)
        return tasks.create_task(db, context, request)
    raise AssertionError("unreachable")


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create(
    payload: TaskCreateRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> TaskResponse:
    with task_errors():
        return tasks.create_task(db, context, payload)
    raise AssertionError("unreachable")


@router.get("", response_model=TaskListResponse)
def list_owned(
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListResponse:
    return tasks.list_tasks(db, context, limit, offset)


@router.get("/{task_id}", response_model=TaskResponse)
def get(
    task_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> TaskResponse:
    with task_errors():
        return tasks.get_task(db, context, task_id)
    raise AssertionError("unreachable")


@router.post("/{task_id}/cancel", response_model=TaskResponse)
def cancel(
    task_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> TaskResponse:
    with task_errors():
        return tasks.cancel_task(db, context, task_id)
    raise AssertionError("unreachable")
