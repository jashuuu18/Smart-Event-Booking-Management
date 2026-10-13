
from datetime import timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models import User

from app.schemas import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse
)

from fastapi.security import OAuth2PasswordRequestForm

from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
import logging
import traceback

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):

    # Check whether email already exists
    existing_user = (
        db.query(User)
        .filter(
            User.email == user_data.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(
        user_data.password
    )

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role="USER"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        user = (
            db.query(User)
            .filter(User.email == form_data.username)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        password_is_valid = verify_password(
            form_data.password,
            user.hashed_password
        )

        if not password_is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "role": user.role
            },
            expires_delta=timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Unexpected error during login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Check the backend terminal."
        ) from exc