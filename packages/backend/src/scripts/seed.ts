#!/usr/bin/env tsx
import {
  db,
  testDatabaseConnection,
  closeDatabaseConnection,
} from "@/config/database";
import {
  users,
  documents,
  comments,
  highlights,
  sessions,
  playbooks,
  type NewUser,
  type NewDocument,
  type NewSession,
} from "@/db/schema/index";
import { logger } from "@/config/logger";
import { env } from "@/config/env";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

async function seed() {
  try {
    logger.info("🌱 Starting database seeding...");

    // Test connection
    const connected = await testDatabaseConnection();
    if (!connected) {
      throw new Error("Database connection failed");
    }

    // Create test users
    const password = await bcrypt.hash("password123", 12);

    const testUsers: NewUser[] = [
      {
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: password,
      },
      {
        email: "user@example.com",
        name: "Test User",
        passwordHash: password,
      },
    ];

    const insertedUsers = await db.insert(users).values(testUsers).returning();

    logger.info(`Created ${insertedUsers.length} users`);

    // Create sessions and generate development tokens
    const adminUser = insertedUsers.find(
      (u) => u.email === "admin@example.com"
    );
    const testUser = insertedUsers.find((u) => u.email === "user@example.com");

    if (adminUser) {
      // Create session for admin user
      const sessionToken = nanoid(64);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for development

      const adminSession: NewSession = {
        userId: adminUser.id,
        token: sessionToken,
        expiresAt,
        metadata: { purpose: "development", createdBy: "seed-script" },
      };

      const [session] = await db
        .insert(sessions)
        .values(adminSession)
        .returning();

      // Generate JWT for development use
      const devToken = jwt.sign(
        { userId: adminUser.id, sessionId: session.id },
        env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      logger.info("🔑 Development auth token created for admin user");
      logger.info(`   Token: ${devToken}`);
    }

    // Create test documents
    const testDocuments: NewDocument[] = [
      {
        userId: insertedUsers[0].id,
        title: "Welcome Document",
        content: "This is a sample document for testing the Office Add-in API.",
        metadata: { tags: ["welcome", "sample"] },
      },
      {
        userId: insertedUsers[1].id,
        title: "User Guide",
        content: "How to use the Office Add-in effectively.",
        metadata: { tags: ["guide", "help"] },
      },
    ];

    const insertedDocuments = await db
      .insert(documents)
      .values(testDocuments)
      .returning();

    logger.info(`Created ${insertedDocuments.length} documents`);

    // Seed playbooks from playbook.json (optional - skip if file not found)
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { fileURLToPath } = await import("url");
      
      // Fix Windows path handling
      const currentFilePath = fileURLToPath(import.meta.url);
      const currentDir = path.dirname(currentFilePath);
      const playbookPath = path.resolve(
        currentDir,
        "../../../frontend/src/taskpane/pages/RulesPage/components/playbook.json"
      );
      
      const playbookFile = await fs.readFile(playbookPath, "utf-8");
      const playbooksData = JSON.parse(playbookFile);
      
      if (insertedUsers && insertedUsers.length > 0) {
        for (const playbook of playbooksData) {
          await db.insert(playbooks).values({
            userId: insertedUsers[0].id, // assign to admin user
            playbookName: playbook.playbookName,
            description: playbook.description,
            playbookType: playbook.playbookType,
            userPosition: playbook.userPosition,
            jurisdiction: playbook.jurisdiction,
            tags: playbook.tags,
            rules: playbook.rules,
            isActive: true,
            metadata: {},
            createdAt: new Date(playbook.savedAt),
            updatedAt: new Date(playbook.savedAt),
          });
        }
        logger.info(`Seeded ${playbooksData.length} playbooks`);
      } else {
        logger.warn("No users found, skipping playbook seeding.");
      }
    } catch (error) {
      logger.warn({ error }, "⚠️ Playbook seeding skipped (file not found or invalid)");
    }
    logger.info("✅ Database seeding completed successfully");

    // Log seed data for testing
    logger.info("📋 Test credentials:");
    logger.info("   Admin: admin@example.com / password123");
    logger.info("   User: user@example.com / password123");
    logger.info("");
    logger.info(
      "💡 For API testing, use the JWT token shown above in the Authorization header:"
    );
    logger.info("   Authorization: Bearer <token>");
    logger.info("");
    logger.info("🚀 Ready for development!");
  } catch (error) {
    logger.error({ error }, "❌ Database seeding failed");
    throw error;
  } finally {
    await closeDatabaseConnection();
  }
}

// Run seed function directly
seed().catch((error) => {
  console.error("Seed script failed:", error);
  logger.error({ error }, "Seed script failed");
  process.exit(1);
});
