const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDailyData() {
  try {
    console.log('Adding daily revenue and orders data...');
    
    // Get any organization ID
    const orgs = await prisma.organization.findMany();
    console.log('Organizations found:', orgs.length);
    orgs.forEach(org => {
      console.log('ID:', org.id, 'Name:', org.name, 'Slug:', org.slug);
    });
    
    const org = orgs[0];
    if (!org) {
      console.error('No organizations found');
      return;
    }
    
    console.log('Found organization:', org.id);
    
    // Get existing integration
    const integration = await prisma.integration.findFirst({
      where: { organizationId: org.id }
    });
    
    if (!integration) {
      console.error('No integrations found for organization');
      return;
    }
    
    console.log('Using integration:', integration.id);
    
    // Clear existing revenue and orders data to avoid duplicates
    await prisma.dataPoint.deleteMany({
      where: {
        organizationId: org.id,
        metricType: { in: ['revenue', 'orders'] }
      }
    });
    
    console.log('Cleared existing revenue and orders data');
    
    // Add daily data for the last 30 days
    const dataPoints = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Generate realistic data with some trends and randomness
      const baseRevenue = 1500 + Math.sin(i * 0.1) * 300 + (29 - i) * 20;
      const baseOrders = 15 + Math.sin(i * 0.15) * 3 + (29 - i) * 0.5;
      
      const revenue = Math.max(500, baseRevenue + (Math.random() - 0.5) * 400);
      const orders = Math.max(5, Math.floor(baseOrders + (Math.random() - 0.5) * 8));
      
      dataPoints.push({
        organizationId: org.id,
        integrationId: integration.id,
        metricType: 'revenue',
        value: Math.round(revenue * 100) / 100, // Round to 2 decimals
        metadata: { source: 'daily_data' },
        dateRecorded: date,
      });
      
      dataPoints.push({
        organizationId: org.id,
        integrationId: integration.id,
        metricType: 'orders',
        value: orders,
        metadata: { source: 'daily_data' },
        dateRecorded: date,
      });
    }
    
    // Insert all data points
    await prisma.dataPoint.createMany({
      data: dataPoints
    });
    
    console.log(`Added ${dataPoints.length} data points (${dataPoints.length / 2} days of revenue and orders)`);
    
    // Verify the data
    const revenueCount = await prisma.dataPoint.count({
      where: { organizationId: org.id, metricType: 'revenue' }
    });
    
    const ordersCount = await prisma.dataPoint.count({
      where: { organizationId: org.id, metricType: 'orders' }
    });
    
    console.log(`Verification: ${revenueCount} revenue points, ${ordersCount} orders points`);
    
    // Show sample data
    const sampleData = await prisma.dataPoint.findMany({
      where: { organizationId: org.id, metricType: { in: ['revenue', 'orders'] } },
      orderBy: { dateRecorded: 'desc' },
      take: 4
    });
    
    console.log('\nSample data (most recent):');
    sampleData.forEach(dp => {
      console.log(`${dp.dateRecorded.toISOString().split('T')[0]} - ${dp.metricType}: ${dp.value}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDailyData();