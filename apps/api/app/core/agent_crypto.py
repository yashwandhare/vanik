import base64
import hashlib
import secrets
from dataclasses import dataclass, field
from uuid import UUID

from cryptography.exceptions import InvalidSignature, InvalidTag
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class KeyEncryptionUnavailableError(Exception):
    pass


class KeyDecryptionError(Exception):
    pass


@dataclass(frozen=True)
class EncryptedSigningKey:
    public_key: str
    fingerprint: str
    private_ciphertext: bytes = field(repr=False)
    private_nonce: bytes = field(repr=False)


def _cipher(secret: str) -> AESGCM:
    if len(secret) < 32:
        raise KeyEncryptionUnavailableError(
            "Configure a high-entropy signing-key encryption secret"
        )
    key = hashlib.sha256(b"vanik.agent-key-encryption.v1:" + secret.encode()).digest()
    return AESGCM(key)


def _associated_data(agent_id: UUID, key_version: int) -> bytes:
    if not 1 <= key_version <= 2**32 - 1:
        raise ValueError("Invalid key version")
    return b"vanik.agent-key.v1:" + agent_id.bytes + key_version.to_bytes(4, "big")


def generate_signing_key(agent_id: UUID, key_version: int, secret: str) -> EncryptedSigningKey:
    cipher = _cipher(secret)
    private_key = Ed25519PrivateKey.generate()
    public = private_key.public_key().public_bytes_raw()
    nonce = secrets.token_bytes(12)
    ciphertext = cipher.encrypt(
        nonce, private_key.private_bytes_raw(), _associated_data(agent_id, key_version)
    )
    return EncryptedSigningKey(
        public_key=base64.b64encode(public).decode("ascii"),
        fingerprint="sha256:" + hashlib.sha256(public).hexdigest(),
        private_ciphertext=ciphertext,
        private_nonce=nonce,
    )


def decrypt_signing_key(
    agent_id: UUID,
    key_version: int,
    ciphertext: bytes,
    nonce: bytes,
    secret: str,
) -> Ed25519PrivateKey:
    try:
        raw = _cipher(secret).decrypt(nonce, ciphertext, _associated_data(agent_id, key_version))
        return Ed25519PrivateKey.from_private_bytes(raw)
    except (InvalidTag, ValueError) as exc:
        raise KeyDecryptionError("Signing key cannot be decrypted") from exc


def verify_signature(public_key: str, signature: bytes, payload: bytes) -> bool:
    try:
        raw = base64.b64decode(public_key, validate=True)
        Ed25519PublicKey.from_public_bytes(raw).verify(signature, payload)
    except (InvalidSignature, ValueError):
        return False
    return True
