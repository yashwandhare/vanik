from app.contracts.identity import BusinessRole

ROLE_CAPABILITIES: dict[BusinessRole, frozenset[str]] = {
    BusinessRole.BUYER: frozenset({"request_quote", "evaluate_offers"}),
    BusinessRole.SELLER: frozenset({"receive_rfq", "generate_offer"}),
}
ROLE_TOOLS: dict[BusinessRole, frozenset[str]] = {
    BusinessRole.BUYER: frozenset({"marketplace_search", "benchmark_compare"}),
    BusinessRole.SELLER: frozenset({"marketplace_search", "benchmark_compare"}),
}
ROLE_STRATEGIES: dict[BusinessRole, frozenset[str]] = {
    BusinessRole.BUYER: frozenset({"default"}),
    BusinessRole.SELLER: frozenset(
        {"default", "margin", "clearance", "payment_risk", "adversarial"}
    ),
}


def default_agent_authority() -> dict[str, dict[str, list[str]]]:
    return {
        role.value: {
            "capabilities": sorted(ROLE_CAPABILITIES[role]),
            "allowed_tools": sorted(ROLE_TOOLS[role]),
        }
        for role in BusinessRole
    }


def policy_allows(
    role: BusinessRole,
    principal_roles: list[str],
    authority: dict[str, dict[str, list[str]]],
    capabilities: list[str],
    allowed_tools: list[str],
    strategy_profile: str,
) -> bool:
    ceiling = authority.get(role.value, {})
    return (
        role.value in principal_roles
        and set(capabilities) <= ROLE_CAPABILITIES[role]
        and set(capabilities) <= set(ceiling.get("capabilities", []))
        and set(allowed_tools) <= ROLE_TOOLS[role]
        and set(allowed_tools) <= set(ceiling.get("allowed_tools", []))
        and strategy_profile in ROLE_STRATEGIES[role]
    )
