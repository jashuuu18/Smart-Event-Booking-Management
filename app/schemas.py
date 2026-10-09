from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    ConfigDict,
    model_validator
)


# =========================================================
# USER SCHEMAS
# =========================================================

class UserCreate(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50
    )

    email: EmailStr

    password: str = Field(
        min_length=6,
        max_length=100
    )


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# LOGIN / AUTHENTICATION
# =========================================================

class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=100
    )


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
    description: Optional[str]
    category: str
    location: str
    event_date: datetime
    event_end_date: datetime
    ticket_price: float
    total_tickets: int
    available_tickets: int
    banner_image: Optional[str]
    organizer_id: int
    event_status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# BOOKING SCHEMAS
# =========================================================

class BookingCreate(BaseModel):
    event_id: int

    ticket_quantity: int = Field(
        gt=0,
        le=10
    )


class BookingResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    ticket_quantity: int
    total_price: float
    booking_status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# TICKET SCHEMAS
# =========================================================

class TicketResponse(BaseModel):
    id: int
    booking_id: int
    ticket_code: str
    qr_code_url: Optional[str]
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


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

    model_config = ConfigDict(
        from_attributes=True
    )

# =========================================================
# EventUpdate Schema
# =========================================================

class EventUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=200
    )

    description: Optional[str] = None

    category: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=50
    )

    location: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    event_date: Optional[datetime] = None

    event_end_date: Optional[datetime] = None

    ticket_price: Optional[float] = Field(
        default=None,
        gt=0
    )

    total_tickets: Optional[int] = Field(
        default=None,
        gt=0
    )

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