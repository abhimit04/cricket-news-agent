import axios from "axios";
import * as cheerio from "cheerio";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    let news = [];

    // ----------------------------
    // Cricinfo Scraping
    // ----------------------------
    try {
      const cricinfoUrl = "https://www.espncricinfo.com/latest-cricket-news";
      const cricinfoResponse = await axios.get(cricinfoUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $ci = cheerio.load(cricinfoResponse.data);

      $ci("a[data-hover='Latest']").each((i, el) => {
        if (i < 5) {
          const headline = $ci(el).text().trim();
          const href = $ci(el).attr("href");
          const link = href ? "https://www.espncricinfo.com" + href : "";
          if (headline && link) {
            news.push({
              source: "Cricinfo",
              headline,
              summary: "No summary available",
              link
            });
          }
        }
      });
    } catch (err) {
      console.warn("Cricinfo scraping failed:", err.message);
    }

    // ----------------------------
    // Cricbuzz Scraping
    // ----------------------------
    try {
      const cricbuzzUrl = "https://www.cricbuzz.com/cricket-news";
      const cricbuzzResponse = await axios.get(cricbuzzUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $cb = cheerio.load(cricbuzzResponse.data);

      $cb(".cb-nws-hdln a").each((i, el) => {
        if (i < 5) {
          const headline = $cb(el).text().trim();
          const href = $cb(el).attr("href");
          const link = href ? "https://www.cricbuzz.com" + href : "";
          if (headline && link) {
            news.push({
              source: "Cricbuzz",
              headline,
              summary: "No summary available",
              link
            });
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
            apiKey: process.env.NEWS_API_KEY
          }
        });

        const articles = response.data.articles.map(article => ({
          source: article.source.name,
          headline: article.title,
          summary: article.description || "No summary available",
          link: article.url
        }));

        news = [...news, ...articles];
      } catch (err) {
        console.warn("NewsAPI failed:", err.message);
      }
    }

    // ----------------------------
    // AI Summary with Gemini
    // ----------------------------
    let summaryText = "";
    if (news.length > 0 && process.env.GOOGLE_AI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // ✅ free model

        const headlinesList = news.map(item => `- ${item.headline} (${item.source})`);
        const prompt = `
        Summarize these cricket news headlines into clear bullet points.
        Rules:
        - Start each point with "•"
        - Each point should be short (1–2 sentences max)
        - Each point on a new line

        Headlines:
        ${headlinesList.join("\n")}
        `;


        const result = await model.generateContent(prompt);
        summaryText = result.response.text();


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
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: `"Cricket Bot" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_TO,
          subject: "Daily Cricket Report 🏏",
          html: `
            <h2>Top cricket news for you :</h2>

            //<p>${summaryText || "No summary available"}</p>

            <ul>
              ${(summaryText || "No summary available")
                .split("\n")                 // split into lines
                .filter(line => line.trim()) // remove empty lines
                .map(line => `<li>${line.replace(/^[-•]\s*/, "")}</li>`) // clean leading dashes/bullets
                .join("")}
            </ul>


            <h3>Latest Headlines:</h3>
            <ul>
              ${news.map(item =>
                `<li><strong>${item.headline}</strong> <em>(${item.source})</em><br>
                 <a href="${item.link}" target="_blank">Read more</a></li>`
              ).join("")}
            </ul>
          `
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
        emailSent
      });
    } else {
      res.status(200).json({
        success: false,
        message: "No cricket news found",
        news: []
      });
    }
  } catch (err) {
    console.error("Cricket report failed:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
