
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app import models

from app.routers import (
    auth,
    users,
    events,
    bookings,
    tickets,
    notifications,
    organizer,
    admin,
    payments,
    coupons
)

from app.exceptions import (
    validation_exception_handler,
    database_exception_handler,
    general_exception_handler
)


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="SmartEvent – Event Discovery & Ticket Booking System",
    description="Full-stack event discovery and ticket booking platform",
    version="1.0.0"
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Static files
app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static"
)


# Exception handlers
app.add_exception_handler(
    RequestValidationError,
    validation_exception_handler
)

app.add_exception_handler(
    SQLAlchemyError,
    database_exception_handler
)

app.add_exception_handler(
    Exception,
    general_exception_handler
)


# Register API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(tickets.router)
app.include_router(notifications.router)
app.include_router(organizer.router)
app.include_router(admin.router)
app.include_router(payments.router, prefix="/api/v1")
app.include_router(coupons.router)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Welcome to SmartEvent API"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

