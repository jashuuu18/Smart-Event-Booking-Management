from app.models import Event


def calculate_total_price(
    ticket_price: float,
    quantity: int
) -> float:
    

    return ticket_price * quantity


def check_ticket_availability(
    event: Event,
    quantity: int
) -> bool:
    

    if quantity <= 0:
        return False

    return event.available_tickets >= quantity


def reduce_available_tickets(
    event: Event,
    quantity: int
) -> None:
    

    event.available_tickets -= quantity