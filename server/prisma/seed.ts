import bcrypt from "bcrypt";
import prisma from "../src/prisma/client.js";

async function seedRoles() {
  console.log("🌱 Seeding roles...");

  const roles = ["Admin", "Cashier", "Kitchen"];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });
  }

  console.log("✅ Roles seeded.");
}

async function seedAdmin() {
  console.log("👤 Seeding admin user...");

  const adminRole = await prisma.role.findUnique({
    where: { name: "Admin" },
  });

  if (!adminRole) {
    throw new Error("Admin role not found. Seed roles first.");
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullName: "Administrator",
      username: "admin",
      email: "admin@restaurant.com",
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log("✅ Admin user seeded.");
}

async function main() {
  console.log("🚀 Starting database seeding (Roles & Admin)...\n");

  await seedRoles();
  await seedAdmin();

  console.log("\n🎉 Database seeding completed successfully.");
}

main()
  .catch(async (error) => {
    console.error("\n❌ Seeding failed:");
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
