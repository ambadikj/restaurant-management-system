import prisma from "../src/prisma/client.js";

async function clearData() {
  console.log("🧹 Clearing all seeded data except Roles and Admin user...\n");

  try {
    // 1. Delete operational records (orders, payments, sessions)
    console.log("Deleting Order Items...");
    await prisma.orderItem.deleteMany({});

    console.log("Deleting Orders...");
    await prisma.order.deleteMany({});

    console.log("Deleting Payments...");
    await prisma.payment.deleteMany({});

    console.log("Deleting Dining Sessions...");
    await prisma.diningSession.deleteMany({});

    // 2. Delete menu & inventory
    console.log("Deleting Inventory records...");
    await prisma.inventory.deleteMany({});

    console.log("Deleting Menu Items...");
    await prisma.menuItem.deleteMany({});

    console.log("Deleting Categories...");
    await prisma.category.deleteMany({});

    // 3. Delete restaurant tables
    console.log("Deleting Restaurant Tables...");
    await prisma.restaurantTable.deleteMany({});

    // 4. Delete non-admin users
    console.log("Deleting non-admin users...");
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        username: {
          not: "admin",
        },
      },
    });
    console.log(`Removed ${deletedUsers.count} non-admin user(s).`);

    console.log("\n✅ All data removed successfully! Only Roles and the Admin user remain.");
  } catch (error) {
    console.error("❌ Error during clear operation:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
