# 🏏 Cricket News Agent

An AI-powered agent that pulls the latest cricket news from **Cricinfo**, **Cricbuzz**, and optionally **NewsAPI**, summarizes it using **Google Gemini**, and emails a daily digest in bullet points.

---

## 🚀 Features
- ✅ Scrapes news from Cricinfo & Cricbuzz  
- ✅ Falls back to NewsAPI if scraping fails  
- ✅ Summarizes headlines with **Google Generative AI (Gemini)**  
- ✅ Sends formatted daily digest via email (Gmail SMTP by default)  
- ✅ Deployable as a **Vercel Serverless Function**  

---


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repo
```bash
git clone https://github.com/abhimit04/cricket-news-agent.git
cd cricket-news-agent

2️⃣ Install dependencies
npm install

3️⃣ Create .env file
GOOGLE_AI_API_KEY=your_google_ai_api_key
NEWS_API_KEY=your_newsapi_key   # optional
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password 
EMAIL_TO=recipient@example.com

⚠️ If using Gmail, generate an App Password (not your Gmail login password).
Follow: https://support.google.com/accounts/answer/185833

☁️ Deployment (Vercel)

Push your repo to GitHub/GitLab/Bitbucket.

Connect repo in Vercel Dashboard
.

Add environment variables (.env values) in Vercel Project Settings → Environment Variables.

Deploy 🚀

Email Output

AI Summary in bullet points

Headlines with links to sources

Clean HTML & text fallback

Tech Stack

Node.js 20+

Axios → Fetch news data

Cheerio → Web scraping

Google Generative AI (Gemini) → Summarization

Nodemailer → Email sending

Vercel Serverless Functions → Deployment

Feel free to contribute or raise issues!

  
