
import os
from datetime import date

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI, OpenAIError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Event, Booking, ChatbotMessage
from app.schemas import ChatbotRequest, ChatbotResponse


load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

SUGGESTIONS = [
    "Trending events",
    "Show my bookings",
    "Help with ticket issues",
    "Suggest music events this weekend",
]


# --------------------------------------------------
# SAVE CHAT MESSAGES
# --------------------------------------------------

def save_message(
    db: Session,
    user_id: int,
    role: str,
    message: str,
) -> None:
    chat_message = ChatbotMessage(
        user_id=user_id,
        role=role,
        message=message,
    )

    try:
        db.add(chat_message)
        db.commit()
    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# GET TRENDING EVENTS
# --------------------------------------------------

def get_trending_events(db: Session) -> str:
    events = (
        db.query(Event)
        .filter(
            Event.available_tickets > 0,
            Event.event_date >= date.today(),
        )
        .order_by(Event.event_date.asc())
        .limit(5)
        .all()
    )

    if not events:
        return "No upcoming events with available tickets were found."

    results = []

    for event in events:
        results.append(
            f"- {event.title} | "
            f"Category: {event.category} | "
            f"Location: {event.location} | "
            f"Date: {event.event_date} | "
            f"Price: ₹{event.ticket_price:.2f} | "
            f"Available tickets: {event.available_tickets}"
        )

    return "Here are upcoming events:\n" + "\n".join(results)


# --------------------------------------------------
# GET MUSIC EVENTS
# --------------------------------------------------

def get_music_events(db: Session) -> str:
    events = (
        db.query(Event)
        .filter(
            Event.available_tickets > 0,
            Event.event_date >= date.today(),
            Event.category.ilike("%music%"),
        )
        .order_by(Event.event_date.asc())
        .limit(10)
        .all()
    )

    if not events:
        return (
            "No upcoming music events with available tickets "
            "were found. Try the Home page filters."
        )

    results = []

    for event in events:
        results.append(
            f"- {event.title} | "
            f"Location: {event.location} | "
            f"Date: {event.event_date} | "
            f"Price: ₹{event.ticket_price:.2f} | "
            f"Available tickets: {event.available_tickets}"
        )

    return "Here are upcoming music events:\n" + "\n".join(results)


# --------------------------------------------------
# GET THE CURRENT USER'S BOOKINGS
# --------------------------------------------------

def get_user_bookings(db: Session, user_id: int) -> str:
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user_id)
        .order_by(Booking.id.desc())
        .limit(10)
        .all()
    )

    if not bookings:
        return "You don't have any bookings yet."

    results = []

    for booking in bookings:
        event = (
            db.query(Event)
            .filter(Event.id == booking.event_id)
            .first()
        )

        event_title = (
            event.title if event else "Event unavailable"
        )

        results.append(
            f"- Booking ID: {booking.id} | "
            f"Event: {event_title} | "
            f"Quantity: {booking.ticket_quantity} | "
            f"Total Price: ₹{booking.total_price:.2f} | "
            f"Status: {booking.booking_status}"
        )

    return (
        f"Here are your recent bookings "
        f"(up to {len(bookings)}):\n"
        + "\n".join(results)
    )


# --------------------------------------------------
# DATABASE-BASED RESPONSES
# --------------------------------------------------

def get_database_reply(
    message: str,
    db: Session,
    current_user: User,
) -> str | None:

    text = message.lower().strip()

    if any(
        phrase in text
        for phrase in [
            "my booking",
            "my bookings",
            "show bookings",
            "show my bookings",
            "booking history",
            "reservation",
        ]
    ):
        return get_user_bookings(db, current_user.id)

    if any(
        phrase in text
        for phrase in [
            "trending",
            "popular events",
            "upcoming events",
        ]
    ):
        return get_trending_events(db)

    if any(
        phrase in text
        for phrase in [
            "music",
            "weekend",
            "concert",
        ]
    ):
        return get_music_events(db)

    if any(
        word in text
        for word in [
            "ticket",
            "qr code",
            "qr",
        ]
    ):
        return (
            "For ticket assistance, open your Tickets page "
            "and check your booking status and QR ticket. "
            "If your ticket is missing, check your booking "
            "details. Never share your password or access token."
        )

    if any(
        phrase in text
        for phrase in [
            "how to book",
            "book an event",
            "make a booking",
            "book tickets",
        ]
    ):
        return (
            "To book tickets, open Home, select an event, "
            "check availability, and follow the booking steps. "
            "You can review your bookings on the My Bookings page."
        )

    if any(
        word in text
        for word in [
            "help",
            "support",
            "navigate",
            "how to",
        ]
    ):
        return (
            "I can help you discover events, review bookings, "
            "and troubleshoot tickets. Use Home to explore events, "
            "My Bookings to review bookings, and Tickets to view "
            "your tickets."
        )

    return None


