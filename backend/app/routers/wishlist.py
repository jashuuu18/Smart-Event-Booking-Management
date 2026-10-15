
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Wishlist, Event, User


router = APIRouter(
    prefix="/api/v1/wishlist",
    tags=["Wishlist"],
)


def wishlist_item_response(item):
    event = item.event

    return {
        "id": item.id,
        "user_id": item.user_id,
        "event_id": item.event_id,
        "created_at": item.created_at,
        "event": {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "category": event.category,
            "location": event.location,
            "event_date": event.event_date,
            "ticket_price": event.ticket_price,
            "available_tickets": event.available_tickets,
            "banner_image": event.banner_image,
            "event_status": event.event_status,
        },
    }


@router.post("/{event_id}", status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    existing = (
        db.query(Wishlist)
        .filter(
            Wishlist.user_id == current_user.id,
            Wishlist.event_id == event_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is already in your wishlist",
        )

    item = Wishlist(
        user_id=current_user.id,
        event_id=event_id,
    )

    try:
        db.add(item)
        db.commit()
        db.refresh(item)

        item = (
            db.query(Wishlist)
            .options(joinedload(Wishlist.event))
            .filter(Wishlist.id == item.id)
            .first()
        )

        return {
            "success": True,
            "message": "Event added to wishlist",
            "wishlist_item": wishlist_item_response(item),
        }

    except Exception:
        db.rollback()
        raise


@router.get("/")
def get_my_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Wishlist)
        .options(joinedload(Wishlist.event))
        .filter(Wishlist.user_id == current_user.id)
        .order_by(Wishlist.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(items),
        "wishlist": [
            wishlist_item_response(item)
            for item in items
        ],
    }


@router.delete("/{event_id}")
def remove_from_wishlist(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = (
        db.query(Wishlist)
        .filter(
            Wishlist.user_id == current_user.id,
            Wishlist.event_id == event_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found in your wishlist",
        )

    db.delete(item)
    db.commit()

    return {
        "success": True,
        "message": "Event removed from wishlist",
        "event_id": event_id,
    }
