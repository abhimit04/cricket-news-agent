import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runCricketReport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/cricket-report");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "50px", fontFamily: "Arial" }}>
      <h1>🏏 Cricket News Reporter</h1>
      <p>Click below to generate the latest cricket report</p>
      <button
        onClick={runCricketReport}
        disabled={loading}
        style={{
          padding: "10px 20px",
          background: "green",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        {loading ? "Running..." : "Run Cricket Report"}
      </button>

      {result && (
        <div style={{ marginTop: "30px", textAlign: "left", maxWidth: "600px", margin: "30px auto" }}>
          <h3>📢 Report Output:</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "10px",
              borderRadius: "5px",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
