from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.identity import BusinessRole
from app.contracts.tasks import LineItemRequest, TaskCreateRequest
from app.core.agent_policy import policy_allows
from app.db.models import Agent, AgentKey, AuditEvent, Principal, PrincipalMember, Product
from app.db.task_models import PrincipalProcurementPolicy, Task, TaskLine
from app.services.auth import AuthContext, as_utc


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
    db: Session, context: AuthContext, principal_id: UUID, *, manage: bool
) -> Principal:
    principal = db.scalar(
        select(Principal)
        .where(Principal.id == principal_id)
        .execution_options(populate_existing=True)
    )
    member = db.scalar(
        select(PrincipalMember)
        .where(
            PrincipalMember.principal_id == principal_id,
            PrincipalMember.user_id == context.user.id,
            PrincipalMember.status == "active",
        )
        .execution_options(populate_existing=True)
    )
    if principal is None or member is None:
        raise TaskNotFoundError
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
        or agent.role != "buyer"
    ):
        raise TaskForbiddenError
    key = db.scalar(
        select(AgentKey.id).where(
            AgentKey.agent_id == agent.id,
            AgentKey.key_version == agent.current_key_version,
            AgentKey.status == "active",
        )
    )
    if key is None or not policy_allows(
        BusinessRole.BUYER,
        principal.roles,
        principal.agent_authority,
        agent.capabilities,
        agent.allowed_tools,
        agent.strategy_profile,
    ):
        raise TaskForbiddenError
    return agent


def _validate_lines(db: Session, lines: list[LineItemRequest]) -> list[dict[str, object]]:
    validated: list[dict[str, object]] = []
    for line in lines:
        product = db.scalar(
            select(Product).where(Product.sku == line.sku, Product.active.is_(True))
        )
        if product is None or product.unit != line.unit:
            raise TaskValidationError
        validated.append(
            {
                "product_id": str(product.id),
                "sku": product.sku,
                "quantity": str(line.quantity),
                "unit": product.unit,
            }
        )
    return validated


def _record_task_event(db: Session, context: AuthContext, task: Task, event_type: str) -> None:
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


def create_task(db: Session, context: AuthContext, payload: TaskCreateRequest) -> Task:
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
    if payload.budget > policy.max_budget_inr or payload.max_rounds > policy.max_rounds:
        raise TaskValidationError
    lines = _validate_lines(db, payload.lines)
    task = Task(
        principal_id=principal.id,
        agent_id=agent.id,
        objective=payload.objective,
        category=payload.category,
        lines=lines,
        budget_inr=payload.budget,
        currency="INR",
        delivery_deadline=as_utc(payload.delivery_deadline),
        expires_at=as_utc(payload.expires_at),
        priorities={key: str(value) for key, value in payload.priorities.items()},
        allowed_tools=list(payload.allowed_tools),
        permitted_actions=list(payload.permitted_actions),
        max_rounds=payload.max_rounds,
        requires_human_approval=True,
        status="created",
        version=1,
    )
    db.add(task)
    db.flush()
    for line in lines:
        db.add(
            TaskLine(
                task_id=task.id,
                product_id=UUID(str(line["product_id"])),
                sku=str(line["sku"]),
                quantity=str(line["quantity"]),
                unit=str(line["unit"]),
            )
        )
    _record_task_event(db, context, task, "task.created")
    db.commit()
    db.refresh(task)
    return task


def get_task(db: Session, context: AuthContext, task_id: UUID) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise TaskNotFoundError
    _member_principal(db, context, task.principal_id, manage=False)
    return task


def list_tasks(db: Session, context: AuthContext, limit: int, offset: int) -> list[Task]:
    return list(
        db.scalars(
            select(Task)
            .join(
                PrincipalMember,
                PrincipalMember.principal_id == Task.principal_id,
            )
            .where(PrincipalMember.user_id == context.user.id, PrincipalMember.status == "active")
            .order_by(Task.created_at, Task.id)
            .limit(limit)
            .offset(offset)
        )
    )


def cancel_task(db: Session, context: AuthContext, task_id: UUID) -> Task:
    task = get_task(db, context, task_id)
    _member_principal(db, context, task.principal_id, manage=True)
    if task.status != "created" or as_utc(task.expires_at) <= datetime.now(UTC):
        raise TaskConflictError
    task.status = "cancelled"
    task.version += 1
    _record_task_event(db, context, task, "task.cancelled")
    db.commit()
    db.refresh(task)
    return task
