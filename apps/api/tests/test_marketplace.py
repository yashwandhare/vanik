from decimal import Decimal

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import (
    Agent,
    AgentKey,
    Inventory,
    Principal,
    PrincipalMember,
    Product,
    SellerProfile,
    User,
)
from app.fixtures.diwali import DIWALI_PRODUCTS
from app.seed import SeedConfigurationError, demo_id, seed_demo


def test_seed_is_idempotent_and_contains_exact_demo_shape(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    expected = {
        "products": 40,
        "seller_principals": 4,
        "seller_agents": 4,
        "buyer_agents": 1,
        "users": 5,
    }
    assert seed_demo(db, application.state.settings) == expected
    assert seed_demo(db, application.state.settings) == expected
    assert len(DIWALI_PRODUCTS) == 40
    assert db.scalar(select(func.count()).select_from(Product)) == 40
    assert db.scalar(select(func.count()).select_from(SellerProfile)) == 4
    assert db.scalar(select(func.count()).select_from(Agent).where(Agent.role == "seller")) == 4
    assert db.scalar(select(func.count()).select_from(Inventory)) == 160
    assert set(db.scalars(select(Product.category))) == {
        "staples",
        "edible_oils",
        "dry_fruits",
        "confectionery",
        "spices",
    }


def test_catalogue_pagination_search_and_decimal_serialization(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    seed_demo(db, application.state.settings)
    response = client.get("/v1/catalogue/products?limit=40")
    assert response.status_code == 200
    assert response.json()["pagination"] == {"limit": 40, "offset": 0, "total": 40}
    assert len({item["sku"] for item in response.json()["items"]}) == 40
    assert all(isinstance(item["benchmark_price"], str) for item in response.json()["items"])
    spices = client.get("/v1/catalogue/products?category=spices&query=Cardamom")
    assert spices.status_code == 200
    assert [item["sku"] for item in spices.json()["items"]] == ["SPC-CARD-50"]
    assert client.get("/v1/catalogue/products?limit=101").status_code == 422


def test_seller_discovery_filters_and_keeps_evidence_explicit(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    seed_demo(db, application.state.settings)
    response = client.get(
        "/v1/marketplace/sellers?coverage=Pune&category=spices&min_credit_days=15"
    )
    assert response.status_code == 200
    sellers = response.json()["items"]
    assert len(sellers) == 2
    assert {seller["trade_name"] for seller in sellers} == {
        "Mangal Wholesale",
        "Suraksha Trade Co",
    }
    assert all(seller["available_sku_count"] == 8 for seller in sellers)
    assert all(seller["evidence_is_simulated"] is True for seller in sellers)
    assert all(len(seller["agents"]) == 1 for seller in sellers)
    assert all("private" not in str(seller) for seller in sellers)


def test_inventory_is_scoped_to_matching_seller_agent(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    seed_demo(db, application.state.settings)
    principal = db.scalar(select(Principal).where(Principal.trade_name == "Mangal Wholesale"))
    assert principal is not None
    agent = db.scalar(select(Agent).where(Agent.principal_id == principal.id))
    assert agent is not None
    path = f"/v1/principals/{principal.id}/agents/{agent.id}/inventory?limit=40"
    response = client.get(path)
    assert response.status_code == 200
    assert response.json()["pagination"]["total"] == 40
    assert all(Decimal(item["available_qty"]) >= 0 for item in response.json()["items"])
    other = db.scalar(select(Agent).where(Agent.principal_id != principal.id))
    assert other is not None
    assert (
        client.get(f"/v1/principals/{principal.id}/agents/{other.id}/inventory").status_code == 404
    )


def test_seed_preserves_lifecycle_permissions_and_reservations(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    seed_demo(db, application.state.settings)
    agent = db.get(Agent, demo_id("agent", "seller-margin"))
    principal = db.get(Principal, demo_id("principal", "seller-margin"))
    key = db.scalar(select(AgentKey).where(AgentKey.agent_id == agent.id)) if agent else None
    stock = db.scalar(select(Inventory).where(Inventory.agent_id == agent.id)) if agent else None
    assert agent is not None and principal is not None and key is not None and stock is not None
    agent.status = "revoked"
    key.status = "revoked"
    principal.agent_authority = {"seller": {"capabilities": [], "allowed_tools": []}}
    stock.available_qty = Decimal("20")
    stock.reserved_qty = Decimal("10")
    db.commit()
    seed_demo(db, application.state.settings)
    db.refresh(agent)
    db.refresh(key)
    db.refresh(principal)
    db.refresh(stock)
    assert agent.status == key.status == "revoked"
    assert principal.agent_authority["seller"]["allowed_tools"] == []
    assert stock.available_qty == 20 and stock.reserved_qty == 10
    sellers = client.get("/v1/marketplace/sellers").json()["items"]
    assert principal.id.hex not in {item["principal_id"].replace("-", "") for item in sellers}


def test_seed_requires_password_and_creates_real_demo_accounts(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    settings = application.state.settings
    password = settings.demo_account_password
    settings.demo_account_password = SecretStr("")
    with pytest.raises(SeedConfigurationError):
        seed_demo(db, settings)
    assert db.scalar(select(func.count()).select_from(Product)) == 0
    settings.demo_account_password = password
    seed_demo(db, settings)
    assert db.scalar(select(func.count()).select_from(User)) == 5
    response = client.post(
        "/v1/auth/login",
        headers={"Origin": "http://localhost:3000"},
        json={"email": "buyer-kirana@example.com", "password": password.get_secret_value()},
    )
    assert response.status_code == 200
    principal_id = demo_id("principal", "buyer-kirana")
    assert client.get(f"/v1/principals/{principal_id}").status_code == 200


def test_inventory_updates_respect_membership_and_reserved_stock(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    settings = application.state.settings
    seed_demo(db, settings)
    principal_id = demo_id("principal", "seller-margin")
    agent_id = demo_id("agent", "seller-margin")
    product_id = demo_id("product", "STP-RICE-BAS-5K")
    stock = db.get(Inventory, (principal_id, agent_id, product_id))
    assert stock is not None
    stock.reserved_qty = Decimal("15")
    db.commit()
    login = client.post(
        "/v1/auth/login",
        headers={"Origin": "http://localhost:3000"},
        json={
            "email": "seller-margin@example.com",
            "password": settings.demo_account_password.get_secret_value(),
        },
    )
    assert login.status_code == 200
    headers = {"Origin": "http://localhost:3000", "X-CSRF-Token": login.json()["csrf_token"]}
    path = f"/v1/principals/{principal_id}/agents/{agent_id}/inventory"
    body = {"product_id": str(product_id), "stock_qty": "14.000"}
    assert client.post(path, headers=headers, json=body).status_code == 409
    body["stock_qty"] = "20.000"
    updated = client.post(path, headers=headers, json=body)
    assert updated.status_code == 200 and Decimal(updated.json()["available_qty"]) == 5
    assert "reserved_qty" not in updated.json()
    membership = db.get(PrincipalMember, (principal_id, demo_id("user", "seller-margin")))
    assert membership is not None
    membership.role = "viewer"
    db.commit()
    assert client.post(path, headers=headers, json=body).status_code == 403


def test_inventory_database_rejects_cross_principal_agent_mapping(
    application: FastAPI, db: Session
) -> None:
    seed_demo(db, application.state.settings)
    with pytest.raises(IntegrityError):
        db.add(
            Inventory(
                principal_id=demo_id("principal", "seller-margin"),
                agent_id=demo_id("agent", "seller-risk"),
                product_id=demo_id("product", "STP-RICE-BAS-5K"),
                available_qty=10,
                reserved_qty=0,
            )
        )
        db.flush()
    db.rollback()
