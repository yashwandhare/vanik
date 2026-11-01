from collections.abc import Iterator
from contextlib import contextmanager
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_auth_context,
    get_settings,
    require_allowed_origin,
    require_csrf,
    require_telegram_bot,
)
from app.api.tasks import natural_request
from app.contracts.tasks import TaskResponse
from app.contracts.workflow import (
    AcceptOfferRequest,
    ApprovalChallengeResponse,
    ApproveRequest,
    DealListResponse,
    DealResponse,
    MemoryCorrectionRequest,
    MemoryDisputeRequest,
    NegotiationListResponse,
    NotificationAckRequest,
    NotificationListResponse,
    ReceiptResponse,
    ReplayResponse,
    SecurityIncidentListResponse,
    SellerRFQListResponse,
    SupplierMemoryListResponse,
    SupplierMemoryResponse,
    TelegramNaturalTaskRequest,
)
from app.db.models import Agent, PrincipalMember, TelegramLink, User
from app.db.session import get_session
from app.db.workflow_models import Negotiation
from app.services import deals, negotiation, tasks
from app.services.auth import AuthContext
from app.services.events import (
    ack_notification,
    claim_notifications,
    correct_memory,
    dispute_memory,
    memories,
    notification_list,
    process_proactive,
    replay,
    security_for_task,
)
from app.services.protocol import ProtocolError

router = APIRouter(prefix="/v1", tags=["workflow"])


@contextmanager
def workflow_errors() -> Iterator[None]:
    try:
        yield
    except (tasks.TaskNotFoundError, deals.DealNotFoundError, LookupError) as exc:
        raise HTTPException(status_code=404) from exc
    except (tasks.TaskForbiddenError, deals.DealForbiddenError, PermissionError) as exc:
        raise HTTPException(status_code=403) from exc
    except tasks.TaskValidationError as exc:
        raise HTTPException(status_code=422) from exc
    except (tasks.TaskConflictError, deals.DealConflictError, ProtocolError) as exc:
        raise HTTPException(status_code=409) from exc


