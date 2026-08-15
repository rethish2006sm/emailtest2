const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();

function loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) {
        return;
    }

    const content = fs.readFileSync(envPath, "utf8");

    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
            return;
        }

        const equalsIndex = trimmed.indexOf("=");

        if (equalsIndex === -1) {
            return;
        }

        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed
            .slice(equalsIndex + 1)
            .trim()
            .replace(/^"(.*)"$/, "$1")
            .replace(/^'(.*)'$/, "$1");

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, ".env.local"));

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "";
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");


// ==========================
// MIDDLEWARE
// ==========================

const corsOptions = FRONTEND_URL
    ? { origin: FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean) }
    : undefined;

app.use(cors(corsOptions));
app.use(express.json());


// ==========================
// TEST ROUTE
// ==========================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Backend is running"
    });
});


// ==========================
// SEND EMAIL
// ==========================

app.post("/send-email", (req, res) => {
    const {
        receiver,
        subject,
        message
    } = req.body;

    if (!receiver || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: "receiver, subject and message are required"
        });
    }

    const pythonFile = path.join(__dirname, "send_email.py");

    console.log("Sending email...");
    console.log("Receiver:", receiver);

    const python = spawn(PYTHON_BIN, [
        pythonFile,
        receiver,
        subject,
        message
    ]);

    let output = "";
    let errorOutput = "";

    python.stdout.on("data", (data) => {
        output += data.toString();

        console.log(
            "Python:",
            data.toString()
        );
    });

    python.stderr.on("data", (data) => {
        errorOutput += data.toString();

        console.error(
            "Python Error:",
            data.toString()
        );
    });

    python.on("close", (code) => {
        console.log(
            "Python process exited with code:",
            code
        );

        if (
            code === 0 &&
            output.includes("EMAIL_SENT")
        ) {
            return res.json({
                success: true,
                message: "Email sent successfully"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to send email",
            error: errorOutput || output
        });
    });

    python.on("error", (error) => {
        console.error(
            "Failed to start Python:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Could not start Python",
            error: error.message
        });
    });
});


// ==========================
// START SERVER
// ==========================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
