const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
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
    return process.platform === "win32" ? "python" : "python3";
}

function spawnPython(args) {
    return spawn(getPythonCommand(), args, {
        env: process.env
    });
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
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
    const python = spawnPython(["--version"]);

    let output = "";
    let errorOutput = "";
    let responded = false;

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
            return sendErrorResponse(
                res,
                500,
                "PYTHON_TEST_FAILED",
                "Python test failed",
                {
                    exitCode: code,
                    stdout: output,
                    stderr: errorOutput
                }
            );
        }

        return res.json({
            success: true,
            platform: process.platform,
            pythonCommand: getPythonCommand(),
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

    const pythonFile = path.join(__dirname, "send_email.py");
    const python = spawnPython([pythonFile, receiver, subject, message]);

    let output = "";
    let errorOutput = "";
    let responded = false;

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
        console.log("Python output:", output);
        console.log("Python error:", errorOutput);

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
