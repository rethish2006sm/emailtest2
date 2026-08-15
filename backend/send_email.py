import sys
import os
import smtplib
from email.message import EmailMessage


# =====================================
# FORCE UTF-8 OUTPUT
# =====================================

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


# =====================================
# EMAIL CONFIGURATION
# =====================================

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")


# =====================================
# SEND EMAIL
# =====================================

def send_email(receiver, subject, body):

    try:

        print("Python email process started", flush=True)


        # Check credentials

        if not SENDER_EMAIL:
            raise Exception(
                "SENDER_EMAIL environment variable is missing"
            )

        if not APP_PASSWORD:
            raise Exception(
                "APP_PASSWORD environment variable is missing"
            )


        print(
            f"Sender: {SENDER_EMAIL}",
            flush=True
        )

        print(
            f"Receiver: {receiver}",
            flush=True
        )


        # =================================
        # CREATE EMAIL
        # =================================

        email = EmailMessage()

        email["From"] = SENDER_EMAIL
        email["To"] = receiver
        email["Subject"] = subject

        # UTF-8 message body is supported
        email.set_content(body)


        # =================================
        # CONNECT TO GMAIL
        # =================================

        print(
            "Connecting to Gmail...",
            flush=True
        )


        with smtplib.SMTP(
            "smtp.gmail.com",
            587,
            timeout=30
        ) as server:

            # Start TLS
            server.starttls()


            print(
                "Logging into Gmail...",
                flush=True
            )


            # Login
            server.login(
                SENDER_EMAIL,
                APP_PASSWORD
            )


            print(
                "Sending email...",
                flush=True
            )


            # Send email
            server.send_message(email)


        print(
            "EMAIL_SENT",
            flush=True
        )


    except Exception as error:

        print(
            f"EMAIL_ERROR: {error}",
            flush=True
        )

        sys.exit(1)


# =====================================
# MAIN
# =====================================

if __name__ == "__main__":

    if len(sys.argv) < 4:

        print(
            "EMAIL_ERROR: Missing arguments",
            flush=True
        )

        sys.exit(1)


    receiver = sys.argv[1]

    subject = sys.argv[2]

    body = sys.argv[3]


    send_email(
        receiver,
        subject,
        body
    )