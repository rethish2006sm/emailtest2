const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

function sendErrorResponse(res, statusCode, code, message, details = null) {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details
        }
    });
}

function getPythonCommand() {
    return process.env.PYTHON_BINARY || (process.platform === "win32" ? "python" : "python3");
}

const EMAIL_PYTHON_CODE = `
import os
import smtplib
import ssl
import socket
import sys
import traceback
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
        raise RuntimeError(f"No IPv4 address found for SMTP host {smtp_host}")

    errors = []

    for _, _, _, _, sockaddr in address_info:
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
        "Unable to connect to SMTP host via IPv4. " + " | ".join(errors)
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
        print(
            "Usage: python3 -c '<code>' <receiver> <subject> <message>",
            file=sys.stderr,
            flush=True
        )
        print("Or: python3 -c '<code>' --check", file=sys.stderr, flush=True)
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
`;

function spawnPython(args) {
    return spawn(getPythonCommand(), args, {
        cwd: __dirname,
        env: {
            ...process.env,
            PYTHONUNBUFFERED: "1",
            PYTHONIOENCODING: "utf-8"
        }
    });
}

function spawnInlinePython(args) {
    const python = spawnPython(args);
    python.stdin.end(EMAIL_PYTHON_CODE);
    return python;
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// ===============================
// HOME / HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Email backend is running",
        python: "connected through child_process"
    });
});

// ===============================
// TEST PYTHON
// ===============================

app.get("/test-python", (req, res) => {
    const pythonCommand = getPythonCommand();
    const python = spawnInlinePython(["-", "--check"]);

    let output = "";
    let errorOutput = "";
    let responded = false;

    console.log("Python test command:", pythonCommand);
    console.log("Python test cwd:", __dirname);
    console.log("Python test mode:", "inline");

    python.stdout.on("data", (data) => {
        output += data.toString();
    });

    python.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    python.on("error", (error) => {
        if (responded) {
            return;
        }

        responded = true;
        console.error("Python start error:", error);

        return sendErrorResponse(
            res,
            500,
            "PYTHON_START_FAILED",
            "Python could not be started",
            {
                command: pythonCommand,
                cwd: __dirname,
                message: error.message
            }
        );
    });

    python.on("close", (code) => {
        if (responded) {
            return;
        }

        responded = true;
        console.log("Python test finished:", code);

        if (code !== 0) {
            console.error("Python test stdout:", output.trim());
            console.error("Python test stderr:", errorOutput.trim());

            return sendErrorResponse(
                res,
                500,
                "PYTHON_TEST_FAILED",
                "Python test failed",
                {
                    command: pythonCommand,
                    cwd: __dirname,
                    exitCode: code,
                    stdout: output,
                    stderr: errorOutput
                }
            );
        }

        return res.json({
            success: true,
            platform: process.platform,
            pythonCommand,
            output,
            error: errorOutput
        });
    });
});

// ===============================
// SEND EMAIL
// ===============================

app.post("/send-email", (req, res) => {
    const { receiver, subject, message } = req.body;

    console.log("\n==============================");
    console.log("EMAIL REQUEST");
    console.log("==============================");
    console.log("Receiver:", receiver);
    console.log("Subject:", subject);

    if (!receiver || !subject || !message) {
        return sendErrorResponse(
            res,
            400,
            "VALIDATION_ERROR",
            "Receiver, subject and message are required"
        );
    }

    const pythonCommand = getPythonCommand();
    const python = spawnInlinePython(["-", receiver, subject, message]);

    let output = "";
    let errorOutput = "";
    let responded = false;

    console.log("Python command:", pythonCommand);
    console.log("Python cwd:", __dirname);
    console.log("Python mode:", "inline");

    python.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log("Python:", text.trim());
    });

    python.stderr.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error("Python Error:", text.trim());
    });

    python.on("error", (error) => {
        if (responded) {
            return;
        }

        responded = true;
        console.error("Could not start Python:", error);

        return sendErrorResponse(
            res,
            500,
            "PYTHON_START_FAILED",
            "Could not start Python",
            {
                command: pythonCommand,
                cwd: __dirname,
                message: error.message
            }
        );
    });

    python.on("close", (code) => {
        if (responded) {
            return;
        }

        responded = true;
        console.log("Python exit code:", code);
        console.log("Python stdout:", output.trim());
        console.log("Python stderr:", errorOutput.trim());

        if (code === 0 && output.includes("EMAIL_SENT")) {
            console.log("Email sent successfully");

            return res.json({
                success: true,
                message: "Email sent successfully"
            });
        }

        return sendErrorResponse(
            res,
            500,
            "EMAIL_SEND_FAILED",
            "Python failed to send email",
            {
                command: pythonCommand,
                cwd: __dirname,
                exitCode: code,
                stdout: output,
                stderr: errorOutput
            }
        );
    });
});

// ===============================
// 404 / GLOBAL ERROR HANDLER
// ===============================

app.use((req, res) => {
    return sendErrorResponse(
        res,
        404,
        "ROUTE_NOT_FOUND",
        "Route not found"
    );
});

app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);

    if (res.headersSent) {
        return next(err);
    }

    return sendErrorResponse(
        res,
        500,
        "INTERNAL_SERVER_ERROR",
        "Unexpected server error",
        {
            message: err && err.message ? err.message : "Unknown error"
        }
    );
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
