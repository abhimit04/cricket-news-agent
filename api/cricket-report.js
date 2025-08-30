import axios from "axios";
import * as cheerio from "cheerio"; // ✅ Missing import fixed
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    // ✅ Fixed: Combined both approaches into one coherent function

    // ----------------------------
    // Method 1: Web Scraping Approach
    // ----------------------------
    let news = [];

    try {
      // Cricinfo scraping with timeout
      const cricinfoUrl = "https://www.espncricinfo.com/latest-cricket-news";
      const cricinfoResponse = await axios.get(cricinfoUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ci = cheerio.load(cricinfoResponse.data);
      const cricinfoNews = [];

      $ci(".ds-py-3").each((i, el) => {
        if (i < 5) {
          const headline = $ci(el).find("h2 a").text().trim();
          const href = $ci(el).find("h2 a").attr("href");
          const link = href ? "https://www.espncricinfo.com" + href : "";
          const summary = $ci(el).find("p").text().trim();

          if (headline && link) {
            cricinfoNews.push({
              source: "Cricinfo",
              headline,
              summary: summary || "No summary available",
              link
            });
          }
        }
      });

      news = [...news, ...cricinfoNews];
    } catch (scrapingError) {
      console.warn("Cricinfo scraping failed:", scrapingError.message);
    }

    try {
      // Cricbuzz scraping with timeout
      const cricbuzzUrl = "https://www.cricbuzz.com/cricket-news";
      const cricbuzzResponse = await axios.get(cricbuzzUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $cb = cheerio.load(cricbuzzResponse.data);
      const cricbuzzNews = [];

      $cb(".cb-nws-intr").each((i, el) => {
        if (i < 5) {
          const headline = $cb(el).text().trim();
          const href = $cb(el).parent().attr("href");
          const link = href ? "https://www.cricbuzz.com" + href : "";

          if (headline && link) {
            cricbuzzNews.push({
              source: "Cricbuzz",
              headline,
              link,
              summary: "No summary available"
            });
          }
        }
      });

      news = [...news, ...cricbuzzNews];
    } catch (scrapingError) {
      console.warn("Cricbuzz scraping failed:", scrapingError.message);
    }

    // ----------------------------
    // Method 2: NewsAPI Fallback
    // ----------------------------
    let articles = [];

    if (process.env.NEWS_API_KEY) {
      try {
        const newsApiResponse = await axios.get(
          `https://newsapi.org/v2/everything`,
          {
            params: {
              q: 'cricket',
              language: 'en',
              sortBy: 'publishedAt',
              pageSize: 5,
              apiKey: process.env.NEWS_API_KEY
            },
            timeout: 8000
          }
        );

        articles = newsApiResponse.data.articles.map(article => ({
          source: article.source.name,
          headline: article.title,
          summary: article.description || "No summary available",
          link: article.url
        }));

        // Add NewsAPI articles to news array
        news = [...news, ...articles];
      } catch (newsApiError) {
        console.warn("NewsAPI failed:", newsApiError.message);
      }
    }

    // If we have news, process and send email
    if (news.length > 0 && process.env.GOOGLE_AI_API_KEY) {
      try {
        // Create summary using Gemini
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "Gemini 2.5-flash" });

        const headlinesList = news.map(item => `- ${item.headline} (${item.source})`);
        const summaryPrompt = `Summarize these cricket news headlines into a short daily update:\n${headlinesList.join('\n')}`;

        const summaryResult = await model.generateContent(summaryPrompt);
        const summaryText = summaryResult.response.text();

        // Send email if configured
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO) {
          const transporter = nodemailer.createTransporter({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          await transporter.sendMail({
            from: `"Cricket Bot" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_TO,
            subject: "Daily Cricket Report 🏏",
            html: `
              <h2>Daily Cricket Report 🏏</h2>
              <h3>AI Summary:</h3>
              <p>${summaryText}</p>
              <h3>Latest Headlines:</h3>
              <ul>
                ${news.map(item =>
                  `<li><strong>${item.headline}</strong><br>
                   <em>Source: ${item.source}</em><br>
                   <a href="${item.link}" target="_blank">Read more</a></li>`
                ).join('')}
              </ul>
            `,
            text: `${summaryText}\n\nHeadlines:\n${headlinesList.join('\n')}`
          });
        }

        res.status(200).json({
          success: true,
          count: news.length,
          news,
          summary: summaryText,
          emailSent: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO)
        });

      } catch (processingError) {
        console.error("Processing error:", processingError);
        // Still return the news even if processing fails
        res.status(200).json({
          success: true,
          count: news.length,
          news,
          error: "Processing failed but news retrieved"
        });
      }
    } else {
      // No news found
      res.status(200).json({
        success: false,
        count: 0,
        message: "No cricket news found",
        news: []
      });
    }

  } catch (error) {
    console.error("Cricket report failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}