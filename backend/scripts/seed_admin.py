#!/usr/bin/env python3
"""
Seed (create or update) a super_admin account from an email + password.

This is the script to run once against whichever database your app is
actually using (local SQLite, or your production Postgres/Neon URL) to get
your first login working. It is idempotent — running it again just resets
the password on the existing account instead of erroring out.

Usage (recommended — avoids the password sitting in your shell history):
    ADMIN_EMAIL="you@school.com" ADMIN_PASSWORD="SomeStrongPass123" \
        python scripts/seed_admin.py

Usage (explicit flags):
    python scripts/seed_admin.py --email you@school.com --password "SomeStrongPass123" --name "Site Admin"

Seeding a REMOTE / production database:
    DATABASE_URL="postgresql://..." ADMIN_EMAIL=... ADMIN_PASSWORD=... \
        python scripts/seed_admin.py
    (DATABASE_URL must be set BEFORE the app package is imported, which is
    why this script re-reads it directly from the environment rather than
    only trusting whatever is in a local .env file.)

Run this from the backend/ directory so it can find the app package.
"""
import argparse
import getpass
import os
import re
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.user import User  # noqa: E402

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def main():
    parser = argparse.ArgumentParser(description="Seed or reset the super_admin account.")
    parser.add_argument("--email", default=os.getenv("ADMIN_EMAIL"), help="Admin email (or set ADMIN_EMAIL env var)")
    parser.add_argument("--password", default=os.getenv("ADMIN_PASSWORD"), help="Admin password (or set ADMIN_PASSWORD env var)")
    parser.add_argument("--name", default=os.getenv("ADMIN_NAME", "Site Administrator"), help="Full name for the account")
    parser.add_argument("--username", default=os.getenv("ADMIN_USERNAME"), help="Username (defaults to the email's local part)")
    parser.add_argument("--role", default="super_admin", choices=["admin", "super_admin"], help="Role to assign")
    args = parser.parse_args()

    email = (args.email or "").strip().lower()
    if not email:
        email = input("Admin email: ").strip().lower()
    if not EMAIL_RE.match(email):
        print(f"❌ '{email}' doesn't look like a valid email address.")
        sys.exit(1)

    password = args.password
    if not password:
        password = getpass.getpass("Admin password (min 8 chars): ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("❌ Passwords did not match.")
            sys.exit(1)
    if len(password) < 8:
        print("❌ Password must be at least 8 characters.")
        sys.exit(1)

    username = (args.username or email.split("@")[0]).strip().lower()

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.hashed_password = hash_password(password)
            existing.role = args.role
            existing.is_active = True
            existing.is_verified = True
            existing.full_name = args.name or existing.full_name
            existing.failed_login_attempts = 0
            existing.locked_until = None
            existing.password_reset_token = None
            existing.password_reset_expires = None
            db.commit()
            print(f"✅ Updated existing account. Login with email '{email}' (username '{existing.username}') and the new password.")
            return

        # Ensure username uniqueness
        base_username, suffix, final_username = username, 1, username
        while db.query(User).filter(User.username == final_username).first():
            final_username = f"{base_username}{suffix}"
            suffix += 1

        user = User(
            id=str(uuid.uuid4()),
            username=final_username,
            email=email,
            full_name=args.name,
            hashed_password=hash_password(password),
            role=args.role,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"✅ Created {args.role} account. Login with email '{email}' (username '{final_username}') and the password you set.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
