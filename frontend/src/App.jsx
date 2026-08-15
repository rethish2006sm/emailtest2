import { useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

function App() {

  const [receiver, setReceiver] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");


  const sendEmail = async () => {

    if (!receiver || !subject || !message) {

      setResult("❌ Please fill all fields");

      return;
    }


    setLoading(true);
    setResult("📧 Sending email...");


    try {

      const response = await fetch(
        `${API_BASE_URL}/send-email`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            receiver: receiver,

            subject: subject,

            message: message

          })
        }
      );


      const data = await response.json();


      if (data.success) {

        setResult(
          "✅ Email sent successfully!"
        );

        setReceiver("");
        setSubject("");
        setMessage("");

      } else {

        setResult(
          "❌ " + (data.message || "Email failed")
        );

      }

    } catch (error) {

      console.error(error);

      setResult(
        "❌ Cannot connect to backend"
      );

    } finally {

      setLoading(false);

    }

  };


  return (

    <div
      style={{
        maxWidth: "600px",
        margin: "50px auto",
        padding: "30px",
        fontFamily: "Arial"
      }}
    >

      <h1>
        📧 Python Email Sender
      </h1>


      <div>

        <label>
          Receiver Email
        </label>

        <input
          type="email"
          value={receiver}
          onChange={(e) =>
            setReceiver(e.target.value)
          }
          placeholder="receiver@gmail.com"
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            marginBottom: "20px"
          }}
        />

      </div>


      <div>

        <label>
          Subject
        </label>

        <input
          type="text"
          value={subject}
          onChange={(e) =>
            setSubject(e.target.value)
          }
          placeholder="Test Email"
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            marginBottom: "20px"
          }}
        />

      </div>


      <div>

        <label>
          Message
        </label>

        <textarea
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          placeholder="Write your message..."
          rows="6"
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            marginBottom: "20px"
          }}
        />

      </div>


      <button
        onClick={sendEmail}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          cursor: "pointer"
        }}
      >

        {loading
          ? "Sending..."
          : "Send Email"}

      </button>


      {result && (

        <p
          style={{
            marginTop: "20px"
          }}
        >
          {result}
        </p>

      )}

    </div>

  );

}


export default App;
