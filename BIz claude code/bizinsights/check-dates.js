const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateMismatch() {
  try {
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        metricType: { in: ['order', 'revenue', 'orders_total'] }
      },
      orderBy: { dateRecorded: 'asc' }
    });
    
    console.log('=== DATE ANALYSIS ===');
    dataPoints.forEach(dp => {
      const date = dp.dateRecorded.toISOString();
      const dateOnly = date.split('T')[0];
      const timeOnly = date.split('T')[1];
      console.log(`${dateOnly} ${timeOnly} - ${dp.metricType}: ${dp.value}`);
    });
    
    console.log('\n=== PROBLEM IDENTIFIED ===');
    console.log('The individual orders have their actual order dates');
    console.log('But there is no matching revenue aggregate for those same dates');
    console.log('The chart tries to match them up but they are on different dates');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDateMismatch();