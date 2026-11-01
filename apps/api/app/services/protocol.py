import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.workflow import AgentEnvelope, OfferTerms
from app.core.config import Settings
from app.core.security import generate_opaque_token
from app.db.models import Agent, AgentKey
from app.db.workflow_models import AgentMessage, Negotiation
from app.services.agents import sign_agent_payload, verify_agent_payload
from app.services.auth import as_utc


class ProtocolError(Exception):
    pass


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode(
        "utf-8"
    )


def content_hash(value: object) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def validate_envelope(db: Session, negotiation: Negotiation, envelope: AgentEnvelope) -> None:
    now = datetime.now(UTC)
    if envelope.created_at > now + timedelta(seconds=30) or envelope.created_at < now - timedelta(
        minutes=5
    ):
        raise ProtocolError("Message timestamp is outside the accepted window")
    if envelope.negotiation_id != negotiation.id or envelope.task_id != negotiation.task_id:
        raise ProtocolError("Message scope mismatch")
    valid_pair = {negotiation.buyer_agent_id, negotiation.seller_agent_id}
    if (
        envelope.sender_agent_id not in valid_pair
        or envelope.recipient_agent_id not in valid_pair
        or envelope.sender_agent_id == envelope.recipient_agent_id
    ):
        raise ProtocolError("Message participants mismatch")
    buyer_messages = {"REQUEST_FOR_QUOTE", "COUNTER_OFFER", "ACCEPT", "REJECT"}
    seller_messages = {"OFFER", "FINAL_OFFER", "WITHDRAW", "EXPIRE"}
    if (
        envelope.message_type in seller_messages
        and envelope.sender_agent_id != negotiation.seller_agent_id
    ):
        raise ProtocolError("Seller message has a different sender")
    if (
        envelope.message_type in buyer_messages
        and envelope.sender_agent_id != negotiation.buyer_agent_id
    ):
        raise ProtocolError("Buyer message has a different sender")
    from app.db.task_models import Task

    task = db.get(Task, negotiation.task_id)
    if (
        task is None
        or as_utc(task.expires_at) <= now
        or task.status not in {"created", "running", "awaiting_approval"}
    ):
        raise ProtocolError("Mandate is expired or inactive")
    agent = db.get(Agent, envelope.sender_agent_id)
    recipient = db.get(Agent, envelope.recipient_agent_id)
    if (
        agent is None
        or recipient is None
        or agent.principal_id != envelope.sender_principal_id
        or recipient.status != "active"
    ):
        raise ProtocolError("Sender/recipient identity mismatch")
    if (
        db.get(AgentMessage, envelope.message_id) is not None
        or db.scalar(
            select(AgentMessage.id).where(
                AgentMessage.sender_agent_id == envelope.sender_agent_id,
                AgentMessage.nonce == envelope.nonce,
            )
        )
        is not None
    ):
        raise ProtocolError("Message replay rejected")
    expected_state = {
        "REQUEST_FOR_QUOTE": {"rfq_sent"},
        "OFFER": {"rfq_sent"},
        "FINAL_OFFER": {"rfq_sent"},
        "COUNTER_OFFER": {"evaluating"},
        "ACCEPT": {"evaluating"},
        "REJECT": {"evaluating"},
        "WITHDRAW": {"rfq_sent", "offer_received", "evaluating", "counter_pending"},
        "EXPIRE": {"rfq_sent", "offer_received", "evaluating", "counter_pending"},
        "SECURITY_REPORT": {"rfq_sent", "offer_received", "evaluating", "counter_pending"},
    }
    if negotiation.state not in expected_state[envelope.message_type]:
        raise ProtocolError("Message type is invalid for negotiation state")
    if envelope.message_type in {"OFFER", "FINAL_OFFER"}:
        try:
            OfferTerms.model_validate(envelope.payload)
        except ValueError as exc:
            raise ProtocolError("Malformed offer payload") from exc
    if envelope.payload_hash != content_hash(envelope.payload):
        raise ProtocolError("Payload hash mismatch")
    unsigned = envelope.model_dump(mode="json", exclude={"signature"})
    try:
        signature = base64.b64decode(envelope.signature, validate=True)
    except ValueError as exc:
        raise ProtocolError("Invalid signature encoding") from exc
    if not verify_agent_payload(db, agent.id, envelope.key_version, signature, canonical(unsigned)):
        raise ProtocolError("Agent signature, key status or authority rejected")


def send_message(
    db: Session,
    negotiation: Negotiation,
    sender: UUID,
    recipient: UUID,
    message_type: str,
    payload: dict[str, object],
    settings: Settings,
) -> AgentEnvelope:
    agent = db.get(Agent, sender)
    if agent is None:
        raise ProtocolError("Unknown sender")
    key = db.scalar(
        select(AgentKey).where(
            AgentKey.agent_id == sender,
            AgentKey.key_version == agent.current_key_version,
            AgentKey.status == "active",
        )
    )
    if key is None:
        raise ProtocolError("Sender key unavailable")
    unsigned = {
        "message_id": str(uuid4()),
        "protocol_version": "vanik.a2a.v1",
        "message_type": message_type,
        "sender_agent_id": str(sender),
        "recipient_agent_id": str(recipient),
        "sender_principal_id": str(agent.principal_id),
        "negotiation_id": str(negotiation.id),
        "task_id": str(negotiation.task_id),
        "created_at": datetime.now(UTC).isoformat(),
        "nonce": generate_opaque_token(),
        "key_version": key.key_version,
        "payload": payload,
        "payload_hash": content_hash(payload),
    }
    signature = sign_agent_payload(db, sender, canonical(unsigned), settings)
    envelope = AgentEnvelope.model_validate(
        {**unsigned, "signature": base64.b64encode(signature).decode()}
    )
    # Sign the exact normalized wire content (Pydantic emits UTC timestamps using Z).
    normalized = envelope.model_dump(mode="json", exclude={"signature"})
    envelope.signature = base64.b64encode(
        sign_agent_payload(db, sender, canonical(normalized), settings)
    ).decode()
    validate_envelope(db, negotiation, envelope)
    db.add(
        AgentMessage(
            id=envelope.message_id,
            negotiation_id=negotiation.id,
            sender_agent_id=sender,
            nonce=envelope.nonce,
            message_type=envelope.message_type,
            envelope=envelope.model_dump(mode="json"),
        )
    )
    db.flush()
    return envelope
