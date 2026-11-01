from datetime import UTC, datetime
from decimal import Decimal

from app.domain.demo import (
    REQUIRED_CATEGORIES,
    build_demo_scenario,
    run_demo_validation,
    validate_demo_catalogue,
    validate_demo_scenario,
)
from app.fixtures.diwali import DIWALI_PRODUCTS

NOW = datetime(2026, 10, 20, 10, 0, tzinfo=UTC)


def test_demo_catalogue_is_valid() -> None:
    result = validate_demo_catalogue(DIWALI_PRODUCTS)
    assert result.valid, result.issues
    assert result.sku_count == 40
    assert REQUIRED_CATEGORIES <= set(result.categories)


def test_demo_catalogue_requires_exactly_40_skus() -> None:
    result = validate_demo_catalogue(DIWALI_PRODUCTS[:-1])
    assert result.valid is False
    assert any(issue.code == "catalogue.sku_count" for issue in result.issues)


def test_demo_catalogue_rejects_duplicate_sku() -> None:
    result = validate_demo_catalogue(DIWALI_PRODUCTS[:-1] + (DIWALI_PRODUCTS[0],))
    assert result.valid is False
    assert any(issue.code == "catalogue.duplicate_sku" for issue in result.issues)


def test_demo_catalogue_rejects_missing_category() -> None:
    without_spices = tuple(
        (sku, name, "staples" if category == "spices" else category, unit, price)
        for sku, name, category, unit, price in DIWALI_PRODUCTS
    )
    result = validate_demo_catalogue(without_spices)
    assert result.valid is False
    assert any(issue.code == "catalogue.missing_category" for issue in result.issues)


def test_demo_catalogue_rejects_nonpositive_price() -> None:
    sku, name, category, unit, _price = DIWALI_PRODUCTS[-1]
    result = validate_demo_catalogue(
        DIWALI_PRODUCTS[:-1] + ((sku, name, category, unit, Decimal("0.00")),)
    )
    assert result.valid is False
    assert any(issue.code == "catalogue.invalid_price" for issue in result.issues)


def test_demo_catalogue_rejects_invalid_unit() -> None:
    sku, name, category, _unit, price = DIWALI_PRODUCTS[-1]
    result = validate_demo_catalogue(
        DIWALI_PRODUCTS[:-1] + ((sku, name, category, "crate", price),)
    )
    assert result.valid is False
    assert any(issue.code == "catalogue.invalid_unit" for issue in result.issues)


def test_demo_scenario_is_feasible_and_deterministic() -> None:
    first = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    second = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    assert first == second
    result = validate_demo_scenario(first, NOW)
    assert result.valid, result.issues
    assert result.sku_count == 40
    assert result.seller_count == 4
    assert result.legitimate_seller_count == 3
    assert result.adversarial_seller_count == 1
    assert result.ranked_seller_count == 3
    assert result.rejected_seller_count == 1
    assert result.security_signal_count > 0
    assert result.review_signal_count > 0
    assert result.basket_total is not None
    assert result.budget_inr is not None
    assert result.basket_total <= result.budget_inr


def test_run_demo_validation_combines_catalogue_and_scenario() -> None:
    catalogue, scenario, demo = run_demo_validation(DIWALI_PRODUCTS, NOW)
    assert catalogue.valid, catalogue.issues
    assert scenario.basket
    assert demo.valid, demo.issues


def test_demo_scenario_rejects_infeasible_budget() -> None:
    scenario = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    broken = scenario.model_copy(update={"budget_inr": Decimal("1.00")})
    result = validate_demo_scenario(broken, NOW)
    assert result.valid is False
    assert any(issue.code == "basket.budget_infeasible" for issue in result.issues)


def test_demo_scenario_rejects_missing_stock() -> None:
    scenario = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    seller = scenario.sellers[0]
    stock = seller.stock
    broken_stock = (stock[0].model_copy(update={"available_qty": Decimal("0.000")}), *stock[1:])
    broken_seller = seller.model_copy(update={"stock": broken_stock})
    broken = scenario.model_copy(update={"sellers": (broken_seller, *scenario.sellers[1:])})
    result = validate_demo_scenario(broken, NOW)
    assert result.valid is False
    assert any(issue.code == "seller.stock_infeasible" for issue in result.issues)


def test_demo_scenario_rejects_wrong_seller_mix() -> None:
    scenario = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    broken = scenario.model_copy(update={"sellers": scenario.sellers[:3]})
    result = validate_demo_scenario(broken, NOW)
    assert result.valid is False
    assert any(issue.code == "seller.count" for issue in result.issues)
    assert any(issue.code == "seller.adversarial_count" for issue in result.issues)


def test_demo_scenario_rejects_zero_quantity() -> None:
    scenario = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    broken_basket = (
        scenario.basket[0].model_copy(update={"quantity": Decimal("0.000")}),
        *scenario.basket[1:],
    )
    broken = scenario.model_copy(update={"basket": broken_basket})
    result = validate_demo_scenario(broken, NOW)
    assert result.valid is False
    assert any(issue.code == "basket.invalid_quantity" for issue in result.issues)


def test_demo_scenario_rejects_floor_above_benchmark() -> None:
    scenario = build_demo_scenario(DIWALI_PRODUCTS, NOW)
    seller = scenario.sellers[0]
    first_sku = scenario.basket[0].sku
    reference = next(item for item in scenario.reference_prices if item.sku == first_sku)
    floors = tuple(
        floor.model_copy(update={"min_unit_price": reference.benchmark_price + Decimal("100.00")})
        if floor.sku == first_sku
        else floor
        for floor in seller.policy.floor_prices
    )
    broken_policy = seller.policy.model_copy(update={"floor_prices": floors})
    broken_seller = seller.model_copy(update={"policy": broken_policy})
    broken = scenario.model_copy(update={"sellers": (broken_seller, *scenario.sellers[1:])})
    result = validate_demo_scenario(broken, NOW)
    assert result.valid is False
    assert any(issue.code == "seller.floor_above_benchmark" for issue in result.issues)
