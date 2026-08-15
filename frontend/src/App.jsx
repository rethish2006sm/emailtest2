import { useState } from "react";


// ======================================
// BACKEND URL
// ======================================

// LOCAL:
// http://localhost:5000

// RENDER:
// https://your-backend-name.onrender.com


const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL ||
    (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : window.location.origin);


function App() {

    const [receiver, setReceiver] = useState("");

    const [subject, setSubject] = useState(
        "Test Email from React"
    );

    const [message, setMessage] = useState(
        "Hello! This email was sent using React + Node.js + Python."
    );

    const [loading, setLoading] = useState(false);

    const [result, setResult] = useState("");

    const [success, setSuccess] = useState(false);


    // ======================================
    // SEND EMAIL
    // ======================================

    const sendEmail = async () => {

        setResult("");

        setSuccess(false);


        // -------------------------------
        // VALIDATION
        // -------------------------------

        if (
            !receiver ||
            !subject ||
            !message
        ) {

            setResult(
                "❌ Please fill all fields."
            );

            return;

        }


        setLoading(true);

        setResult(
            "📧 Sending email..."
        );


        try {

            console.log(
                "Backend:",
                BACKEND_URL
            );


            const response = await fetch(
                `${BACKEND_URL}/send-email`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        receiver: receiver,

                        subject: subject,

                        message: message

                    })
                }
            );


            const data =
                await response.json();


            console.log(
                "Backend response:",
                data
            );


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    `Server error: ${response.status}`
                );

            }


            if (data.success) {

                setSuccess(true);

                setResult(
                    "✅ Email sent successfully!"
                );

                setReceiver("");

            } else {

                setResult(
                    "❌ " +
                    (
                        data.error ||
                        data.message ||
                        "Email failed"
                    )
                );

            }


        } catch (error) {

            console.error(
                "Email error:",
                error
            );


            setSuccess(false);

            setResult(
                "❌ " + error.message
            );


        } finally {

            setLoading(false);

        }

    };


    // ======================================
    // TEST BACKEND
    // ======================================

    const testBackend = async () => {

        try {

            const response =
                await fetch(
                    `${BACKEND_URL}/`
                );


            const data =
                await response.json();


            console.log(
                "Backend test:",
                data
            );


            alert(
                data.message
            );


        } catch (error) {

            console.error(error);

            alert(
                "❌ Backend is not reachable"
            );

        }

    };


    // ======================================
    // TEST PYTHON
    // ======================================

    const testPython = async () => {

        try {

            const response =
                await fetch(
                    `${BACKEND_URL}/test-python`
                );


            const data =
                await response.json();


            console.log(
                "Python test:",
                data
            );


            if (data.success) {

                alert(
                    "✅ Python is working!\n\n" +
                    data.output
                );

            } else {

                alert(
                    "❌ Python problem:\n\n" +
                    (
                        data.error ||
                        data.message
                    )
                );

            }


        } catch (error) {

            console.error(error);

            alert(
                "❌ Cannot connect to backend"
            );

        }

    };


    // ======================================
    // UI
    // ======================================

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
                        boxShadow:
                            "0 4px 20px rgba(0,0,0,0.1)"
                    }}
                >

                <h1>
                    📧 Email Sender
                </h1>


                <p>
                    React → Node.js → Python → Gmail
                </p>


                {/* BACKEND TEST */}

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


                {/* PYTHON TEST */}

                <button
                    onClick={testPython}
                    style={{
                        padding: "10px",
                        marginBottom: "25px"
                    }}
                >
                    Test Python
                </button>


                {/* RECEIVER */}

                <label>
                    Receiver Email
                </label>

                <input
                    type="email"
                    placeholder="receiver@gmail.com"
                    value={receiver}
                    onChange={(e) =>
                        setReceiver(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "8px",
                        marginBottom: "20px"
                    }}
                />


                {/* SUBJECT */}

                <label>
                    Subject
                </label>

                <input
                    type="text"
                    value={subject}
                    onChange={(e) =>
                        setSubject(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "8px",
                        marginBottom: "20px"
                    }}
                />


                {/* MESSAGE */}

                <label>
                    Message
                </label>

                <textarea
                    rows="6"
                    value={message}
                    onChange={(e) =>
                        setMessage(
                            e.target.value
                        )
                    }
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "8px",
                        marginBottom: "20px",
                        resize: "vertical"
                    }}
                />


                {/* SEND BUTTON */}

                <button
                    onClick={sendEmail}
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "16px",
                        cursor: loading
                            ? "not-allowed"
                            : "pointer"
                    }}
                >

                    {loading
                        ? "Sending..."
                        : "Send Email 📧"}

                </button>


                {/* RESULT */}

                {result && (

                    <p
                        style={{
                            marginTop: "20px",
                            fontWeight: "bold"
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
