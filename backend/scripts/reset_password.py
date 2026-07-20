#!/usr/bin/env python3
"""
Reset a user's password (and optionally their email) directly, without
needing SMTP/email configured.

Usage:
    python scripts/reset_password.py --list-admins
    python scripts/reset_password.py --email admin@caliphateschools.edu.ng
    python scripts/reset_password.py --username sadeeeq --password "NewStrongPass123"
    python scripts/reset_password.py --email old@mail.com --new-email new@mail.com --password "NewStrongPass123"

If --password is omitted, you'll be prompted to enter one (hidden input).
Run this from the backend/ directory so it can find the app package.
"""
import argparse
import getpass
import sys
from pathlib import Path

# Allow running this script directly (adds backend/ to the path)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.user import User  # noqa: E402


def list_admins(db):
    admins = db.query(User).filter(User.role.in_(["admin", "super_admin"])).all()
    if not admins:
        print("No admin accounts found.")
        return
    print(f"Found {len(admins)} admin account(s):\n")
    for a in admins:
        status = "active" if a.is_active else "inactive"
        print(f"  {a.full_name}  |  email: {a.email}  |  username: {a.username}  |  role: {a.role}  |  {status}")


def main():
    parser = argparse.ArgumentParser(description="Reset a user's password and/or email directly in the database.")
    parser.add_argument("--email", help="Current email of the account to update")
    parser.add_argument("--username", help="Current username of the account to update (alternative to --email)")
    parser.add_argument("--new-email", help="New email to set for this account (optional)")
    parser.add_argument("--password", help="New password (if omitted, you'll be prompted)")
    parser.add_argument("--unlock", action="store_true", help="Also clear any account lock / failed-login counter")
    parser.add_argument("--list-admins", action="store_true", help="List all admin accounts and exit")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.list_admins:
            list_admins(db)
            return

        if not args.email and not args.username:
            parser.error("Provide --email or --username to identify the account (or use --list-admins to see options).")

        query = db.query(User)
        user = query.filter(User.email == args.email).first() if args.email else query.filter(User.username == args.username).first()

        if not user:
            print(f"❌ No user found matching {'email=' + args.email if args.email else 'username=' + args.username}")
            print("   Tip: run with --list-admins to see existing admin accounts.")
            sys.exit(1)

        print(f"Found user: {user.full_name} <{user.email}> (username: {user.username}, role: {user.role})")

        if args.new_email and args.new_email != user.email:
            clash = db.query(User).filter(User.email == args.new_email, User.id != user.id).first()
            if clash:
                print(f"❌ Email {args.new_email} is already used by another account ({clash.full_name}). Aborting.")
                sys.exit(1)
            user.email = args.new_email
            print(f"   Email will be updated to: {args.new_email}")

        new_password = args.password
        if not new_password:
            new_password = getpass.getpass("Enter new password (min 8 chars, leave blank to keep current): ")
            if new_password:
                confirm = getpass.getpass("Confirm new password: ")
                if new_password != confirm:
                    print("❌ Passwords did not match. Aborting.")
                    sys.exit(1)

        if new_password:
            if len(new_password) < 8:
                print("❌ Password must be at least 8 characters.")
                sys.exit(1)
            user.hashed_password = hash_password(new_password)
            user.password_reset_token = None
            user.password_reset_expires = None

        if args.unlock:
            user.failed_login_attempts = 0
            user.locked_until = None

        db.commit()
        print(f"✅ Done. You can now log in with username '{user.username}' or email '{user.email}'"
              + (" and the new password." if new_password else "."))
    finally:
        db.close()


if __name__ == "__main__":
    main()
