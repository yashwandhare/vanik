from datetime import UTC, datetime
from decimal import Decimal
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.agent_crypto import generate_signing_key
from app.core.agent_policy import default_agent_authority
from app.core.config import Settings
from app.core.security import hash_password
from app.db.models import (
    Agent,
    AgentKey,
    AuditEvent,
    Inventory,
    Principal,
    PrincipalMember,
    Product,
    SellerProfile,
    User,
)
from app.db.session import create_database_engine
from app.fixtures.diwali import DIWALI_PRODUCTS

SELLERS = (
    ("seller-margin", "Mangal Wholesale", "margin", 3, [7, 15]),
    ("seller-clearance", "Utsav Distributors", "clearance", 5, [0, 7]),
    ("seller-risk", "Suraksha Trade Co", "payment_risk", 2, [0, 7, 15, 30]),
    ("seller-adversarial", "Synthetic Red Team Seller", "adversarial", 4, [0]),
)
DEMO_NAMESPACE = uuid5(NAMESPACE_URL, "https://vanik.invalid/demo/diwali-kirana-v1")


class SeedConfigurationError(Exception):
    pass


class SeedConflictError(Exception):
    pass


def demo_id(kind: str, value: str) -> UUID:
    return uuid5(DEMO_NAMESPACE, f"{kind}:{value}")


def _participant(
    db: Session, settings: Settings, slug: str, trade_name: str, role: str, strategy: str
) -> tuple[Principal, Agent]:
    user_id = demo_id("user", slug)
    email = f"{slug}@example.com"
    existing_email = db.scalar(select(User).where(User.email == email))
    if existing_email is not None and existing_email.id != user_id:
        raise SeedConflictError("A demo account email is already owned by a different user")
    user = db.get(User, user_id)
    if user is None:
        user = User(
            id=user_id,
            email=email,
            display_name=f"{trade_name} Demo Owner",
            password_hash=hash_password(settings.demo_account_password.get_secret_value()),
        )
        db.add(user)
        db.flush()

    principal_id = demo_id("principal", slug)
    principal = db.get(Principal, principal_id)
    if principal is None:
        principal = Principal(
            id=principal_id,
            legal_name=f"{trade_name} Synthetic Business",
            trade_name=trade_name,
            business_type="synthetic_distributor" if role == "seller" else "synthetic_retailer",
            address="Synthetic Market Yard, Pune",
            contact_email=email,
            roles=[role],
            agent_authority=default_agent_authority(),
            verification_status="demo_verified",
            verification_updated_at=datetime.now(UTC),
            status="active",
        )
        db.add(principal)
        db.flush()
    if db.get(PrincipalMember, (principal_id, user_id)) is None:
        db.add(PrincipalMember(principal_id=principal_id, user_id=user_id, role="owner"))

    agent_id = demo_id("agent", slug)
    agent = db.get(Agent, agent_id)
    if agent is None:
        generated = generate_signing_key(
            agent_id, 1, settings.agent_key_encryption_secret.get_secret_value()
        )
        agent = Agent(
            id=agent_id,
            principal_id=principal_id,
            name=f"{trade_name} {role.title()} Agent",
            role=role,
            description=f"Synthetic {strategy} {role} strategy",
            capabilities=["request_quote", "evaluate_offers"]
            if role == "buyer"
            else ["receive_rfq", "generate_offer"],
            allowed_tools=["marketplace_search", "benchmark_compare"],
            strategy_profile=strategy,
            status="active",
            passport_version=1,
            current_key_version=1,
        )
        db.add(agent)
        db.flush()
        db.add(
            AgentKey(
                agent_id=agent_id,
                key_version=1,
                public_key=generated.public_key,
                fingerprint=generated.fingerprint,
                private_ciphertext=generated.private_ciphertext,
                private_nonce=generated.private_nonce,
                status="active",
            )
        )
        db.add(
            AuditEvent(
                id=demo_id("event", slug),
                principal_id=principal_id,
                actor_type="human",
                actor_id=user_id,
                event_type="agent.seeded",
                entity_type="agent",
                entity_id=agent_id,
                payload={"dataset": "diwali_kirana_v1", "synthetic": True, "passport_version": 1},
            )
        )
    elif agent.principal_id != principal_id or agent.role != role:
        raise SeedConflictError("Demo agent identity conflicts with its principal")
    return principal, agent


def seed_demo(db: Session, settings: Settings) -> dict[str, int]:
    """Insert missing synthetic fixtures; never reset permissions, lifecycle or reservations."""
    if len(settings.demo_account_password.get_secret_value()) < 12:
        raise SeedConfigurationError(
            "Set DEMO_ACCOUNT_PASSWORD to a synthetic password of 12+ characters"
        )
    if len(settings.agent_key_encryption_secret.get_secret_value()) < 32:
        raise SeedConfigurationError(
            "Set a high-entropy AGENT_KEY_ENCRYPTION_SECRET before seeding"
        )
    products: list[Product] = []
    for sku, name, category, unit, benchmark in DIWALI_PRODUCTS:
        product_id = demo_id("product", sku)
        product = db.scalar(select(Product).where(Product.sku == sku))
        if product is not None and product.id != product_id:
            raise SeedConflictError("A demo SKU is already assigned to a different product")
        if product is None:
            product = Product(
                id=product_id,
                sku=sku,
                name=name,
                category=category,
                unit=unit,
                benchmark_price=benchmark,
                attributes={"dataset": "diwali_kirana_v1", "synthetic": True},
                active=True,
            )
            db.add(product)
        products.append(product)
    db.flush()
    _participant(db, settings, "buyer-kirana", "Shree Ganesh Kirana", "buyer", "default")
    for seller_index, (slug, name, strategy, delivery, credit) in enumerate(SELLERS):
        principal, agent = _participant(db, settings, slug, name, "seller", strategy)
        if db.get(SellerProfile, principal.id) is None:
            db.add(
                SellerProfile(
                    principal_id=principal.id,
                    coverage=["Pune", "Maharashtra"],
                    delivery_days=delivery,
                    credit_days=credit,
                    public_policies={"strategy": strategy, "synthetic": True},
                    reliability_score=None,
                    reliability_evidence_count=0,
                    evidence_is_simulated=True,
                )
            )
        for product_index, product in enumerate(products):
            if db.get(Inventory, (principal.id, agent.id, product.id)) is None:
                db.add(
                    Inventory(
                        principal_id=principal.id,
                        agent_id=agent.id,
                        product_id=product.id,
                        available_qty=Decimal(40 + ((product_index * 7 + seller_index * 13) % 90)),
                        reserved_qty=Decimal(0),
                    )
                )
    db.commit()
    return {
        "products": 40,
        "seller_principals": 4,
        "seller_agents": 4,
        "buyer_agents": 1,
        "users": 5,
    }


def main() -> None:
    settings = Settings()
    engine = create_database_engine(settings)
    try:
        with Session(engine) as db:
            result = seed_demo(db, settings)
        print(f"Seeded synthetic demo data: {result}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