@router.post("/tasks/{task_id}/launch", response_model=NegotiationListResponse)
async def launch(
    request: Request,
    task_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> NegotiationListResponse:
    with workflow_errors():
        return await negotiation.launch_task(db, context, task_id, get_settings(request))
    raise AssertionError("unreachable")


@router.get("/tasks/{task_id}/negotiations", response_model=NegotiationListResponse)
def negotiations(
    task_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> NegotiationListResponse:
    with workflow_errors():
        return negotiation.task_negotiations(db, context, task_id)
    raise AssertionError("unreachable")


@router.post("/negotiations/{negotiation_id}/accept", response_model=DealResponse)
def accept(
    request: Request,
    negotiation_id: UUID,
    payload: AcceptOfferRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> DealResponse:
    settings = get_settings(request)
    with workflow_errors():
        result = deals.accept_offer(
            db=db,
            context=context,
            negotiation_id=negotiation_id,
            offer_id=payload.offer_id,
            settings=settings,
        )
    return result


@router.get("/deals", response_model=DealListResponse)
def list_deals(
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> DealListResponse:
    return DealListResponse(items=deals.list_deals(db, context))


@router.get("/deals/{deal_id}", response_model=DealResponse)
def get_deal(
    deal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> DealResponse:
    with workflow_errors():
        return deals.deal_response(deals.get_deal(db, context, deal_id))
    raise AssertionError("unreachable")


@router.post("/deals/{deal_id}/approval-challenge", response_model=ApprovalChallengeResponse)
def challenge(
    deal_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> ApprovalChallengeResponse:
    with workflow_errors():
        return deals.approval_challenge(db, context, deal_id)
    raise AssertionError("unreachable")


@router.post("/deals/{deal_id}/approve", response_model=DealResponse)
def approve(
    deal_id: UUID,
    payload: ApproveRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> DealResponse:
    with workflow_errors():
        return deals.approve(db, context, deal_id, payload)
    raise AssertionError("unreachable")


@router.post("/deals/{deal_id}/reject", response_model=DealResponse)
def reject(
    deal_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> DealResponse:
    with workflow_errors():
        result = deals.reject(db, context, deal_id)
    return result


@router.post("/deals/{deal_id}/settle", response_model=ReceiptResponse)
def settle(
    deal_id: UUID,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=16, max_length=128)],
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> ReceiptResponse:
    with workflow_errors():
        return deals.settle(db, context, deal_id, idempotency_key)
    raise AssertionError("unreachable")


@router.get("/deals/{deal_id}/receipt", response_model=ReceiptResponse)
def receipt(
    deal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> ReceiptResponse:
    with workflow_errors():
        return deals.get_receipt(db, context, deal_id)
    raise AssertionError("unreachable")


@router.get("/tasks/{task_id}/replay", response_model=ReplayResponse)
def task_replay(
    task_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> ReplayResponse:
    with workflow_errors():
        return replay(db, context, task_id)
    raise AssertionError("unreachable")


@router.get("/tasks/{task_id}/security", response_model=SecurityIncidentListResponse)
def security(
    task_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> SecurityIncidentListResponse:
    with workflow_errors():
        return security_for_task(db, context, task_id)
    raise AssertionError("unreachable")


@router.get("/principals/{principal_id}/supplier-memory", response_model=SupplierMemoryListResponse)
def supplier_memory(
    principal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> SupplierMemoryListResponse:
    with workflow_errors():
        return memories(db, context, principal_id)
    raise AssertionError("unreachable")


@router.post("/supplier-memory/{memory_id}/dispute")
def dispute_supplier_memory(
    memory_id: UUID,
    payload: MemoryDisputeRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> SupplierMemoryResponse:
    with workflow_errors():
        return dispute_memory(db, context, memory_id, payload)
    raise AssertionError("unreachable")


@router.post("/supplier-memory/{memory_id}/correct")
def correct_supplier_memory(
    memory_id: UUID,
    payload: MemoryCorrectionRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> SupplierMemoryResponse:
    with workflow_errors():
        return correct_memory(db, context, memory_id, payload)
    raise AssertionError("unreachable")


@router.get("/notifications", response_model=NotificationListResponse)
def notifications(
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> NotificationListResponse:
    return notification_list(db, context)


@router.post("/operator/notifications/claim")
def claim_pending(
    db: Annotated[Session, Depends(get_session)],
    _bot: Annotated[None, Depends(require_telegram_bot)],
) -> dict[str, list[dict[str, object]]]:
    return {"items": claim_notifications(db)}


@router.post("/operator/notifications/{notification_id}/ack")
def acknowledge_notification(
    notification_id: UUID,
    payload: NotificationAckRequest,
    db: Annotated[Session, Depends(get_session)],
    _bot: Annotated[None, Depends(require_telegram_bot)],
) -> dict[str, str]:
    with workflow_errors():
        ack_notification(db, notification_id, payload.delivered)
    return {"status": "delivered" if payload.delivered else "failed"}


@router.get("/principals/{principal_id}/rfqs", response_model=SellerRFQListResponse)
def seller_rfqs(
    principal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> SellerRFQListResponse:
    member = db.get(PrincipalMember, (principal_id, context.user.id))
    if member is None or member.status != "active":
        raise HTTPException(status_code=404)
    rows = list(
        db.scalars(
            select(Negotiation)
            .where(Negotiation.seller_principal_id == principal_id)
            .order_by(Negotiation.created_at)
        )
    )
    responses = [negotiation.negotiation_response(db, item) for item in rows]
    for response in responses:
        # Keep buyer mandate evaluations and ranking weights private to the buyer.
        for offer in response.offers:
            offer.ranking = {}
            offer.validation = {"evaluation": "private_to_buyer"}
    return SellerRFQListResponse(items=responses)


@router.post("/operator/telegram/tasks/from-text", response_model=TaskResponse)
def bot_create_task(
    payload: TelegramNaturalTaskRequest,
    db: Annotated[Session, Depends(get_session)],
    _bot: Annotated[None, Depends(require_telegram_bot)],
) -> TaskResponse:
    link = db.scalar(
        select(TelegramLink).where(
            TelegramLink.telegram_user_id == payload.telegram_user_id,
            TelegramLink.revoked_at.is_(None),
        )
    )
    if link is None:
        raise HTTPException(status_code=404)
    user = db.get(User, link.user_id)
    membership = db.scalar(
        select(PrincipalMember)
        .join(Agent, Agent.principal_id == PrincipalMember.principal_id)
        .where(
            PrincipalMember.user_id == link.user_id,
            PrincipalMember.status == "active",
            Agent.role == "buyer",
            Agent.status == "active",
        )
        .order_by(PrincipalMember.created_at)
        .limit(1)
    )
    if user is None or user.status != "active" or membership is None:
        raise HTTPException(status_code=404)
    agent = db.scalar(
        select(Agent)
        .where(
            Agent.principal_id == membership.principal_id,
            Agent.role == "buyer",
            Agent.status == "active",
        )
        .order_by(Agent.created_at)
        .limit(1)
    )
    if agent is None:
        raise HTTPException(status_code=404)
    context = tasks.LinkedTaskActor(user=user)
    with workflow_errors():
        request = natural_request(db, membership.principal_id, agent.id, payload.text)
        return tasks.create_task(db, context, request)
    raise AssertionError("unreachable")


@router.post("/operator/proactive/process")
def process_due(
    db: Annotated[Session, Depends(get_session)],
    _bot: Annotated[None, Depends(require_telegram_bot)],
) -> dict[str, int]:
    return {"expired_deals": deals.expire_deals(db), "processed": process_proactive(db)}
