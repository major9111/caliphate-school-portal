"""
One-off script to bootstrap the first admin account.

Self-registration as admin/teacher/staff is intentionally blocked via the
API (see README), so the very first admin has to be created directly
against the database. Run this once, then log in and create any further
staff/teacher accounts from the Teachers page in the UI.

Usage:
    cd backend
    export DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require"
    python create_admin.py
"""
import uuid
import getpass
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User

Base.metadata.create_all(bind=engine)

def main():
    db = SessionLocal()
    try:
        print("Create the first super_admin account\n")
        email = input("Email: ").strip()
        username = input("Username: ").strip()
        full_name = input("Full name: ").strip()
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm password: ")

        if password != confirm:
            print("Passwords don't match. Aborting.")
            return

        existing = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        if existing:
            print(f"A user with that email or username already exists (role={existing.role}). Aborting.")
            return

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            role="super_admin",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"\nCreated super_admin '{username}' <{email}>. You can log in now.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
