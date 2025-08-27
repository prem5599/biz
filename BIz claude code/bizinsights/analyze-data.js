const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function analyzeShopifyData() {
  try {
    const dataPoints = await prisma.dataPoint.findMany({
      orderBy: { dateRecorded: "desc" }
    });
    
    console.log("=== ALL CURRENT DATA ===");
    dataPoints.forEach(dp => {
      console.log(`${dp.dateRecorded.toISOString().split("T")[0]} - ${dp.metricType}: ${dp.value}`);
    });
    
    console.log("\n=== MISSING DATA FOR CHARTS ===");
    console.log("❌ No revenue metric found");
    console.log("❌ No individual order entries found");
    console.log("\n✅ You need to re-sync Shopify to get:");
    console.log("- Individual order entries (metricType: order)");
    console.log("- Revenue total (metricType: revenue)");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeShopifyData();
