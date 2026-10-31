from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.contracts.identity import AgentCreateRequest, AgentStatus, BusinessRole, VerificationStatus
from app.contracts.pagination import AgentListResponse, Pagination
from app.contracts.passport import (
    AgentPassportResponse,
    MarketRating,
    PublicSigningKey,
    SecuritySummary,
    TrustConfidence,
)
from app.core.agent_crypto import decrypt_signing_key, generate_signing_key, verify_signature
from app.core.agent_policy import policy_allows
from app.core.config import Settings
from app.db.models import Agent, AgentKey, AuditEvent, Principal, PrincipalMember
from app.services.auth import AuthContext, as_utc


class AgentNotFoundError(Exception):
    pass


class AgentForbiddenError(Exception):
    pass


class AgentPolicyError(Exception):
    pass


class AgentStateError(Exception):
    pass


def _member_principal(
    db: Session, context: AuthContext, principal_id: UUID, *, manage: bool, lock: bool
) -> Principal:
    query = (
        select(Principal)
        .where(Principal.id == principal_id)
        .execution_options(populate_existing=True)
    )
    if lock:
        query = query.with_for_update()
    principal = db.scalar(query)
    membership = db.scalar(
        select(PrincipalMember)
        .where(
            PrincipalMember.principal_id == principal_id, PrincipalMember.user_id == context.user.id
        )
        .execution_options(populate_existing=True)
    )
    if principal is None or membership is None or membership.status != "active":
        raise AgentNotFoundError
    if manage and membership.role not in {"owner", "admin"}:
        raise AgentForbiddenError
    return principal


def _operational_principal(principal: Principal) -> bool:
    return principal.status == "active" and principal.verification_status == "demo_verified"


def _policy_valid(agent: Agent, principal: Principal) -> bool:
    return policy_allows(
        BusinessRole(agent.role),
        principal.roles,
        principal.agent_authority,
        agent.capabilities,
        agent.allowed_tools,
        agent.strategy_profile,
    )


def _current_key(db: Session, agent: Agent) -> AgentKey:
    key = db.scalar(
        select(AgentKey)
        .where(AgentKey.agent_id == agent.id, AgentKey.key_version == agent.current_key_version)
        .execution_options(populate_existing=True)
    )
    if key is None:
        raise AgentStateError
    return key


def _passport(agent: Agent, principal: Principal, key: AgentKey) -> AgentPassportResponse:
    restricted = (
        agent.status == "revoked"
        or key.status != "active"
        or not _operational_principal(principal)
        or not _policy_valid(agent, principal)
    )
    return AgentPassportResponse(
        agent_id=agent.id,
        principal_id=agent.principal_id,
        name=agent.name,
        role=BusinessRole(agent.role),
        description=agent.description,
        capabilities=agent.capabilities,
        allowed_tools=agent.allowed_tools,
        strategy_profile=agent.strategy_profile,
        passport_version=agent.passport_version,
        agent_status=AgentStatus(agent.status),
        verification_status=VerificationStatus(principal.verification_status),
        signing_key=PublicSigningKey(
            public_key=key.public_key, fingerprint=key.fingerprint, key_version=key.key_version
        ),
        # No commercial outcomes exist yet. New agents are unrated, not given invented scores.
        market_rating=MarketRating(verified_outcome_count=0, evidence_is_simulated=True),
        trust_confidence=TrustConfidence(
            level="limited",
            evidence_count=0,
            summary="No verified commercial outcomes recorded for this demo agent.",
            evidence_is_simulated=True,
        ),
        security=SecuritySummary(
            status="restricted" if restricted else "no_incidents_recorded", incident_count=0
        ),
        created_at=as_utc(agent.created_at),
        updated_at=as_utc(agent.updated_at),
    )


def _new_key(agent_id: UUID, key_version: int, settings: Settings) -> AgentKey:
    generated = generate_signing_key(
        agent_id, key_version, settings.agent_key_encryption_secret.get_secret_value()
    )
    return AgentKey(
        agent_id=agent_id,
        key_version=key_version,
        public_key=generated.public_key,
        fingerprint=generated.fingerprint,
        private_ciphertext=generated.private_ciphertext,
        private_nonce=generated.private_nonce,
    )


def _record_event(db: Session, context: AuthContext, agent: Agent, event_type: str) -> None:
    db.add(
        AuditEvent(
            principal_id=agent.principal_id,
            actor_type="human",
            actor_id=context.user.id,
            event_type=event_type,
            entity_type="agent",
            entity_id=agent.id,
            payload={
                "passport_version": agent.passport_version,
                "key_version": agent.current_key_version,
                "agent_status": agent.status,
            },
        )
    )


def create_agent(
    db: Session,
    context: AuthContext,
    principal_id: UUID,
    payload: AgentCreateRequest,
    settings: Settings,
) -> AgentPassportResponse:
    principal = _member_principal(db, context, principal_id, manage=True, lock=True)
    if not _operational_principal(principal):
        raise AgentStateError
    if not policy_allows(
        payload.role,
        principal.roles,
        principal.agent_authority,
        payload.capabilities,
        payload.allowed_tools,
        payload.strategy_profile,
    ):
        raise AgentPolicyError
    now = datetime.now(UTC)
    agent = Agent(
        id=uuid4(),
        principal_id=principal_id,
        name=payload.name,
        role=payload.role.value,
        description=payload.description,
        capabilities=list(payload.capabilities),
        allowed_tools=list(payload.allowed_tools),
        strategy_profile=payload.strategy_profile,
        status="active",
        passport_version=1,
        current_key_version=1,
        created_at=now,
        updated_at=now,
    )
    key = _new_key(agent.id, 1, settings)
    db.add(agent)
    db.flush()
    db.add(key)
    _record_event(db, context, agent, "agent.created")
    db.commit()
    return _passport(agent, principal, key)


