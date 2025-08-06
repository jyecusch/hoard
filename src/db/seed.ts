import "dotenv/config";
// import { database } from "./index";

async function main() {}

// async function seed() {
//     console.log("Seeding database...");
// }

main()
    .then(() => {
        console.log("Seeding completed successfully.");
    })
    .catch((error) => {
        console.error("Seeding failed:", error);
        process.exit(1);
    });