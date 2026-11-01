from dataclasses import dataclass
from datetime import UTC, datetime
from typing import cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.contracts.identity import BusinessRole
from app.contracts.pagination import Pagination
from app.contracts.tasks import (
    LineItemRequest,
    ProcurementPolicyRequest,
    ProcurementPolicyResponse,
    TaskCreateRequest,
    TaskLineSnapshot,
    TaskListResponse,
    TaskMandateResponse,
    TaskResponse,
    TaskStatus,
)
from app.core.agent_policy import policy_allows
from app.db.models import Agent, AgentKey, AuditEvent, Principal, PrincipalMember, Product, User
from app.db.task_models import PrincipalProcurementPolicy, Task, TaskLine
from app.services.auth import AuthContext, as_utc


@dataclass(frozen=True)
class LinkedTaskActor:
    """Verified linked user for bot task creation; does not create a browser session."""

    user: User


class TaskNotFoundError(Exception):
    pass


class TaskForbiddenError(Exception):
    pass


class TaskConflictError(Exception):
    pass


class TaskValidationError(Exception):
    pass


class PolicyNotFoundError(TaskConflictError):
    pass


def _member_principal(
    db: Session, context: AuthContext | LinkedTaskActor, principal_id: UUID, *, manage: bool
) -> Principal:
    row = db.execute(
        select(Principal, PrincipalMember)
        .join(PrincipalMember, PrincipalMember.principal_id == Principal.id)
        .where(
            Principal.id == principal_id,
            PrincipalMember.user_id == context.user.id,
            PrincipalMember.status == "active",
        )
        .execution_options(populate_existing=True)
    ).one_or_none()
    if row is None:
        raise TaskNotFoundError
    principal, member = row
    if manage and member.role not in {"owner", "admin", "operator"}:
        raise TaskForbiddenError
    return principal


def _validate_agent(db: Session, principal: Principal, agent_id: UUID) -> Agent:
    agent = db.scalar(
        select(Agent).where(Agent.id == agent_id).execution_options(populate_existing=True)
    )
    if agent is None or agent.principal_id != principal.id:
        raise TaskNotFoundError
    if (
        principal.status != "active"
        or principal.verification_status != "demo_verified"
        or agent.status != "active"
        or agent.role != BusinessRole.BUYER.value
    ):
        raise TaskForbiddenError
    current_key_id = db.scalar(
        select(AgentKey.id).where(
            AgentKey.agent_id == agent.id,
            AgentKey.key_version == agent.current_key_version,
            AgentKey.status == "active",
        )
    )
    if current_key_id is None or not policy_allows(
        BusinessRole.BUYER,
        principal.roles,
        principal.agent_authority,
        agent.capabilities,
        agent.allowed_tools,
        agent.strategy_profile,
    ):
        raise TaskForbiddenError
    return agent


def _validate_lines(db: Session, lines: list[LineItemRequest]) -> list[TaskLineSnapshot]:
    products = {
        product.sku: product
        for product in db.scalars(
            select(Product).where(
                Product.sku.in_([line.sku for line in lines]), Product.active.is_(True)
            )
        )
    }
    snapshots: list[TaskLineSnapshot] = []
    for line in lines:
        product = products.get(line.sku)
        if product is None or product.unit != line.unit:
            raise TaskValidationError
        snapshots.append(
            TaskLineSnapshot(
                product_id=product.id,
                sku=product.sku,
                quantity=line.quantity,
                unit=product.unit,
            )
        )
    return snapshots


def _record_task_event(
    db: Session, context: AuthContext | LinkedTaskActor, task: Task, event_type: str
) -> None:
    db.add(
        AuditEvent(
            principal_id=task.principal_id,
            actor_type="human",
            actor_id=context.user.id,
            event_type=event_type,
            entity_type="task",
            entity_id=task.id,
            payload={"version": task.version, "status": task.status},
        )
    )


def task_response(task: Task) -> TaskResponse:
    mandate = TaskMandateResponse.model_validate(
        {
            "objective": task.objective,
            "category": task.category,
            "lines": task.lines,
            "budget": task.budget_inr,
            "currency": task.currency,
            "delivery_deadline": as_utc(task.delivery_deadline),
            "expires_at": as_utc(task.expires_at),
            "priorities": task.priorities,
            "allowed_tools": task.allowed_tools,
            "permitted_actions": task.permitted_actions,
            "max_rounds": task.max_rounds,
            "min_credit_days": task.min_credit_days,
            "max_upfront_pct": task.max_upfront_pct,
            "requires_human_approval": task.requires_human_approval,
        }
    )
    return TaskResponse(
        id=task.id,
        version=task.version,
        principal_id=task.principal_id,
        agent_id=task.agent_id,
        mandate=mandate,
        status=cast(TaskStatus, task.status),
        created_at=as_utc(task.created_at),
    )


