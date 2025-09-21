import axios from "axios";
import * as cheerio from "cheerio";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Optional: simple in-memory cache to avoid repeated Gemini calls
const summaryCache = {
  text: null,
  timestamp: 0,
  ttl: 1000 * 60 * 30, // 30 minutes
};

export default async function handler(req, res) {
  let news = [];

  // ----------------------------
  // Cricinfo RSS Feed
  // ----------------------------
  try {
    const rssUrl = "https://www.espncricinfo.com/rss/content/story/feeds/0.xml";
    const response = await axios.get(rssUrl, { timeout: 8000 });
    const $ = cheerio.load(response.data, { xmlMode: true });

    $("item").each((i, el) => {
      if (i < 10) {
        const headline = $(el).find("title").text().trim();
        const link = $(el).find("link").text().trim();
        const summary = $(el).find("description").text().trim() || "No summary available";

        news.push({ source: "Cricinfo", headline, summary, link });
      }
    });
  } catch (err) {
    console.warn("Cricinfo RSS fetch failed:", err.message);
  }

  // ----------------------------
  // Cricbuzz Scraping
  // ----------------------------
  try {
    const cricbuzzUrl = "https://www.cricbuzz.com/cricket-news";
    const cricbuzzResponse = await axios.get(cricbuzzUrl, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $cb = cheerio.load(cricbuzzResponse.data);
    $cb(".cb-nws-hdln a").each((i, el) => {
      if (i < 5) {
        const headline = $cb(el).text().trim();
        const href = $cb(el).attr("href");
        const link = href ? "https://www.cricbuzz.com" + href : "";
        if (headline && link) {
          news.push({ source: "Cricbuzz", headline, summary: "No summary available", link });
        }
      }
    });
  } catch (err) {
    console.warn("Cricbuzz scraping failed:", err.message);
  }

  // ----------------------------
  // NewsAPI Fallback
  // ----------------------------
  if (process.env.NEWS_API_KEY) {
    try {
      const response = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: "cricket",
          language: "en",
          sortBy: "publishedAt",
          pageSize: 5,
          apiKey: process.env.NEWS_API_KEY,
        },
      });

      const articles = response.data.articles.map((article) => ({
        source: article.source.name,
        headline: article.title,
        summary: article.description || "No summary available",
        link: article.url,
      }));

      news = [...news, ...articles];
    } catch (err) {
      console.warn("NewsAPI fetch failed:", err.message);
    }
  }

  // ----------------------------
  // AI Summary with Gemini
  // ----------------------------
  let summaryText = "";
  if (news.length > 0 && process.env.GOOGLE_AI_API_KEY) {
    try {
      const now = Date.now();
      // Use cache to avoid repeated API calls
      if (summaryCache.text && now - summaryCache.timestamp < summaryCache.ttl) {
        summaryText = summaryCache.text;
      } else {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const headlinesList = news.map((item) => `- ${item.headline} (${item.source})`);
        const prompt = `
Rules:
- Summarize the following cricket news headlines into concise bullet points
- Keep sentences short and concise

Headlines:
${headlinesList.join("\n")}
`;

        const result = await model.generateContent(prompt);
        summaryText = result.response?.text?.() || "No summary available";

        summaryCache.text = summaryText;
        summaryCache.timestamp = now;
      }
    } catch (err) {
      console.warn("Gemini summarization failed:", err.message);
    }
  }

  // ----------------------------
  // Send Email (if configured)
  // ----------------------------
  let emailSent = false;
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Cricket News Agent" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO,
        subject: "Daily Cricket Report 🏏",
        html: `
<h2>Daily Cricket Report 🏏</h2>
<h3>Cricket news summary:</h3>
<ul>
  ${(summaryText || "No summary available")
    .split("\n")
    .map((line) => `<li>${line.replace(/^-/, "").trim()}</li>`)
    .filter((line) => line.length > 0)
    .join("")}
</ul>

<h3>Latest Headlines:</h3>
<ul>
  ${news
    .map(
      (item) =>
        `<li><strong>${item.headline}</strong> <em>(${item.source})</em><br>
         <a href="${item.link}" target="_blank">Read more</a></li>`
    )
    .join("")}
</ul>
`,
      });

      emailSent = true;
    } catch (err) {
      console.error("Email sending failed:", err.message);
    }
  }

  // ----------------------------
  // Final Response
  // ----------------------------
  if (news.length > 0) {
    res.status(200).json({
      success: true,
      count: news.length,
      summary: summaryText,
      news,
      emailSent,
    });
  } else {
    res.status(200).json({
      success: false,
      message: "No cricket news found",
      news: [],
    });
  }
}
