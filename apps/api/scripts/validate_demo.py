from datetime import UTC, datetime

from app.domain.demo import run_demo_validation
from app.fixtures.diwali import DIWALI_PRODUCTS


def main() -> int:
    catalogue, scenario, demo = run_demo_validation(DIWALI_PRODUCTS, datetime.now(UTC))
    print("VANIK deterministic demo validation")
    print(f"Catalogue: {catalogue.sku_count} SKUs")
    print(f"Categories: {', '.join(catalogue.categories)}")
    print(f"Basket: {demo.sku_count} lines")
    print(f"Basket reference total: INR {demo.basket_total}")
    print(f"Budget: INR {demo.budget_inr}")
    print(
        "Sellers: "
        f"{demo.seller_count} total, "
        f"{demo.legitimate_seller_count} legitimate, "
        f"{demo.adversarial_seller_count} adversarial"
    )
    print(f"Ranking: {demo.ranked_seller_count} ranked, {demo.rejected_seller_count} rejected")
    print(
        "Security: "
        f"{demo.security_signal_count} note evidence item(s), "
        f"{demo.review_signal_count} fake-discount review signal(s)"
    )
    issues = (*catalogue.issues, *demo.issues)
    if issues:
        print("Status: FAIL")
        for issue in issues:
            location = f" [{issue.sku}]" if issue.sku else ""
            principal = f" [{issue.principal_id}]" if issue.principal_id else ""
            print(f"- {issue.code}{location}{principal}: {issue.message}")
        return 1
    if not catalogue.valid or not demo.valid:
        print("Status: FAIL")
        return 1
    print(f"Scenario delivery deadline: {scenario.delivery_deadline.isoformat()}")
    print("Status: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
