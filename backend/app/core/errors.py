from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette import status


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def error_payload(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.code, exc.message, exc.details),
    )


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = jsonable_encoder(exc.errors(), custom_encoder={ValueError: str})
    date_range_messages = [
        str(error.get("msg", ""))
        for error in errors
        if "End date cannot be before start date" in str(error.get("msg", ""))
    ]
    if date_range_messages:
        return JSONResponse(
            status_code=422,
            content=error_payload(
                "INVALID_DATE_RANGE",
                "End date cannot be before start date.",
                {"errors": errors},
            ),
        )
    return JSONResponse(
        status_code=422,
        content=error_payload(
            "VALIDATION_ERROR",
            "The request contains invalid or missing fields.",
            {"errors": errors},
        ),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