def list_agents(
    db: Session, context: AuthContext, principal_id: UUID, limit: int, offset: int
) -> AgentListResponse:
    principal = _member_principal(db, context, principal_id, manage=False, lock=False)
    total = db.scalar(
        select(func.count()).select_from(Agent).where(Agent.principal_id == principal_id)
    )
    rows = db.execute(
        select(Agent, AgentKey)
        .join(
            AgentKey,
            and_(AgentKey.agent_id == Agent.id, AgentKey.key_version == Agent.current_key_version),
        )
        .where(Agent.principal_id == principal_id)
        .order_by(Agent.created_at, Agent.id)
        .limit(limit)
        .offset(offset)
    )
    return AgentListResponse(
        items=[_passport(agent, principal, key) for agent, key in rows],
        pagination=Pagination(limit=limit, offset=offset, total=total or 0),
    )


def get_passport(db: Session, agent_id: UUID) -> AgentPassportResponse:
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise AgentNotFoundError
    principal = db.get(Principal, agent.principal_id)
    if principal is None:
        raise AgentStateError
    return _passport(agent, principal, _current_key(db, agent))


def _managed_agent(db: Session, context: AuthContext, agent_id: UUID) -> tuple[Agent, Principal]:
    observed = db.get(Agent, agent_id)
    if observed is None:
        raise AgentNotFoundError
    principal = _member_principal(db, context, observed.principal_id, manage=True, lock=True)
    agent = db.scalar(
        select(Agent)
        .where(Agent.id == agent_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if agent is None:
        raise AgentNotFoundError
    return agent, principal


def set_agent_status(
    db: Session, context: AuthContext, agent_id: UUID, target: AgentStatus
) -> AgentPassportResponse:
    agent, principal = _managed_agent(db, context, agent_id)
    key = _current_key(db, agent)
    if agent.status == "revoked" and target != AgentStatus.REVOKED:
        raise AgentStateError
    if target == AgentStatus.ACTIVE and (
        not _operational_principal(principal) or not _policy_valid(agent, principal)
    ):
        raise AgentStateError
    if target == AgentStatus.ACTIVE and key.status != "active":
        raise AgentStateError
    if agent.status == target.value:
        return _passport(agent, principal, key)
    agent.status = target.value
    agent.passport_version += 1
    agent.updated_at = datetime.now(UTC)
    if target == AgentStatus.REVOKED:
        key.status = "revoked"
        key.revoked_at = agent.updated_at
    _record_event(db, context, agent, f"agent.{target.value}")
    db.commit()
    return _passport(agent, principal, key)


def rotate_agent_key(
    db: Session, context: AuthContext, agent_id: UUID, settings: Settings
) -> AgentPassportResponse:
    agent, principal = _managed_agent(db, context, agent_id)
    if agent.status == "revoked" or not _operational_principal(principal):
        raise AgentStateError
    old_key = _current_key(db, agent)
    key = _new_key(agent.id, agent.current_key_version + 1, settings)
    now = datetime.now(UTC)
    old_key.status = "revoked"
    old_key.revoked_at = now
    db.flush()  # Release the unique active-key slot inside the same transaction.
    db.add(key)
    agent.current_key_version = key.key_version
    agent.passport_version += 1
    agent.updated_at = now
    _record_event(db, context, agent, "agent.key_rotated")
    db.commit()
    return _passport(agent, principal, key)


def _signing_agent(db: Session, agent_id: UUID) -> tuple[Agent, Principal, AgentKey]:
    agent = db.scalar(
        select(Agent).where(Agent.id == agent_id).execution_options(populate_existing=True)
    )
    if agent is None:
        raise AgentNotFoundError
    principal = db.scalar(
        select(Principal)
        .where(Principal.id == agent.principal_id)
        .execution_options(populate_existing=True)
    )
    if principal is None or not _operational_principal(principal):
        raise AgentStateError
    if agent.status != "active" or not _policy_valid(agent, principal):
        raise AgentStateError
    key = _current_key(db, agent)
    if key.status != "active":
        raise AgentStateError
    return agent, principal, key


def sign_agent_payload(db: Session, agent_id: UUID, payload: bytes, settings: Settings) -> bytes:
    """Internal identity primitive; task/nonce authorization belongs to the negotiation service."""
    agent, _principal, key = _signing_agent(db, agent_id)
    private = decrypt_signing_key(
        agent.id,
        key.key_version,
        key.private_ciphertext,
        key.private_nonce,
        settings.agent_key_encryption_secret.get_secret_value(),
    )
    return private.sign(payload)


def verify_agent_payload(
    db: Session, agent_id: UUID, key_version: int, signature: bytes, payload: bytes
) -> bool:
    try:
        _agent, _principal, key = _signing_agent(db, agent_id)
    except (AgentNotFoundError, AgentStateError):
        return False
    return key.key_version == key_version and verify_signature(key.public_key, signature, payload)
