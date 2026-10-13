
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Ticket, Booking
from app.schemas import TicketResponse


router = APIRouter(
    prefix="/api/v1/tickets",
    tags=["Tickets"],
)


# --------------------------------------------------
# GET: Retrieve all tickets belonging to current user
# --------------------------------------------------
@router.get(
    "/",
    response_model=list[TicketResponse],
)
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = (
        db.query(Ticket)
        .join(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Ticket.id.desc())
        .all()
    )

    return tickets


# --------------------------------------------------
# GET: Retrieve one ticket belonging to current user
# --------------------------------------------------
@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = (
        db.query(Ticket)
        .join(Booking)
        .filter(
            Ticket.id == ticket_id,
            Booking.user_id == current_user.id,
        )
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    return ticket


# --------------------------------------------------
# GET: Verify a ticket using its QR ticket code
# Only ORGANIZER and ADMIN can verify tickets
# --------------------------------------------------
@router.get("/verify/{ticket_code}")
def verify_ticket(
    ticket_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check the user's role
    if current_user.role not in ["ORGANIZER", "ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only organizers and administrators "
                "can verify tickets"
            ),
        )

    # Find the ticket and its associated booking
    ticket = (
        db.query(Ticket)
        .join(Booking)
        .filter(Ticket.ticket_code == ticket_code)
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Invalid ticket code",
        )

    booking = ticket.booking

    # Only confirmed bookings are valid
    if booking.booking_status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Ticket is not valid for entry",
        )

    return {
        "valid": True,
        "message": "Ticket verified successfully",
        "ticket_code": ticket.ticket_code,
        "booking_id": booking.id,
        "event_id": booking.event_id,
        "ticket_quantity": booking.ticket_quantity,
    }
