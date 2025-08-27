const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugAPI() {
  try {
    // Simulate exactly what the API does
    const org = await prisma.organization.findFirst();
    
    const dataPoints = await prisma.dataPoint.findMany({
      where: { organizationId: org.id },
      orderBy: { dateRecorded: "asc" }
    });
    
    console.log("=== RAW DATA POINTS ===");
    dataPoints.forEach(dp => {
      if (dp.metricType === "order") {
        console.log(`${dp.dateRecorded.toISOString().split("T")[0]} - ORDER: ₹${dp.value}`);
      }
    });
    
    // Simulate the prepareChartData function
    const dataByDate = new Map();
    
    dataPoints.forEach(dp => {
      const date = dp.dateRecorded.toISOString().split("T")[0];
      
      if (\!dataByDate.has(date)) {
        dataByDate.set(date, { date, revenue: 0, orders: 0 });
      }
      
      const dayData = dataByDate.get(date);
      
      if (dp.metricType === "order") {
        dayData.orders = (dayData.orders || 0) + 1;
        dayData.revenue += Number(dp.value) || 0;
        console.log(`Processing order on ${date}: +₹${dp.value} -> Total: ${dayData.orders} orders, ₹${dayData.revenue}`);
      }
    });
    
    console.log("\n=== FINAL CHART DATA ===");
    const chartData = Array.from(dataByDate.values())
      .filter(d => d.orders > 0 || d.revenue > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    chartData.forEach(d => {
      console.log(`${d.date}: ${d.orders} orders, ₹${d.revenue} revenue`);
    });
    
    console.log("\nThis is EXACTLY what should appear in your chart:");
    chartData.forEach(d => {
      console.log(`${d.date}: Blue bar at ₹${d.revenue}, Green line at ${d.orders}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAPI();
