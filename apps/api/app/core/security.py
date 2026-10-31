import hashlib
import hmac
import secrets
from importlib import import_module
from typing import Any, cast


class Argon2PasswordHasher:
    """Typed adapter around the runtime-pinned argon2-cffi package."""

    def __init__(self) -> None:
        argon2: Any = import_module("argon2")
        exceptions: Any = import_module("argon2.exceptions")
        self._hasher: Any = argon2.PasswordHasher(time_cost=2, memory_cost=19_456, parallelism=1)
        self._verification_errors = (
            cast(type[Exception], exceptions.VerificationError),
            cast(type[Exception], exceptions.InvalidHashError),
        )

    def hash(self, password: str) -> str:
        return cast(str, self._hasher.hash(password))

    def verify(self, password_hash: str, password: str) -> bool:
        try:
            return cast(bool, self._hasher.verify(password_hash, password))
        except self._verification_errors:
            return False

    def needs_rehash(self, password_hash: str) -> bool:
        return cast(bool, self._hasher.check_needs_rehash(password_hash))


PASSWORD_HASHER = Argon2PasswordHasher()
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash("not-a-user-password")


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def hash_password(password: str) -> str:
    return PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    return PASSWORD_HASHER.verify(password_hash, password)


def password_needs_rehash(password_hash: str) -> bool:
    return PASSWORD_HASHER.needs_rehash(password_hash)


def generate_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def digest_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def derive_csrf_token(session_token: str) -> str:
    # The random session token is the secret; the label prevents cross-purpose reuse.
    return hmac.new(session_token.encode("utf-8"), b"vanik.csrf.v1", hashlib.sha256).hexdigest()


def digest_identifier(value: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def mask_identifier(value: str) -> str:
    visible = value[-4:]
    return f"{'*' * max(0, len(value) - len(visible))}{visible}"


def token_matches(token: str, expected_digest: str) -> bool:
    return hmac.compare_digest(digest_token(token), expected_digest)
