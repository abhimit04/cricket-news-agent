require('dotenv').config();
const CricketNewsAgent = require('./cricket-agent');

async function testCrawl() {
  console.log('🧪 Testing cricket news crawling...\n');
  
  const agent = new CricketNewsAgent();
  
  try {
    // Test individual sources
    console.log('Testing Cricinfo crawl...');
    const cricinfoNews = await agent.crawlCricinfo();
    console.log(`✅ Cricinfo: ${cricinfoNews.length} articles\n`);
    
    console.log('Testing Cricbuzz crawl...');
    const cricbuzzNews = await agent.crawlCricbuzz();
    console.log(`✅ Cricbuzz: ${cricbuzzNews.length} articles\n`);
    
    console.log('Testing RSS feeds...');
    const rssNews = await agent.crawlRSSFeeds();
    console.log(`✅ RSS Feeds: ${rssNews.length} articles\n`);
    
    // Test full report generation
    console.log('Testing full report generation...');
    const allNews = await agent.getAllCricketNews();
    console.log(`📰 Total articles found: ${allNews.length}\n`);
    
    if (allNews.length > 0) {
      console.log('Sample articles:');
      allNews.slice(0, 3).forEach((article, index) => {
        console.log(`${index + 1}. ${article.title} (${article.source})`);
      });
      
      console.log('\n🤖 Generating AI report...');
      const report = await agent.generateCricketReport(allNews.slice(0, 5));
      console.log('✅ Report generated successfully!');
      console.log('\n📊 Report preview:');
      console.log(report.substring(0, 500) + '...\n');
    }
    
    console.log('✅ All tests passed! Ready to run daily reports.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testCrawl();