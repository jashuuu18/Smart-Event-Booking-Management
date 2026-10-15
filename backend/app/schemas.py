
from datetime import datetime
from typing import Optional, Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    ConfigDict,
    model_validator,
    field_validator,
)

from app.models import Booking


# =========================================================
# USER SCHEMAS
# =========================================================

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# LOGIN / AUTHENTICATION
# =========================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# =========================================================
# EVENT SCHEMAS
# =========================================================

class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    category: str = Field(min_length=3, max_length=50)
    location: str = Field(min_length=2, max_length=200)
    event_date: datetime
    event_end_date: datetime
    ticket_price: float = Field(gt=0)
    total_tickets: int = Field(gt=0)
    banner_image: Optional[str] = None

    @model_validator(mode="after")
    def validate_event_dates(self):
        if self.event_end_date <= self.event_date:
            raise ValueError(
                "Event end date must be after event start date"
            )
        return self


class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    location: str
    event_date: datetime
    event_end_date: datetime
    ticket_price: float
    total_tickets: int
    available_tickets: int
    banner_image: Optional[str] = None
    organizer_id: int
    event_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None, min_length=3, max_length=200
    )
    description: Optional[str] = None
    category: Optional[str] = Field(
        default=None, min_length=3, max_length=50
    )
    location: Optional[str] = Field(
        default=None, min_length=2, max_length=200
    )
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    ticket_price: Optional[float] = Field(default=None, gt=0)
    total_tickets: Optional[int] = Field(default=None, gt=0)
    banner_image: Optional[str] = None

    @model_validator(mode="after")
    def validate_event_dates(self):
        if (
            self.event_date is not None
            and self.event_end_date is not None
            and self.event_end_date <= self.event_date
        ):
            raise ValueError(
                "Event end date must be after event start date"
            )
        return self


# =========================================================
# BOOKING SCHEMAS
# =========================================================

class BookingCreate(BaseModel):
    event_id: int = Field(gt=0)
    ticket_quantity: int = Field(gt=0, le=10)


class BookingResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    ticket_quantity: int
    total_price: float
    booking_status: str
    created_at: datetime

    # Event details for booking history
    event_title: str
    event_description: Optional[str] = None
    event_category: Optional[str] = None
    event_location: Optional[str] = None
    event_date: Optional[datetime] = None
    event_banner: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizerBookingResponse(BaseModel):
    booking_id: int
    user_id: int
    username: str
    email: EmailStr
    event_id: int
    event_title: str
    ticket_quantity: int
    total_price: float
    booking_status: str
    created_at: datetime


class BookingCancellationResponse(BookingResponse):
    refund_status: str = "NOT_APPLICABLE"



def format_booking_response(booking: Booking) -> dict:
    event = booking.event

    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "event_id": booking.event_id,
        "ticket_quantity": booking.ticket_quantity,
        "total_price": booking.total_price,
        "booking_status": booking.booking_status,
        "created_at": booking.created_at,
        "event_title": event.title if event else "Unknown event",
        "event_description": event.description if event else None,
        "event_category": event.category if event else None,
        "event_location": event.location if event else None,
        "event_date": event.event_date if event else None,
        "event_banner": event.banner_image if event else None,
    }


# =========================================================
# TICKET SCHEMAS
# =========================================================

class TicketResponse(BaseModel):
    id: int
    booking_id: int
    ticket_code: str
    qr_code_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# NOTIFICATION SCHEMAS
# =========================================================

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# ORGANIZER DASHBOARD SCHEMAS
# =========================================================

class OrganizerEventInsight(BaseModel):
    event_id: int
    event_title: str
    event_status: str
    total_tickets: int
    tickets_sold: int
    remaining_tickets: int
    booking_count: int
    revenue: float


class OrganizerDashboardResponse(BaseModel):
    total_events: int
    total_tickets_sold: int
    total_remaining_tickets: int
    total_bookings: int
    total_revenue: float
    events: list[OrganizerEventInsight]


class OrganizerEventPerformance(BaseModel):
    event_id: int
    event_title: str
    event_status: str
    event_date: datetime
    ticket_price: float
    total_tickets: int
    tickets_sold: int
    remaining_tickets: int
    booking_count: int
    revenue: float
    ticket_sales_percentage: float
    average_revenue_per_booking: float


# =========================================================
# PAYMENT SCHEMAS
# =========================================================

class PaymentCreate(BaseModel):
    booking_id: int = Field(gt=0)
    payment_method: str = Field(min_length=1, max_length=50)
    coupon_code: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    payment_method: str
    payment_status: str
    refund_status: str = "NOT_APPLICABLE"
    transaction_id: Optional[str] = None
    amount: float
    created_at: datetime
    coupon_id: Optional[int] = None
    discount_amount: float = 0.0

    model_config = ConfigDict(from_attributes=True)


# class PaymentSimulationRequest(BaseModel):
#     booking_id: int = Field(gt=0)
#     payment_method: Literal["SIMULATED"] = "SIMULATED"
#     simulated_result: Literal["SUCCESS", "FAILED"]
class PaymentSimulationRequest(BaseModel):
    success: bool


# =========================================================
# COUPON SCHEMAS
# =========================================================

class CouponBase(BaseModel):
    code: str = Field(min_length=3, max_length=50)
    description: Optional[str] = Field(default=None, max_length=255)
    discount_type: Literal["PERCENTAGE", "FIXED"] = "PERCENTAGE"
    discount_value: float = Field(gt=0)
    minimum_amount: float = Field(default=0.0, ge=0)
    maximum_discount: Optional[float] = Field(default=None, gt=0)
    valid_from: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = Field(default=None, gt=0)
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("discount_value")
    @classmethod
    def validate_discount_value(cls, value: float, info):
        if (
            info.data.get("discount_type") == "PERCENTAGE"
            and value > 100
        ):
            raise ValueError(
                "Percentage discount cannot exceed 100"
            )
        return value


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=255)
    discount_type: Optional[Literal["PERCENTAGE", "FIXED"]] = None
    discount_value: Optional[float] = Field(default=None, gt=0)
    minimum_amount: Optional[float] = Field(default=None, ge=0)
    maximum_discount: Optional[float] = Field(default=None, gt=0)
    valid_from: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    usage_limit: Optional[int] = Field(default=None, gt=0)
    is_active: Optional[bool] = None


class CouponResponse(CouponBase):
    id: int
    used_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouponApplyRequest(BaseModel):
    code: str = Field(min_length=3, max_length=50)
    booking_id: int = Field(gt=0)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class CouponApplyResponse(BaseModel):
    coupon_code: str
    discount_type: str
    discount_value: float
    original_amount: float
    discount_amount: float
    final_amount: float
    message: str


class ProfileUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
    )
    email: EmailStr | None = None


from pydantic import BaseModel, Field


class ChatbotRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The user's message to the SmartEvent chatbot",
    )


class ChatbotResponse(BaseModel):
    reply: str
    suggestions: list[str] = []
