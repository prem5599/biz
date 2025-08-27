const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugRevenueMismatch() {
  try {
    // Get individual orders (what metric cards use)
    const orders = await prisma.dataPoint.findMany({
      where: { metricType: "order" },
      orderBy: { dateRecorded: "asc" }
    });
    
    console.log("=== INDIVIDUAL ORDERS (METRIC CARDS USE) ===");
    let metricCardTotal = 0;
    orders.forEach(order => {
      console.log(`${order.dateRecorded.toISOString().split("T")[0]}: ₹${order.value}`);
      metricCardTotal += Number(order.value);
    });
    console.log(`METRIC CARD TOTAL: ₹${metricCardTotal}`);
    
    // Simulate what chart receives (after API processing)
    const dataByDate = new Map();
    orders.forEach(dp => {
      const date = dp.dateRecorded.toISOString().split("T")[0];
      if (\!dataByDate.has(date)) {
        dataByDate.set(date, { date, revenue: 0, orders: 0 });
      }
      const dayData = dataByDate.get(date);
      dayData.orders += 1;
      dayData.revenue += Number(dp.value);
    });
    
    console.log("\n=== CHART DATA (WHAT CHART RECEIVES) ===");
    let chartTotal = 0;
    Array.from(dataByDate.values()).forEach(day => {
      console.log(`${day.date}: ₹${day.revenue} revenue, ${day.orders} orders`);
      chartTotal += day.revenue;
    });
    console.log(`CHART TOTAL: ₹${chartTotal}`);
    
    if (metricCardTotal === chartTotal) {
      console.log("\n✅ TOTALS MATCH\!");
    } else {
      console.log(`\n❌ MISMATCH: Metric Cards: ₹${metricCardTotal}, Chart: ₹${chartTotal}`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRevenueMismatch();
