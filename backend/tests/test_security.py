from uuid import uuid4

from backend.app.core.security.passwords import (
    hash_password,
    verify_password,
)
from backend.app.core.security.tokens import (
    create_access_token,
    decode_access_token,
)


def test_password_hashing():
    password = "Example-Strong-Password-123!"

    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("Wrong-Password", hashed)


def test_password_hashes_are_unique():
    password = "Example-Strong-Password-123!"

    first = hash_password(password)
    second = hash_password(password)

    assert first != second
    assert verify_password(password, first)
    assert verify_password(password, second)


def test_access_token_round_trip():
    user_id = uuid4()

    token = create_access_token(user_id)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"