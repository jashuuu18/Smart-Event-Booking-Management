import os
import uuid

import qrcode


QR_CODE_DIR = "app/static/qr_codes"


def generate_ticket_code() -> str:
    return f"SME-{uuid.uuid4().hex[:10].upper()}"


def generate_qr_code(ticket_code: str) -> str:
    os.makedirs(QR_CODE_DIR, exist_ok=True)

    file_name = f"{ticket_code}.png"
    file_path = os.path.join(
        QR_CODE_DIR,
        file_name
    )

    qr = qrcode.make(ticket_code)
    qr.save(file_path)

    return f"/static/qr_codes/{file_name}"