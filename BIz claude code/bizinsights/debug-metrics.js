const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMetrics() {
  const dataPoints = await prisma.dataPoint.findMany({
    where: { metricType: { in: ['order', 'revenue', 'orders'] } },
    orderBy: { dateRecorded: 'asc' }
  });
  
  console.log('=== METRIC CARDS CALCULATION ===');
  
  // Dashboard metric calculation (from route.ts line 164-176)
  const revenuePoints = dataPoints.filter(dp => dp.metricType === 'revenue');
  const individualOrders = dataPoints.filter(dp => dp.metricType === 'order');
  
  console.log('Revenue points:', revenuePoints.length);
  console.log('Individual orders:', individualOrders.length);
  
  let cardRevenue = 0;
  if (revenuePoints.length > 0) {
    const latestRevenuePoint = revenuePoints.sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime())[0];
    cardRevenue = Number(latestRevenuePoint.value) || 0;
    console.log('Using latest revenue aggregate:', cardRevenue);
  } else {
    cardRevenue = individualOrders.reduce((sum, order) => sum + Number(order.value), 0);
    console.log('Calculating from individual orders:', cardRevenue);
  }
  
  console.log('Metric cards show:', cardRevenue);
  
  console.log('\n=== CHART TOTAL CALCULATION ===');
  // Chart calculation totals all filtered data
  const dataByDate = new Map();
  
  dataPoints.forEach(dp => {
    const date = dp.dateRecorded.toISOString().split('T')[0];
    if (!dataByDate.has(date)) {
      dataByDate.set(date, { date, revenue: 0, orders: 0 });
    }
    const dayData = dataByDate.get(date);
    
    if (dp.metricType === 'order') {
      dayData.orders = (dayData.orders || 0) + 1;
      dayData.revenue += Number(dp.value) || 0;
    } else if (dp.metricType === 'revenue') {
      dayData.revenue += Number(dp.value) || 0;
    }
  });
  
  const chartTotal = Array.from(dataByDate.values()).reduce((sum, d) => sum + d.revenue, 0);
  console.log('Chart shows total:', chartTotal);
  
  console.log('\n=== THE PROBLEM ===');
  console.log('Revenue aggregate point value:', revenuePoints.length > 0 ? revenuePoints[0].value : 'none');
  console.log('Sum of individual orders:', individualOrders.reduce((sum, order) => sum + Number(order.value), 0));
  console.log('Difference:', Math.abs(cardRevenue - chartTotal));
  
  await prisma.$disconnect();
}

debugMetrics();