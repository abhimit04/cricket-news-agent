import axios from "axios";
import * as cheerio from "cheerio";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    let news = [];

    // ----------------------------
    // 1. Cricinfo scraping
    // ----------------------------
    try {
      const cricinfoUrl = "https://www.espncricinfo.com/latest-cricket-news";
      const cricinfoResponse = await axios.get(cricinfoUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $ci = cheerio.load(cricinfoResponse.data);
      $ci(".ds-py-3").each((i, el) => {
        if (i < 5) {
          const headline = $ci(el).find("h2 a").text().trim();
          const href = $ci(el).find("h2 a").attr("href");
          const link = href ? "https://www.espncricinfo.com" + href : "";
          const summary = $ci(el).find("p").text().trim();

          if (headline && link) {
            news.push({
              source: "Cricinfo",
              headline,
              summary: summary || "No summary available",
              link
            });
          }
        }
      });
    } catch (err) {
      console.warn("Cricinfo scraping failed:", err.message);
    }

    // ----------------------------
    // 2. Cricbuzz scraping
    // ----------------------------
    try {
      const cricbuzzUrl = "https://www.cricbuzz.com/cricket-news";
      const cricbuzzResponse = await axios.get(cricbuzzUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $cb = cheerio.load(cricbuzzResponse.data);
      $cb(".cb-nws-intr").each((i, el) => {
        if (i < 5) {
          const headline = $cb(el).text().trim();
          const href = $cb(el).parent().attr("href");
          const link = href ? "https://www.cricbuzz.com" + href : "";

          if (headline && link) {
            news.push({
              source: "Cricbuzz",
              headline,
              link,
              summary: "No summary available"
            });
          }
        }
      });
    } catch (err) {
      console.warn("Cricbuzz scraping failed:", err.message);
    }

    if (news.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No cricket news found",
      });
    }

    // ----------------------------
    // 3. Summarize with Gemini
    // ----------------------------
    let summaryText = "";
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const headlinesList = news.map(item => `- ${item.headline} (${item.source})`);
      const summaryPrompt = `Summarize these cricket news headlines into a short daily update:\n${headlinesList.join('\n')}`;

      const summaryResult = await model.generateContent(summaryPrompt);
      summaryText = summaryResult.response.text();
    } catch (err) {
      console.warn("Gemini summarization failed:", err.message);
    }

    // ----------------------------
    // 4. Send Email (if env set)
    // ----------------------------
    let emailSent = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // ⚠️ Must be Gmail App Password
          },
        });

        await transporter.sendMail({
          from: `"Cricket Bot" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_TO,
          subject: "Daily Cricket Report 🏏",
          html: `
            <h2>Daily Cricket Report 🏏</h2>
            <h3>AI Summary:</h3>
            <p>${summaryText || "Summary unavailable"}</p>
            <h3>Latest Headlines:</h3>
            <ul>
              ${news.map(item =>
                `<li><strong>${item.headline}</strong><br>
                 <em>Source: ${item.source}</em><br>
                 <a href="${item.link}" target="_blank">Read more</a></li>`
              ).join('')}
            </ul>
          `,
        });

        emailSent = true;
      } catch (err) {
        console.error("Email send failed:", err.message);
      }
    }

    // ----------------------------
    // 5. Final Response
    // ----------------------------
    res.status(200).json({
      success: true,
      count: news.length,
      news,
      summary: summaryText,
      emailSent,
    });

  } catch (error) {
    console.error("Cricket report failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
