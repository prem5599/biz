const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDemoData() {
  try {
    console.log('=== REMOVING DEMO DATA ===');
    
    // Find the organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('No organization found');
      return;
    }
    
    console.log('Organization:', org.name);
    
    // Remove demo data (the data we added with 'daily_data' source)
    // First, let's just remove all recent data points that are demo data
    const allData = await prisma.dataPoint.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' }
    });
    
    const demoData = allData.filter(dp => 
      dp.metadata && 
      typeof dp.metadata === 'object' && 
      dp.metadata.source === 'daily_data'
    );
    
    console.log('Demo data points found:', demoData.length);
    
    if (demoData.length > 0) {
      for (const item of demoData) {
        await prisma.dataPoint.delete({
          where: { id: item.id }
        });
      }
      console.log('✅ Removed', demoData.length, 'demo data points');
    }
    
    // Check what real Shopify data remains
    const remainingData = await prisma.dataPoint.findMany({
      where: { organizationId: org.id },
      orderBy: { dateRecorded: 'desc' }
    });
    
    const shopifyData = remainingData.filter(dp => 
      dp.metadata && 
      typeof dp.metadata === 'object' && 
      dp.metadata.source && 
      dp.metadata.source.includes('shopify')
    );
    
    console.log('\n=== REMAINING SHOPIFY DATA ===');
    console.log('Real Shopify data points:', shopifyData.length);
    
    shopifyData.forEach(dp => {
      console.log(`${dp.dateRecorded.toISOString().split('T')[0]} - ${dp.metricType}: ${dp.value}`);
    });
    
    console.log('\n=== NOW TRIGGER A FRESH SHOPIFY SYNC ===');
    console.log('Go to /dashboard/integrations and click "Sync Now" on Shopify');
    console.log('This will fetch your latest orders and revenue data');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDemoData();