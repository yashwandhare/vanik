from typing import Literal

PaymentType = Literal[
    "advance_upi",
    "partial_advance",
    "credit_net_7",
    "credit_net_15",
    "credit_net_30",
]
PaymentTypeList = tuple[PaymentType, ...]

CREDIT_PAYMENT_DAYS: dict[PaymentType, int] = {
    "credit_net_7": 7,
    "credit_net_15": 15,
    "credit_net_30": 30,
}

StrategyKind = Literal["margin", "clearance", "payment_risk", "adversarial"]
FailureKind = Literal["timeout", "error", "malformed_offer", "declined"]
RiskTier = Literal["low", "medium", "high"]
RankingFactorName = Literal["price", "reliability", "delivery", "credit", "availability"]
RatingStatus = Literal["rated", "unrated"]
ReviewClassification = Literal["review_evidence_only"]
