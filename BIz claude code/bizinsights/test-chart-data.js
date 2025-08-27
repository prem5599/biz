const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testChartLogic() {
  try {
    // Get the actual data
    const dataPoints = await prisma.dataPoint.findMany({
      where: { metricType: { in: ['order', 'revenue', 'orders'] } },
      orderBy: { dateRecorded: 'asc' }
    });
    
    console.log('=== ORIGINAL DATA ===');
    dataPoints.forEach(dp => {
      console.log(`${dp.dateRecorded.toISOString().split('T')[0]} - ${dp.metricType}: ${dp.value}`);
    });
    
    // Apply the same logic as the API
    const dataByDate = new Map();
    
    dataPoints.forEach(dp => {
      const date = dp.dateRecorded.toISOString().split('T')[0];
      
      if (!dataByDate.has(date)) {
        dataByDate.set(date, { date, revenue: 0, orders: 0 });
      }
      
      const dayData = dataByDate.get(date);
      
      if (dp.metricType === 'revenue') {
        dayData.revenue += Number(dp.value) || 0;
      } else if (dp.metricType === 'order') {
        dayData.orders = (dayData.orders || 0) + 1;
        dayData.revenue += Number(dp.value) || 0;
      } else if (dp.metricType === 'orders') {
        dayData.orders = Math.floor(Number(dp.value)) || 0;
      }
    });
    
    console.log('\n=== CHART DATA RESULT ===');
    Array.from(dataByDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(d => d.orders > 0 || d.revenue > 0)
      .forEach(d => {
        console.log(`${d.date}: ${d.orders} orders, ₹${d.revenue} revenue`);
      });
      
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChartLogic();