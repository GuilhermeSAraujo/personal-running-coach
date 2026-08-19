import { dbConnect } from "@/lib/db";
import { Activity } from "@/models";
import { lookupStartNeighborhood } from "@/services/geo/nominatim";
import { readStartLatLngFromRaw } from "@/services/geo/startNeighborhood";
import mongoose from "mongoose";

const DELAY_MIN_MS = 1100;
const DELAY_MAX_MS = 2900;

function randomDelayMs(): number {
  return (
    DELAY_MIN_MS + Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Starting backfill for start neighborhood...");
  await dbConnect();

  console.log("Connected to database");

  const activities = await Activity.find({
    "raw.start_latlng": { $exists: true },
    "raw.start_neighborhood": { $exists: false },
  })
    .select("_id raw")
    .lean();

  console.log(`Found ${activities.length} activities missing start_neighborhood`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < activities.length; i++) {
    const doc = activities[i];
    const remaining = activities.length - i - 1;
    const coords = readStartLatLngFromRaw(doc.raw);
    if (!coords) {
      skipped += 1;
      console.log(
        `updated=${updated} skipped=${skipped} failed=${failed} remaining=${remaining}`,
      );
      continue;
    }

    try {
      const name = await lookupStartNeighborhood(coords.lat, coords.lon);
      if (!name) {
        skipped += 1;
      } else {
        await Activity.updateOne(
          { _id: doc._id },
          { $set: { "raw.start_neighborhood": name } },
        );
        updated += 1;
      }
    } catch (error) {
      failed += 1;
      console.error("Failed to backfill start neighborhood:", error);
    }

    console.log(
      `updated=${updated} skipped=${skipped} failed=${failed} remaining=${remaining}`,
    );

    if (i < activities.length - 1) {
      await sleep(randomDelayMs());
    }
  }

  console.log(
    `Done. updated=${updated} skipped=${skipped} failed=${failed}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
