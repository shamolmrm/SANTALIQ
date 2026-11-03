"""Operator commands. Run inside the API container, e.g.:

docker exec santaliq-api python -m app.cli set-role you@example.com admin
docker exec santaliq-api python -m app.cli list-users
"""

import sys

from sqlalchemy import select

import app.modules.language.models  # noqa: F401  (register all tables)
from app.core.db import get_sessionmaker
from app.modules.users.models import Role, User


def set_role(email: str, role: str) -> int:
    with get_sessionmaker()() as db:
        user = db.scalar(select(User).where(User.email == email.strip().lower()))
        if user is None:
            print(f"No user with email {email}. They must register on the website first.")
            return 1
        user.role = Role(role)
        db.commit()
        print(f"{user.email} is now {user.role.value}.")
        return 0


def list_users() -> int:
    with get_sessionmaker()() as db:
        for u in db.scalars(select(User).order_by(User.created_at)):
            print(f"{u.email:40} {u.role.value:9} {'active' if u.is_active else 'disabled'}")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) == 3 and argv[0] == "set-role" and argv[2] in Role.__members__:
        return set_role(argv[1], argv[2])
    if argv == ["list-users"]:
        return list_users()
    print(__doc__)
    print("Roles:", ", ".join(Role.__members__))
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
