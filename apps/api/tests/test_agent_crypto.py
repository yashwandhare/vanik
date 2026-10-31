from uuid import uuid4

import pytest  # type: ignore[import-not-found, unused-ignore]

from app.core.agent_crypto import (
    KeyDecryptionError,
    KeyEncryptionUnavailableError,
    decrypt_signing_key,
    generate_signing_key,
    verify_signature,
)

SECRET = "synthetic-agent-key-encryption-test-only-secret"


def test_encrypted_ed25519_key_signs_and_detects_tampering() -> None:
    agent_id = uuid4()
    key = generate_signing_key(agent_id, 1, SECRET)
    assert len(key.private_nonce) == 12
    assert len(key.private_ciphertext) == 48
    private = decrypt_signing_key(agent_id, 1, key.private_ciphertext, key.private_nonce, SECRET)
    assert private.private_bytes_raw() not in key.private_ciphertext
    signature = private.sign(b"structured-message")
    assert verify_signature(key.public_key, signature, b"structured-message")
    assert not verify_signature(key.public_key, signature, b"changed-message")
    assert not verify_signature("invalid-base64", signature, b"structured-message")


def test_encryption_binds_agent_version_and_secret() -> None:
    agent_id = uuid4()
    key = generate_signing_key(agent_id, 1, SECRET)
    for wrong_agent, version, secret in (
        (uuid4(), 1, SECRET),
        (agent_id, 2, SECRET),
        (agent_id, 1, "a-different-synthetic-encryption-secret"),
    ):
        with pytest.raises(KeyDecryptionError):
            decrypt_signing_key(
                wrong_agent, version, key.private_ciphertext, key.private_nonce, secret
            )
    with pytest.raises(KeyEncryptionUnavailableError):
        generate_signing_key(agent_id, 1, "replace-me")


def test_distinct_agents_receive_distinct_signing_keys() -> None:
    first = generate_signing_key(uuid4(), 1, SECRET)
    second = generate_signing_key(uuid4(), 1, SECRET)
    assert first.public_key != second.public_key
    assert first.fingerprint != second.fingerprint
    assert first.private_nonce != second.private_nonce