# --------------------------------------------------
# FALLBACK RESPONSES WHEN AI IS NOT CONFIGURED
# --------------------------------------------------

def get_fallback_reply(
    message: str,
    username: str,
) -> str:

    text = message.lower().strip()

    if any(
        phrase in text
        for phrase in [
            "my booking",
            "my bookings",
            "booking history",
            "reservation",
        ]
    ):
        return (
            f"Hi {username}! I couldn't retrieve your bookings. "
            "Please open My Bookings and try again."
        )

    if any(word in text for word in ["ticket", "qr code", "qr"]):
        return (
            "Open your Tickets page and check your booking status "
            "and QR ticket. Never share your password or access token."
        )

    if any(
        phrase in text
        for phrase in [
            "book an event",
            "book tickets",
            "how to book",
        ]
    ):
        return (
            "Open Home, choose an event with available tickets, "
            "and follow the booking steps."
        )

    if any(
        word in text
        for word in [
            "event",
            "music",
            "trending",
            "weekend",
        ]
    ):
        return (
            "I couldn't find matching events. Try the Home page "
            "search and filters to explore available events."
        )

    return (
        f"Hi {username}! I'm your SmartEvent assistant. "
        "Ask me about events, bookings, or ticket issues."
    )


# --------------------------------------------------
# CHAT ENDPOINT
# --------------------------------------------------

@router.post("/chat", response_model=ChatbotResponse)
def chat_with_assistant(
    request: ChatbotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty.",
        )

    # Save the user's message.
    save_message(
        db,
        current_user.id,
        "user",
        message,
    )

    # Prefer actual database information for supported queries.
    try:
        database_reply = get_database_reply(
            message,
            db,
            current_user,
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not process your request. Please try again.",
        )

    if database_reply is not None:
        reply = database_reply
    else:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()

        if not api_key:
            reply = get_fallback_reply(
                message,
                current_user.username,
            )
        else:
            try:
                client = OpenAI(api_key=api_key)

                response = client.responses.create(
                    model=os.getenv("OPENAI_MODEL", "gpt-5.5"),
                    instructions=(
                        "You are the SmartEvent assistant. Help with "
                        "event discovery, ticket booking, navigation, "
                        "and FAQs. Be friendly and concise. Never invent "
                        "events, booking records, prices, availability, "
                        "or completed transactions. Never ask for passwords "
                        "or access tokens."
                    ),
                    input=message,
                    max_output_tokens=300,
                )

                reply = response.output_text.strip()

                if not reply:
                    reply = (
                        "I couldn't prepare a response. "
                        "Please try asking another question."
                    )

            except OpenAIError:
                reply = (
                    "The AI service is temporarily unavailable. "
                    "You can still ask me about trending events, "
                    "music events, bookings, and ticket issues."
                )

    # Save the assistant's reply.
    save_message(
        db,
        current_user.id,
        "assistant",
        reply,
    )

    return ChatbotResponse(
        reply=reply,
        suggestions=SUGGESTIONS,
    )


# --------------------------------------------------
# GET THE CURRENT USER'S CHAT HISTORY
# --------------------------------------------------

@router.get("/history")
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = (
        db.query(ChatbotMessage)
        .filter(ChatbotMessage.user_id == current_user.id)
        .order_by(ChatbotMessage.id.desc())
        .limit(100)
        .all()
    )

    # Return oldest to newest for correct chat display.
    messages.reverse()

    return [
        {
            "id": item.id,
            "role": item.role,
            "message": item.message,
            "created_at": item.created_at.isoformat(),
        }
        for item in messages
    ]


# --------------------------------------------------
# CLEAR THE CURRENT USER'S CHAT HISTORY
# --------------------------------------------------

@router.delete("/history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(ChatbotMessage).filter(
        ChatbotMessage.user_id == current_user.id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": "Your chatbot history has been cleared."
    }
