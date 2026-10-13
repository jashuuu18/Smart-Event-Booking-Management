from app.database import SessionLocal
from app.models import User


def make_role(email: str, role: str):
    allowed_roles = {
        "USER",
        "ORGANIZER",
        "ADMIN"
    }

    if role not in allowed_roles:
        print(
            f"Invalid role. Choose from: "
            f"{', '.join(allowed_roles)}"
        )
        return

    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if not user:
            print(f"User not found: {email}")
            return

        user.role = role

        db.commit()
        db.refresh(user)

        print("Role updated successfully!")
        print(f"Email: {user.email}")
        print(f"Username: {user.username}")
        print(f"Role: {user.role}")

    finally:
        db.close()


if __name__ == "__main__":
    email = input("Enter user email: ").strip()

    role = input(
        "Enter role (USER / ORGANIZER / ADMIN): "
    ).strip().upper()

    make_role(email, role)