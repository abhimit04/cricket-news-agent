import axios from "axios";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
  const cricinfoUrl = "https://www.espncricinfo.com/latest-cricket-news";
      const { data: cricinfoHtml } = await axios.get(cricinfoUrl);
      const $ci = cheerio.load(cricinfoHtml);

      const cricinfoNews = [];
      $ci(".ds-py-3").each((i, el) => {
        if (i < 5) {
          const headline = $ci(el).find("h2 a").text().trim();
          const link =
            "https://www.espncricinfo.com" + $ci(el).find("h2 a").attr("href");
          const summary = $ci(el).find("p").text().trim();
          cricinfoNews.push({ source: "Cricinfo", headline, summary, link });
        }
      });

      // ----------------------------
      // Cricbuzz Latest News
      // ---------------------------- Cricket is life and xxyz
      const cricbuzzUrl = "https://www.cricbuzz.com/cricket-news";
      const { data: cricbuzzHtml } = await axios.get(cricbuzzUrl);
      const $cb = cheerio.load(cricbuzzHtml);

      const cricbuzzNews = [];
      $cb(".cb-nws-intr").each((i, el) => {
        if (i < 5) {
          const headline = $cb(el).text().trim();
          const link =
            "https://www.cricbuzz.com" +
            $cb(el).parent().attr("href"); // parent <a> link
          cricbuzzNews.push({ source: "Cricbuzz", headline, link });
        }
      });

      // Combine both
      const news = [...cricinfoNews, ...cricbuzzNews];

      res.status(200).json({ success: true, count: news.length, news });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
    // 🔑 NewsAPI call for cricket news
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=cricket&language=en&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
    );

    const articles = response.data.articles.map(
      (a) => `- ${a.title} (${a.source.name})`
    );

    // Summarize using Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const summaryPrompt = `Summarize these cricket news headlines into a short daily update:\n${articles.join(
      "\n"
    )}`;
    const summary = await model.generateContent(summaryPrompt);

    // Send email via Nodemailer
    const transporter = nodemailer.createTransport({
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
      text: summary.response.text(),
    });

    res.status(200).json({ success: true, articles });
  } catch (err) {
    console.error("Cricket report failed:", err);
    res.status(500).json({ error: err.message });
  }
}
