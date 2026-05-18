import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import booking, business, call, dashboard, widget

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)

app = FastAPI(title="Helio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.tryhelio.com",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(call.router,      prefix="/call",      tags=["call"])
app.include_router(booking.router,   prefix="/booking",   tags=["booking"])
app.include_router(business.router,  prefix="/business",  tags=["business"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(widget.router,    prefix="/widget",    tags=["widget"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "helio-api", "env": settings.app_env}
