from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import require_allowed_origin, require_csrf
from app.contracts.marketplace import (
    InventoryLineResponse,
    InventoryResponse,
    InventoryUpdateRequest,
    ProductListResponse,
    SellerListResponse,
)
from app.db.session import get_session
from app.services.auth import AuthContext
from app.services.marketplace import (
    InventoryConflictError,
    InventoryPermissionError,
    MarketplaceNotFoundError,
    get_inventory,
    list_products,
    list_sellers,
    update_inventory,
)

router = APIRouter(prefix="/v1", tags=["marketplace"])


@router.get("/catalogue/products", response_model=ProductListResponse)
def products(
    db: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
    offset: Annotated[int, Query(ge=0)] = 0,
    category: Annotated[str | None, Query(min_length=1, max_length=40)] = None,
    query: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
) -> ProductListResponse:
    return list_products(db, limit, offset, category, query)


@router.get("/marketplace/sellers", response_model=SellerListResponse)
def sellers(
    db: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    category: Annotated[str | None, Query(min_length=1, max_length=40)] = None,
    coverage: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    min_credit_days: Annotated[int | None, Query(ge=0, le=90)] = None,
    query: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    max_delivery_days: Annotated[int | None, Query(ge=1, le=30)] = None,
) -> SellerListResponse:
    return list_sellers(
        db, limit, offset, category, coverage, min_credit_days, query, max_delivery_days
    )


@router.get(
    "/principals/{principal_id}/agents/{agent_id}/inventory",
    response_model=InventoryResponse,
)
def inventory(
    principal_id: UUID,
    agent_id: UUID,
    db: Annotated[Session, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> InventoryResponse:
    try:
        return get_inventory(db, principal_id, agent_id, limit, offset)
    except MarketplaceNotFoundError as exc:
        raise HTTPException(status_code=404) from exc


@router.post(
    "/principals/{principal_id}/agents/{agent_id}/inventory",
    response_model=InventoryLineResponse,
)
def set_inventory(
    principal_id: UUID,
    agent_id: UUID,
    payload: InventoryUpdateRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> InventoryLineResponse:
    try:
        return update_inventory(db, context, principal_id, agent_id, payload)
    except MarketplaceNotFoundError as exc:
        raise HTTPException(status_code=404) from exc
    except InventoryPermissionError as exc:
        raise HTTPException(status_code=403) from exc
    except InventoryConflictError as exc:
        raise HTTPException(status_code=409) from exc
