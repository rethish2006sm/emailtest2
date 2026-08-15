import { useState } from "react";

// LOCAL:
// http://localhost:5000
//
// DEPLOYED:
// Set VITE_API_URL in the frontend host to your backend URL, for example:
// https://your-backend-name.onrender.com

const BACKEND_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "");

async function readApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();

    return {
        success: false,
        message: text || "Server returned a non-JSON response",
        raw: text
    };
}

function App() {
    const [receiver, setReceiver] = useState("");
    const [subject, setSubject] = useState("Test Email from React");
    const [message, setMessage] = useState(
        "Hello! This email was sent using React + Node.js + Python."
    );
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");
    const [success, setSuccess] = useState(false);

    const resolveErrorMessage = (data, fallback) =>
        data?.error?.message ||
        data?.message ||
        data?.raw ||
        fallback;

    const requireBackendUrl = () => {
        if (!BACKEND_URL) {
            throw new Error(
                "Backend URL is missing. Set VITE_API_URL to your deployed backend URL."
            );
        }
    };

    const sendEmail = async () => {
        setResult("");
        setSuccess(false);

        if (!receiver || !subject || !message) {
            setResult("Please fill all fields.");
            return;
        }

        setLoading(true);
        setResult("Sending email...");

        try {
            requireBackendUrl();

            console.log("Backend:", BACKEND_URL);

            const response = await fetch(`${BACKEND_URL}/send-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    receiver,
                    subject,
                    message
                })
            });

            const data = await readApiResponse(response);

            console.log("Backend response:", data);

            if (!response.ok) {
                throw new Error(
                    resolveErrorMessage(
                        data,
                        `Server error: ${response.status}`
                    )
                );
            }

            if (data.success) {
                setSuccess(true);
                setResult("Email sent successfully!");
                setReceiver("");
            } else {
                setResult(`Error: ${resolveErrorMessage(data, "Email failed")}`);
            }
        } catch (error) {
            console.error("Email error:", error);
            setSuccess(false);
            setResult(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const testBackend = async () => {
        try {
            requireBackendUrl();

            const response = await fetch(`${BACKEND_URL}/`);
            const data = await readApiResponse(response);

            console.log("Backend test:", data);
            alert(data.message || "Backend test succeeded");
        } catch (error) {
            console.error(error);
            alert(`Backend is not reachable: ${error.message}`);
        }
    };

    const testPython = async () => {
        try {
            requireBackendUrl();

            const response = await fetch(`${BACKEND_URL}/test-python`);
            const data = await readApiResponse(response);

            console.log("Python test:", data);

            if (data.success) {
                alert(`Python is working!\n\n${data.output || ""}`);
            } else {
                alert(
                    `Python problem:\n\n${resolveErrorMessage(
                        data,
                        "Unknown error"
                    )}`
                );
            }
        } catch (error) {
            console.error(error);
            alert(`Cannot connect to backend: ${error.message}`);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#f4f6f8",
                padding: "16px",
                fontFamily: "Arial"
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "600px",
                    background: "white",
                    padding: "clamp(18px, 4vw, 30px)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                }}
            >
                <h1>Email Sender</h1>

                <p>React to Node.js to Python to Gmail</p>

                <button
                    onClick={testBackend}
                    style={{
                        marginRight: "10px",
                        marginBottom: "10px",
                        padding: "10px"
                    }}
                >
                    Test Backend
                </button>

                <button
                    onClick={testPython}
                    style={{
                        padding: "10px",
                        marginBottom: "25px"
                    }}
                >
                    Test Python
                </button>

                <label>Receiver Email</label>

                <input
                    type="email"
                    placeholder="receiver@gmail.com"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "8px",
                        marginBottom: "20px"
                    }}
                />

                <label>Subject</label>

                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "8px",
                        marginBottom: "20px"
                    }}
                />

                <label>Message</label>

                <textarea
                    rows="6"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "8px",
                        marginBottom: "20px",
                        resize: "vertical"
                    }}
                />

                <button
                    onClick={sendEmail}
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "16px",
                        cursor: loading ? "not-allowed" : "pointer"
                    }}
                >
                    {loading ? "Sending..." : "Send Email"}
                </button>

                {result && (
                    <p
                        style={{
                            marginTop: "20px",
                            fontWeight: "bold",
                            color: success ? "#0a7b34" : "#b00020"
                        }}
                    >
                        {result}
                    </p>
                )}
            </div>
        </div>
    );
}

export default App;
