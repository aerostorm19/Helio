import base64
import logging
import os
import tempfile

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings

# Decode base64 service account JSON so Google Cloud clients can find it
if settings.google_service_account_base64 and not os.path.exists(
    settings.google_application_credentials or ""
):
    try:
        decoded = base64.b64decode(settings.google_service_account_base64 + "==")
        sa_file = tempfile.NamedTemporaryFile(
            delete=False, suffix=".json", prefix="helio-sa-"
        )
        sa_file.write(decoded)
        sa_file.flush()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = sa_file.name
        logging.getLogger(__name__).info(
            "Google service account written to %s", sa_file.name
        )
    except Exception:
        logging.getLogger(__name__).exception(
            "Failed to decode GOOGLE_SERVICE_ACCOUNT_BASE64"
        )
from routers import booking, business, call, dashboard, widget

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)

app = FastAPI(title="Helio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Widget is embedded on arbitrary customer sites
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
