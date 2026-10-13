from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from fastapi.encoders import jsonable_encoder


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "errors": jsonable_encoder(exc.errors())
        }
    )


async def database_exception_handler(
    request: Request,
    exc: SQLAlchemyError
):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Database error occurred"
        }
    )


async def general_exception_handler(
    request: Request,
    exc: Exception
):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error"
        }
    )