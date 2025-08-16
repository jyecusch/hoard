const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { drizzle } = require("drizzle-orm/node-postgres");
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const pg = require('pg');

const execAsync = promisify(exec);

async function main() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.error("DATABASE_URL environment variable is required");
        process.exit(1);
    }

    console.log("Connecting to database...");
    const pool = new pg.Pool({
        connectionString: DATABASE_URL,
    });

    const database = drizzle(pool);

    console.log("Running database migrations...");
    await migrate(database, { migrationsFolder: "./drizzle" });
    
    console.log("Generating and deploying Zero permissions...");
    try {
        // Generate permissions SQL
        const { stdout, stderr } = await execAsync(
            'npx zero-deploy-permissions --schema-path="./src/zero/schema.ts" --output-file="/tmp/permissions.sql"', 
            { cwd: '/app' }
        );
        
        if (stderr && !stderr.includes('npm notice')) {
            console.log('Zero permissions generation warnings/errors:', stderr);
        }
        
        // Execute permissions SQL if file exists
        if (fs.existsSync('/tmp/permissions.sql')) {
            const sqlContent = fs.readFileSync('/tmp/permissions.sql', 'utf8');
            console.log('Deploying permissions SQL...');
            
            const client = new pg.Client({ connectionString: DATABASE_URL });
            await client.connect();
            await client.query(sqlContent);
            await client.end();
            
            console.log("Zero permissions deployed successfully!");
        } else {
            console.log("No permissions file generated - skipping permissions deployment");
        }
    } catch (error) {
        console.error("Warning: Failed to deploy Zero permissions:", error.message);
        console.log("Application will continue but Zero sync may not work properly");
    }
    
    console.log("Closing database connection...");
    await pool.end();
}

main()
    .then(() => {
        console.log("Migration completed successfully.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
    });