def procurement_policy(
    db: Session,
    context: AuthContext,
    principal_id: UUID,
    payload: ProcurementPolicyRequest | None = None,
) -> ProcurementPolicyResponse:
    principal = _member_principal(db, context, principal_id, manage=payload is not None)
    if payload is not None:
        member = db.get(PrincipalMember, (principal_id, context.user.id))
        if member is None or member.role not in {"owner", "admin"}:
            raise TaskForbiddenError
        db.scalar(select(Principal).where(Principal.id == principal_id).with_for_update())
    if "buyer" not in principal.roles or principal.status != "active":
        raise TaskForbiddenError
    policy = db.get(PrincipalProcurementPolicy, principal_id)
    if payload is not None:
        if policy is None:
            policy = PrincipalProcurementPolicy(principal_id=principal_id, credit_score=65)
            db.add(policy)
        policy.max_budget_inr = payload.max_budget_inr
        policy.max_credit_days = payload.max_credit_days
        policy.max_rounds = payload.max_rounds
        db.add(
            AuditEvent(
                principal_id=principal_id,
                actor_type="human",
                actor_id=context.user.id,
                event_type="procurement.policy_updated",
                entity_type="principal",
                entity_id=principal_id,
                payload=payload.model_dump(mode="json") | {"synthetic": True},
            )
        )
        db.commit()
    if policy is None:
        raise PolicyNotFoundError
    return ProcurementPolicyResponse(
        principal_id=principal_id,
        max_budget_inr=policy.max_budget_inr,
        max_credit_days=policy.max_credit_days,
        max_rounds=policy.max_rounds,
        credit_score=policy.credit_score,
    )


def create_task(
    db: Session, context: AuthContext | LinkedTaskActor, payload: TaskCreateRequest
) -> TaskResponse:
    if context.user.status != "active":
        raise TaskForbiddenError
    principal = _member_principal(db, context, payload.principal_id, manage=True)
    agent = _validate_agent(db, principal, payload.agent_id)
    if (
        not set(payload.permitted_actions) <= set(agent.capabilities)
        or not set(payload.allowed_tools) <= set(agent.allowed_tools)
        or "request_quote" not in payload.permitted_actions
    ):
        raise TaskForbiddenError
    policy = db.get(PrincipalProcurementPolicy, principal.id)
    if policy is None:
        raise PolicyNotFoundError
    if (
        payload.budget > policy.max_budget_inr
        or payload.max_rounds > policy.max_rounds
        or payload.min_credit_days > policy.max_credit_days
    ):
        raise TaskValidationError

    line_snapshots = _validate_lines(db, payload.lines)
    task = Task(
        principal_id=principal.id,
        agent_id=agent.id,
        objective=payload.objective,
        category=payload.category,
        lines=[line.model_dump(mode="json") for line in line_snapshots],
        budget_inr=payload.budget,
        currency=payload.currency,
        delivery_deadline=as_utc(payload.delivery_deadline),
        expires_at=as_utc(payload.expires_at),
        priorities={key: str(value) for key, value in payload.priorities.items()},
        allowed_tools=list(payload.allowed_tools),
        permitted_actions=list(payload.permitted_actions),
        max_rounds=payload.max_rounds,
        min_credit_days=payload.min_credit_days,
        max_upfront_pct=payload.max_upfront_pct,
        requires_human_approval=payload.requires_human_approval,
        status="created",
        version=1,
    )
    db.add(task)
    db.flush()
    db.add_all(
        [
            TaskLine(
                task_id=task.id,
                product_id=line.product_id,
                sku=line.sku,
                quantity=line.quantity,
                unit=line.unit,
            )
            for line in line_snapshots
        ]
    )
    _record_task_event(db, context, task, "task.created")
    db.commit()
    db.refresh(task)
    return task_response(task)


def _get_task_record(
    db: Session, context: AuthContext, task_id: UUID, *, lock: bool = False
) -> Task:
    statement = select(Task).where(Task.id == task_id)
    if lock:
        statement = statement.with_for_update()
    task = db.scalar(statement.execution_options(populate_existing=True))
    if task is None:
        raise TaskNotFoundError
    _member_principal(db, context, task.principal_id, manage=False)
    return task


def get_task(db: Session, context: AuthContext, task_id: UUID) -> TaskResponse:
    return task_response(_get_task_record(db, context, task_id))


def list_tasks(db: Session, context: AuthContext, limit: int, offset: int) -> TaskListResponse:
    membership_filter = (
        PrincipalMember.user_id == context.user.id,
        PrincipalMember.status == "active",
    )
    total = (
        db.scalar(
            select(func.count())
            .select_from(Task)
            .join(PrincipalMember, PrincipalMember.principal_id == Task.principal_id)
            .where(*membership_filter)
        )
        or 0
    )
    tasks = db.scalars(
        select(Task)
        .join(PrincipalMember, PrincipalMember.principal_id == Task.principal_id)
        .where(*membership_filter)
        .order_by(Task.created_at, Task.id)
        .limit(limit)
        .offset(offset)
    )
    return TaskListResponse(
        items=[task_response(task) for task in tasks],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )


def cancel_task(db: Session, context: AuthContext, task_id: UUID) -> TaskResponse:
    task = _get_task_record(db, context, task_id, lock=True)
    _member_principal(db, context, task.principal_id, manage=True)
    now = datetime.now(UTC)
    if task.status != "created" or as_utc(task.expires_at) <= now:
        raise TaskConflictError
    task.status = "cancelled"
    task.version += 1
    task.updated_at = now
    _record_task_event(db, context, task, "task.cancelled")
    db.commit()
    db.refresh(task)
    return task_response(task)
