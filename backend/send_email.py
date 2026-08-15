import os
import sys
import smtplib
from email.message import EmailMessage


# ==========================
# EMAIL CONFIGURATION
# ==========================

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")


# ==========================
# SEND EMAIL
# ==========================

def send_email(receiver, subject, body):

    try:
        if not SENDER_EMAIL or not APP_PASSWORD:
            print("EMAIL_ERROR: Missing SENDER_EMAIL or APP_PASSWORD")
            sys.exit(1)

        msg = EmailMessage()

        msg["From"] = SENDER_EMAIL
        msg["To"] = receiver
        msg["Subject"] = subject

        msg.set_content(body)

        with smtplib.SMTP("smtp.gmail.com", 587) as server:

            server.starttls()

            server.login(
                SENDER_EMAIL,
                APP_PASSWORD
            )

            server.send_message(msg)

        print("EMAIL_SENT")

    except Exception as e:

        print("EMAIL_ERROR:", str(e))

        sys.exit(1)


# ==========================
# GET DATA FROM NODE.JS
# ==========================

if __name__ == "__main__":

    if len(sys.argv) < 4:
        print("EMAIL_ERROR: Missing arguments")
        sys.exit(1)

    receiver = sys.argv[1]
    subject = sys.argv[2]
    body = sys.argv[3]

    send_email(
        receiver,
        subject,
        body
    )
