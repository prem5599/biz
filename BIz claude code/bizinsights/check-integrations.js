const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkIntegrations() {
  try {
    const integrations = await prisma.integration.findMany({
      include: {
        organization: true
      }
    });
    
    console.log("=== INTEGRATION STATUS ===");
    console.log("Total integrations found:", integrations.length);
    
    integrations.forEach(integration => {
      console.log("\n--- Integration Details ---");
      console.log("ID:", integration.id);
      console.log("Platform:", integration.platform);
      console.log("Status:", integration.status);
      console.log("Organization:", integration.organization.name);
      console.log("Created:", integration.createdAt);
      console.log("Last Sync:", integration.lastSyncAt);
      console.log("Has Access Token:", integration.accessToken ? "Yes" : "No");
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegrations();
