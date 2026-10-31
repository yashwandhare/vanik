from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.contracts.identity import BusinessRole, VerificationStatus
from app.contracts.marketplace import (
    InventoryLineResponse,
    InventoryResponse,
    InventoryUpdateRequest,
    ProductListResponse,
    ProductResponse,
    SellerAgentSummary,
    SellerListResponse,
    SellerProfileRequest,
    SellerProfileResponse,
    SellerSummary,
)
from app.contracts.pagination import Pagination
from app.core.agent_policy import policy_allows
from app.db.models import (
    Agent,
    AgentKey,
    AuditEvent,
    Inventory,
    Principal,
    PrincipalMember,
    Product,
    SellerProfile,
)
from app.services.auth import AuthContext


class MarketplaceNotFoundError(Exception):
    pass


class InventoryPermissionError(Exception):
    pass


class InventoryConflictError(Exception):
    pass


def product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        sku=product.sku,
        name=product.name,
        category=product.category,
        unit=product.unit,
        benchmark_price=product.benchmark_price,
        attributes=product.attributes,
        active=product.active,
    )


def list_products(
    db: Session, limit: int, offset: int, category: str | None, query: str | None
) -> ProductListResponse:
    filters: list[ColumnElement[bool]] = [Product.active.is_(True)]
    if category:
        filters.append(Product.category == category)
    if query:
        pattern = f"%{query.strip()}%"
        filters.append(or_(Product.sku.ilike(pattern), Product.name.ilike(pattern)))
    total = db.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    products = db.scalars(
        select(Product)
        .where(*filters)
        .order_by(Product.category, Product.sku)
        .limit(limit)
        .offset(offset)
    )
    return ProductListResponse(
        items=[product_response(item) for item in products],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )


def _active_seller_agents(db: Session, principal: Principal) -> list[Agent]:
    if principal.status != "active" or principal.verification_status != "demo_verified":
        return []
    agents = db.scalars(
        select(Agent)
        .join(
            AgentKey,
            and_(AgentKey.agent_id == Agent.id, AgentKey.key_version == Agent.current_key_version),
        )
        .where(
            Agent.principal_id == principal.id,
            Agent.role == "seller",
            Agent.status == "active",
            AgentKey.status == "active",
        )
        .order_by(Agent.created_at, Agent.id)
    )
    return [
        agent
        for agent in agents
        if policy_allows(
            BusinessRole.SELLER,
            principal.roles,
            principal.agent_authority,
            agent.capabilities,
            agent.allowed_tools,
            agent.strategy_profile,
        )
    ]


def _seller_agent(db: Session, principal_id: UUID, agent_id: UUID) -> Agent:
    principal = db.get(Principal, principal_id)
    if principal is not None:
        for agent in _active_seller_agents(db, principal):
            if agent.id == agent_id:
                return agent
    raise MarketplaceNotFoundError


def get_inventory(
    db: Session, principal_id: UUID, agent_id: UUID, limit: int, offset: int
) -> InventoryResponse:
    _seller_agent(db, principal_id, agent_id)
    filters = (
        Inventory.principal_id == principal_id,
        Inventory.agent_id == agent_id,
        Product.active.is_(True),
    )
    total = (
        db.scalar(
            select(func.count())
            .select_from(Inventory)
            .join(Product, Product.id == Inventory.product_id)
            .where(*filters)
        )
        or 0
    )
    rows = db.execute(
        select(Inventory, Product)
        .join(Product, Product.id == Inventory.product_id)
        .where(*filters)
        .order_by(Product.category, Product.sku)
        .limit(limit)
        .offset(offset)
    )
    return InventoryResponse(
        principal_id=principal_id,
        agent_id=agent_id,
        items=[
            InventoryLineResponse(
                product=product_response(product),
                available_qty=inventory.available_qty - inventory.reserved_qty,
            )
            for inventory, product in rows
        ],
        pagination=Pagination(limit=limit, offset=offset, total=total),
    )


def update_inventory(
    db: Session,
    context: AuthContext,
    principal_id: UUID,
    agent_id: UUID,
    payload: InventoryUpdateRequest,
) -> InventoryLineResponse:
    membership = db.get(PrincipalMember, (principal_id, context.user.id))
    if membership is None or membership.status != "active":
        raise MarketplaceNotFoundError
    if membership.role not in {"owner", "admin", "operator"}:
        raise InventoryPermissionError
    _seller_agent(db, principal_id, agent_id)
    product = db.get(Product, payload.product_id)
    if product is None or not product.active:
        raise MarketplaceNotFoundError
    row = db.scalar(
        select(Inventory)
        .where(
            Inventory.principal_id == principal_id,
            Inventory.agent_id == agent_id,
            Inventory.product_id == payload.product_id,
        )
        .with_for_update()
    )
    if row is None:
        row = Inventory(
            principal_id=principal_id,
            agent_id=agent_id,
            product_id=product.id,
            available_qty=payload.stock_qty,
            reserved_qty=0,
        )
        db.add(row)
    elif payload.stock_qty < row.reserved_qty:
        raise InventoryConflictError
    else:
        row.available_qty = payload.stock_qty
    row.last_updated = datetime.now(UTC)
    db.add(
        AuditEvent(
            principal_id=principal_id,
            actor_type="human",
            actor_id=context.user.id,
            event_type="inventory.updated",
            entity_type="inventory",
            entity_id=product.id,
            payload={"agent_id": str(agent_id), "stock_qty": str(payload.stock_qty)},
        )
    )
    db.commit()
    return InventoryLineResponse(
        product=product_response(product), available_qty=row.available_qty - row.reserved_qty
    )


