const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

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

    const pythonCommand =
        process.platform === "win32"
            ? "python"
            : "python3";

    console.log("Testing Python...");
    console.log("Platform:", process.platform);
    console.log("Python command:", pythonCommand);


    const python = spawn(
        pythonCommand,
        ["--version"]
    );


    let output = "";
    let errorOutput = "";


    python.stdout.on("data", (data) => {

        output += data.toString();

    });


    python.stderr.on("data", (data) => {

        errorOutput += data.toString();

    });


    python.on("error", (error) => {

        console.error(
            "Python start error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Python could not be started",

            error: error.message

        });

    });


    python.on("close", (code) => {

        console.log(
            "Python test finished:",
            code
        );


        res.json({

            success: code === 0,

            platform: process.platform,

            pythonCommand: pythonCommand,

            output: output,

            error: errorOutput

        });

    });

});


// ===============================
// SEND EMAIL
// ===============================

app.post("/send-email", (req, res) => {

    const {
        receiver,
        subject,
        message
    } = req.body;


    console.log("\n==============================");
    console.log("📧 EMAIL REQUEST");
    console.log("==============================");

    console.log("Receiver:", receiver);
    console.log("Subject:", subject);


    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!receiver || !subject || !message) {

        return res.status(400).json({

            success: false,

            message:
                "Receiver, subject and message are required"

        });

    }


    // -------------------------------
    // PYTHON FILE
    // -------------------------------

    const pythonFile = path.join(
        __dirname,
        "send_email.py"
    );


    console.log(
        "Python file:",
        pythonFile
    );


    // -------------------------------
    // PYTHON COMMAND
    // -------------------------------

    const pythonCommand =
        process.platform === "win32"
            ? "python"
            : "python3";


    console.log(
        "Python command:",
        pythonCommand
    );


    // -------------------------------
    // START PYTHON
    // -------------------------------

    const python = spawn(
        pythonCommand,
        [
            pythonFile,
            receiver,
            subject,
            message
        ],
        {
            env: process.env
        }
    );


    let output = "";

    let errorOutput = "";


    // -------------------------------
    // PYTHON STDOUT
    // -------------------------------

    python.stdout.on("data", (data) => {

        const text = data.toString();

        output += text;

        console.log(
            "🐍 Python:",
            text.trim()
        );

    });


    // -------------------------------
    // PYTHON STDERR
    // -------------------------------

    python.stderr.on("data", (data) => {

        const text = data.toString();

        errorOutput += text;

        console.error(
            "🐍 Python Error:",
            text.trim()
        );

    });


    // -------------------------------
    // PYTHON START ERROR
    // -------------------------------

    python.on("error", (error) => {

        console.error(
            "❌ Could not start Python:",
            error
        );


        if (!res.headersSent) {

            return res.status(500).json({

                success: false,

                message:
                    "Could not start Python",

                error:
                    error.message

            });

        }

    });


    // -------------------------------
    // PYTHON FINISHED
    // -------------------------------

    python.on("close", (code) => {

        console.log(
            "Python exit code:",
            code
        );


        console.log(
            "Python output:",
            output
        );


        console.log(
            "Python error:",
            errorOutput
        );


        if (
            code === 0 &&
            output.includes("EMAIL_SENT")
        ) {

            console.log(
                "✅ EMAIL SENT SUCCESSFULLY"
            );


            return res.json({

                success: true,

                message:
                    "Email sent successfully"

            });

        }


        if (!res.headersSent) {

            return res.status(500).json({

                success: false,

                message:
                    "Python failed to send email",

                error:
                    errorOutput || output

            });

        }

    });

});


// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `Environment: ${
                process.env.NODE_ENV || "development"
            }`
        );

    }
);