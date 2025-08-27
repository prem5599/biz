const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkShopifyData() {
  try {
    const shopifyIntegration = await prisma.integration.findFirst({
      where: { platform: "SHOPIFY" }
    });
    
    if (\!shopifyIntegration) {
      console.log("No Shopify integration found");
      return;
    }
    
    console.log("=== SHOPIFY DATA ANALYSIS ===");
    
    const dataPoints = await prisma.dataPoint.findMany({
      where: { integrationId: shopifyIntegration.id },
      orderBy: { dateRecorded: "desc" }
    });
    
    console.log("Total Shopify data points:", dataPoints.length);
    
    const metricTypes = {};
    dataPoints.forEach(dp => {
      if (\!metricTypes[dp.metricType]) {
        metricTypes[dp.metricType] = 0;
      }
      metricTypes[dp.metricType]++;
    });
    
    console.log("\nMetric types from Shopify:");
    Object.keys(metricTypes).forEach(type => {
      console.log(`${type}: ${metricTypes[type]} points`);
    });
    
    console.log("\nSample Shopify data:");
    dataPoints.slice(0, 5).forEach(dp => {
      console.log(`${dp.dateRecorded.toISOString().split("T")[0]} - ${dp.metricType}: ${dp.value}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShopifyData();
