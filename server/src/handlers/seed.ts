import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const seedDatabase = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Starting database seeding...');

    // Admin user data
    const adminEmail = 'admin@demo.com';
    const adminPassword = 'demo123'; // In a real app, this should be hashed
    const adminFirstName = 'Admin';
    const adminLastName = 'User';

    // Client user data
    const clientEmail = 'client@demo.com';
    const clientPassword = 'demo123'; // In a real app, this should be hashed
    const clientFirstName = 'Demo';
    const clientLastName = 'Client';
    const clientCompanyName = 'Demo Logistics Inc.';
    const clientPhone = '1-800-DEMO-LOG';
    const clientAddress = '123 Demo St, Demo City, DC 00000';

    let createdUsers = 0;

    // Check and create admin user
    const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).execute();
    if (existingAdmin.length === 0) {
      console.log(`Creating admin user: ${adminEmail}`);
      await db.insert(usersTable).values({
        email: adminEmail,
        password_hash: `hashed_${adminPassword}`, // Simulate hashing
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'admin',
        is_active: true,
      }).execute();
      console.log('Admin user created successfully.');
      createdUsers++;
    } else {
      console.log(`Admin user ${adminEmail} already exists.`);
    }

    // Check and create client user
    const existingClient = await db.select().from(usersTable).where(eq(usersTable.email, clientEmail)).execute();
    if (existingClient.length === 0) {
      console.log(`Creating client user: ${clientEmail}`);
      await db.insert(usersTable).values({
        email: clientEmail,
        password_hash: `hashed_${clientPassword}`, // Simulate hashing
        first_name: clientFirstName,
        last_name: clientLastName,
        role: 'client',
        company_name: clientCompanyName,
        phone: clientPhone,
        address: clientAddress,
        is_active: true,
      }).execute();
      console.log('Client user created successfully.');
      createdUsers++;
    } else {
      console.log(`Client user ${clientEmail} already exists.`);
    }

    console.log('Database seeding complete.');
    
    return {
      success: true,
      message: `Database seeding completed. Created ${createdUsers} new users.`
    };
  } catch (error) {
    console.error('Database seeding failed:', error);
    return {
      success: false,
      message: `Database seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};