def list_sellers(
    db: Session,
    limit: int,
    offset: int,
    category: str | None,
    coverage: str | None,
    min_credit_days: int | None,
    query: str | None = None,
    max_delivery_days: int | None = None,
) -> SellerListResponse:
    rows = db.execute(
        select(SellerProfile, Principal)
        .join(Principal, Principal.id == SellerProfile.principal_id)
        .where(Principal.status == "active", Principal.verification_status == "demo_verified")
        .order_by(Principal.trade_name, Principal.id)
    )
    results: list[SellerSummary] = []
    for profile, principal in rows:
        if coverage and coverage.casefold() not in {place.casefold() for place in profile.coverage}:
            continue
        if min_credit_days is not None and not any(
            day >= min_credit_days for day in profile.credit_days
        ):
            continue
        if max_delivery_days is not None and profile.delivery_days > max_delivery_days:
            continue
        if (
            query
            and query.casefold() not in f"{principal.trade_name} {principal.legal_name}".casefold()
        ):
            continue
        agents = _active_seller_agents(db, principal)
        if not agents:
            continue
        stock_query = (
            select(func.count(func.distinct(Inventory.product_id)))
            .join(Product, Product.id == Inventory.product_id)
            .where(
                Inventory.principal_id == principal.id,
                Inventory.agent_id.in_([agent.id for agent in agents]),
                Inventory.available_qty > Inventory.reserved_qty,
                Product.active.is_(True),
            )
        )
        if category:
            stock_query = stock_query.where(Product.category == category)
        available = db.scalar(stock_query) or 0
        if category and available == 0:
            continue
        results.append(
            SellerSummary(
                principal_id=principal.id,
                trade_name=principal.trade_name,
                verification_status=VerificationStatus(principal.verification_status),
                coverage=profile.coverage,
                delivery_days=profile.delivery_days,
                credit_days=profile.credit_days,
                available_sku_count=available,
                reliability_score=profile.reliability_score,
                reliability_evidence_count=profile.reliability_evidence_count,
                evidence_is_simulated=profile.evidence_is_simulated,
                agents=[
                    SellerAgentSummary(
                        agent_id=agent.id,
                        name=agent.name,
                        strategy_profile=agent.strategy_profile,
                        status=agent.status,
                    )
                    for agent in agents
                ],
            )
        )
    return SellerListResponse(
        items=results[offset : offset + limit],
        pagination=Pagination(limit=limit, offset=offset, total=len(results)),
    )


def get_seller_profile(db: Session, principal_id: UUID) -> SellerProfileResponse:
    principal = db.get(Principal, principal_id)
    profile = db.get(SellerProfile, principal_id)
    if principal is None or profile is None:
        raise MarketplaceNotFoundError
    agents = _active_seller_agents(db, principal)
    if not agents:
        raise MarketplaceNotFoundError
    available = (
        db.scalar(
            select(func.count(func.distinct(Inventory.product_id)))
            .join(Product, Product.id == Inventory.product_id)
            .where(
                Inventory.principal_id == principal_id,
                Inventory.agent_id.in_([agent.id for agent in agents]),
                Inventory.available_qty > Inventory.reserved_qty,
                Product.active.is_(True),
            )
        )
        or 0
    )
    seller = SellerSummary(
        principal_id=principal_id,
        trade_name=principal.trade_name,
        verification_status=VerificationStatus(principal.verification_status),
        coverage=profile.coverage,
        delivery_days=profile.delivery_days,
        credit_days=profile.credit_days,
        available_sku_count=available,
        reliability_score=profile.reliability_score,
        reliability_evidence_count=profile.reliability_evidence_count,
        evidence_is_simulated=profile.evidence_is_simulated,
        agents=[
            SellerAgentSummary(
                agent_id=agent.id,
                name=agent.name,
                strategy_profile=agent.strategy_profile,
                status=agent.status,
            )
            for agent in agents
        ],
    )
    return SellerProfileResponse(
        seller=seller,
        legal_name=principal.legal_name,
        business_type=principal.business_type,
        address=principal.address,
        public_policies=profile.public_policies,
    )


def set_seller_profile(
    db: Session, context: AuthContext, principal_id: UUID, payload: SellerProfileRequest
) -> SellerProfileResponse:
    member = db.get(PrincipalMember, (principal_id, context.user.id))
    principal = db.get(Principal, principal_id)
    if member is None or member.status != "active" or principal is None:
        raise MarketplaceNotFoundError
    if member.role not in {"owner", "admin"}:
        raise InventoryPermissionError
    if not _active_seller_agents(db, principal):
        raise InventoryConflictError
    profile = db.get(SellerProfile, principal_id)
    if profile is None:
        profile = SellerProfile(
            principal_id=principal_id,
            reliability_evidence_count=0,
            reliability_score=None,
            evidence_is_simulated=True,
        )
        db.add(profile)
    profile.coverage = list(payload.coverage)
    profile.delivery_days = payload.delivery_days
    profile.credit_days = list(payload.credit_days)
    profile.public_policies = {
        "delivery_terms": payload.delivery_terms,
        "payment_note": payload.payment_note,
        "synthetic": True,
    }
    db.add(
        AuditEvent(
            principal_id=principal_id,
            actor_type="human",
            actor_id=context.user.id,
            event_type="seller.profile_updated",
            entity_type="principal",
            entity_id=principal_id,
            payload={"delivery_days": payload.delivery_days, "credit_days": payload.credit_days},
        )
    )
    db.commit()
    return get_seller_profile(db, principal_id)
