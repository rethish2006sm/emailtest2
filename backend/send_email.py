import os
import smtplib
import ssl
import sys
import traceback
import socket
from email.message import EmailMessage


def configure_stdio():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)


def require_env(name):
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} environment variable is missing")
    return value


def get_smtp_port():
    raw_port = os.environ.get("SMTP_PORT", "587")
    try:
        return int(raw_port)
    except ValueError as exc:
        raise RuntimeError("SMTP_PORT must be a valid integer") from exc


def is_truthy(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def decode_smtp_message(message):
    if isinstance(message, bytes):
        return message.decode("utf-8", errors="replace")
    return str(message)


def connect_smtp_via_ipv4(smtp_host, smtp_port, timeout):
    try:
        address_info = socket.getaddrinfo(
            smtp_host,
            smtp_port,
            family=socket.AF_INET,
            type=socket.SOCK_STREAM
        )
    except socket.gaierror as error:
        raise RuntimeError(
            f"Failed to resolve IPv4 address for {smtp_host}: {error}"
        ) from error

    if not address_info:
        raise RuntimeError(
            f"No IPv4 address found for SMTP host {smtp_host}"
        )

    errors = []

    for family, socktype, proto, _, sockaddr in address_info:
        ip_address, port = sockaddr[0], sockaddr[1]
        server = smtplib.SMTP(timeout=timeout)

        try:
            code, message = server.connect(ip_address, port)
            server._host = smtp_host

            print(
                f"SMTP IPv4 connection attempt: {ip_address}:{port} -> {code} {decode_smtp_message(message)}",
                flush=True
            )

            if code != 220:
                raise RuntimeError(
                    f"SMTP server returned unexpected response {code}: {decode_smtp_message(message)}"
                )

            return server, ip_address

        except Exception as error:
            errors.append(f"{ip_address}:{port} -> {error}")

            try:
                server.close()
            except Exception:
                pass

    raise RuntimeError(
        "Unable to connect to SMTP host via IPv4. "
        + " | ".join(errors)
    )


def send_email(receiver, subject, body):
    sender_email = require_env("SENDER_EMAIL")
    app_password = require_env("APP_PASSWORD")
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = get_smtp_port()
    use_starttls = is_truthy(os.environ.get("SMTP_USE_STARTTLS", "true"))
    timeout = float(os.environ.get("SMTP_TIMEOUT", "30"))

    print("Python email process started", flush=True)
    print(f"SMTP host: {smtp_host}", flush=True)
    print(f"SMTP port: {smtp_port}", flush=True)
    print(f"STARTTLS: {use_starttls}", flush=True)
    print(f"Sender: {sender_email}", flush=True)
    print(f"Receiver: {receiver}", flush=True)
    print("Resolving SMTP host through IPv4...", flush=True)

    email = EmailMessage()
    email["From"] = sender_email
    email["To"] = receiver
    email["Subject"] = subject
    email.set_content(body)

    context = ssl.create_default_context()

    server = None

    try:
        server, connected_ip = connect_smtp_via_ipv4(
            smtp_host,
            smtp_port,
            timeout
        )

        print(f"Connected to SMTP IPv4: {connected_ip}", flush=True)
        server.set_debuglevel(0)
        server.ehlo()

        if use_starttls:
            print("Starting TLS...", flush=True)
            server.starttls(context=context)
            server.ehlo()

        print("Logging into SMTP server...", flush=True)
        server.login(sender_email, app_password)

        print("Sending email...", flush=True)
        server.send_message(email)

        print("EMAIL_SENT", flush=True)

    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                try:
                    server.close()
                except Exception:
                    pass


def check_configuration():
    sender_email = require_env("SENDER_EMAIL")
    require_env("APP_PASSWORD")
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = get_smtp_port()
    use_starttls = is_truthy(os.environ.get("SMTP_USE_STARTTLS", "true"))

    print("Python configuration check passed", flush=True)
    print(f"SMTP host: {smtp_host}", flush=True)
    print(f"SMTP port: {smtp_port}", flush=True)
    print(f"STARTTLS: {use_starttls}", flush=True)
    print(f"Sender: {sender_email}", flush=True)
    print("APP_PASSWORD: present", flush=True)


def main():
    configure_stdio()

    if len(sys.argv) == 2 and sys.argv[1] == "--check":
        try:
            check_configuration()
            return 0
        except Exception as error:
            print(f"EMAIL_ERROR: {error}", file=sys.stderr, flush=True)
            traceback.print_exc(file=sys.stderr)
            return 1

    if len(sys.argv) < 4:
        print("EMAIL_ERROR: Missing arguments", file=sys.stderr, flush=True)
        print("Usage: python3 send_email.py <receiver> <subject> <message>", file=sys.stderr, flush=True)
        print("Or: python3 send_email.py --check", file=sys.stderr, flush=True)
        return 2

    receiver = sys.argv[1].strip()
    subject = sys.argv[2]
    body = sys.argv[3]

    try:
        send_email(receiver, subject, body)
        return 0
    except Exception as error:
        print(f"EMAIL_ERROR: {error}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
