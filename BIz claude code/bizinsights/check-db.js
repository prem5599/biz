const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Check orders_total
    const ordersTotal = await prisma.dataPoint.findMany({
      where: { metricType: 'orders_total' }
    });
    console.log('orders_total points:', ordersTotal.length);
    ordersTotal.forEach(dp => {
      console.log('orders_total value:', dp.value, 'date:', dp.dateRecorded.toISOString().split('T')[0]);
    });
    
    // Check individual orders
    const individualOrders = await prisma.dataPoint.findMany({
      where: { metricType: 'order' },
      orderBy: { dateRecorded: 'asc' }
    });
    console.log('\nindividual order points:', individualOrders.length);
    individualOrders.forEach(dp => {
      console.log('Date:', dp.dateRecorded.toISOString().split('T')[0], 'Order value:', dp.value);
    });
    
    // What the current dashboard would calculate
    console.log('\n--- Dashboard Calculation Logic ---');
    if (ordersTotal.length > 0) {
      const latestTotal = ordersTotal[ordersTotal.length - 1];
      console.log('Dashboard would show total orders:', latestTotal.value);
    }
    
    if (individualOrders.length > 0) {
      console.log('Individual orders count:', individualOrders.length);
      const sumOfIndividual = individualOrders.reduce((sum, dp) => sum + Number(dp.value), 0);
      console.log('Sum of individual order values:', sumOfIndividual);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();