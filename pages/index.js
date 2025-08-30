import { useEffect, useState } from "react";

export default function Home() {
  const [news, setNews] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/cricket-report");
        const data = await res.json();
        if (data.success) {
          setNews(data.news);
          setSummary(data.summary || "No summary available");
        }
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading cricket news...</p>;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1>🏏 Daily Cricket Report</h1>
      {summary && (
        <>
          <h2>AI Summary</h2>
          <p>{summary}</p>
        </>
      )}

      <h2>Latest Headlines</h2>
      <ul>
        {news.map((item, idx) => (
          <li key={idx} style={{ marginBottom: "1rem" }}>
            <strong>{item.headline}</strong> <br />
            <em>Source: {item.source}</em> <br />
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              Read more
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
