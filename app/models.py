from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Enum
)

from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
    String(20),
    nullable=False,
    default="USER"
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship(
        "Booking",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    organized_events = relationship(
        "Event",
        back_populates="organizer"
    )


class Event(Base):
    __tablename__ = "events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(200),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True
    )

    category = Column(
        String(50),
        nullable=False,
        index=True
    )

    location = Column(
        String(200),
        nullable=False
    )

    event_date = Column(
        DateTime,
        nullable=False
    )

    event_end_date = Column(DateTime, nullable=False)

    ticket_price = Column(
        Float,
        nullable=False
    )

    total_tickets = Column(
        Integer,
        nullable=False
    )

    available_tickets = Column(
        Integer,
        nullable=False
    )

    banner_image = Column(
        String(500),
        nullable=True
    )

    organizer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    event_status = Column(
        String(20),
        nullable=False,
        default="UPCOMING"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    bookings = relationship(
        "Booking",
        back_populates="event"
    )

    organizer = relationship(
        "User",
        back_populates="organized_events"
    )

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    event_id = Column(
        Integer,
        ForeignKey("events.id"),
        nullable=False
    )

    ticket_quantity = Column(Integer, nullable=False)

    total_price = Column(Float, nullable=False)

    booking_status = Column(
        String(20),
        default="PENDING",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="bookings"
    )

    event = relationship(
        "Event",
        back_populates="bookings"
    )

    ticket = relationship(
        "Ticket",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan"
    )

    payment = relationship(
    "Payment",
    back_populates="booking",
    uselist=False,
    cascade="all, delete-orphan"
    )



class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True,
        index=True
    )

    payment_method = Column(String(30), nullable=False)

    payment_status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    transaction_id = Column(
        String(100),
        nullable=True,
        unique=True
    )

    amount = Column(Float, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    booking = relationship(
        "Booking",
        back_populates="payment"
    )

    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    discount_amount = Column(Float, nullable=False, default=0.0)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        unique=True,
        nullable=False
    )

    ticket_code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    qr_code_url = Column(
        String(500),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    booking = relationship(
        "Booking",
        back_populates="ticket"
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String(200),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    type = Column(
        String(20),
        nullable=False
    )

    is_read = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="notifications"
    )

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)

    # Example: 10 means 10% discount.
    discount_type = Column(String(20), nullable=False, default="PERCENTAGE")
    discount_value = Column(Float, nullable=False)

    # Optional minimum booking amount.
    minimum_amount = Column(Float, nullable=False, default=0.0)

    # Optional maximum discount for percentage coupons.
    maximum_discount = Column(Float, nullable=True)

    # Coupon validity and usage limits.
    valid_from = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('PERCENTAGE', 'FIXED')",
            name="check_coupon_discount_type",
        ),
        CheckConstraint(
            "discount_value > 0",
            name="check_coupon_discount_value_positive",
        ),
        CheckConstraint(
            "minimum_amount >= 0",
            name="check_coupon_minimum_amount_nonnegative",
        ),
        CheckConstraint(
            "used_count >= 0",
            name="check_coupon_used_count_nonnegative",
        ),
    )
