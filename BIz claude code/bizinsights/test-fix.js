const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copy the fixed prepareChartData logic
function prepareChartData(dataPoints) {
  const dataByDate = new Map()
  
  // Check if we have both individual orders and revenue aggregates
  const hasRevenueAggregate = dataPoints.some(dp => dp.metricType === 'revenue')
  const hasIndividualOrders = dataPoints.some(dp => dp.metricType === 'order')
  
  console.log(`📊 Chart data preparation: hasRevenueAggregate=${hasRevenueAggregate}, hasIndividualOrders=${hasIndividualOrders}`)
  
  // Process all data points and group by date
  dataPoints.forEach(dp => {
    const date = dp.dateRecorded.toISOString().split('T')[0]
    
    if (!dataByDate.has(date)) {
      dataByDate.set(date, { date, revenue: 0, orders: 0 })
    }
    
    const dayData = dataByDate.get(date)
    
    if (dp.metricType === 'revenue') {
      // Only use revenue aggregates if we don't have individual orders to avoid double counting
      if (!hasIndividualOrders) {
        dayData.revenue += Number(dp.value) || 0
        console.log(`📅 Using revenue aggregate on ${date}: ₹${dp.value}`)
      } else {
        console.log(`📅 Skipping revenue aggregate on ${date} (have individual orders): ₹${dp.value}`)
      }
    } else if (dp.metricType === 'order') {
      // For individual Shopify orders, count them AND add their revenue
      dayData.orders = (dayData.orders || 0) + 1
      dayData.revenue += Number(dp.value) || 0
      console.log(`📅 Order on ${date}: ₹${dp.value} - Day total now: ${dayData.orders} orders, ₹${dayData.revenue} revenue`)
    } else if (dp.metricType === 'orders') {
      // For seeded orders data (daily count)
      dayData.orders = Math.floor(Number(dp.value)) || 0
    }
  })
  
  return Array.from(dataByDate.values())
}

async function testFix() {
  const dataPoints = await prisma.dataPoint.findMany({
    where: { metricType: { in: ['order', 'revenue', 'orders'] } },
    orderBy: { dateRecorded: 'asc' }
  });
  
  console.log('=== TESTING FIXED CHART CALCULATION ===');
  const chartData = prepareChartData(dataPoints);
  
  const chartTotal = chartData.reduce((sum, d) => sum + d.revenue, 0);
  console.log('\n📊 Fixed chart total revenue:', chartTotal);
  
  // Compare with metric cards calculation
  const revenuePoints = dataPoints.filter(dp => dp.metricType === 'revenue');
  const individualOrders = dataPoints.filter(dp => dp.metricType === 'order');
  
  let cardRevenue = 0;
  if (revenuePoints.length > 0) {
    const latestRevenuePoint = revenuePoints.sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime())[0];
    cardRevenue = Number(latestRevenuePoint.value) || 0;
  } else {
    cardRevenue = individualOrders.reduce((sum, order) => sum + Number(order.value), 0);
  }
  
  console.log('💳 Metric cards revenue:', cardRevenue);
  console.log('🎯 Match?', chartTotal === cardRevenue ? '✅ YES' : '❌ NO');
  
  await prisma.$disconnect();
}

testFix();