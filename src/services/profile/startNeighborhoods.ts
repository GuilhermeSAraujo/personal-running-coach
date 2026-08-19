import { dbConnect } from "@/lib/db";
import { Activity } from "@/models";
import { Types } from "mongoose";

export type StartNeighborhoodCount = {
  name: string;
  count: number;
};

export function mapNeighborhoodCounts(
  rows: { _id: unknown; count: unknown }[],
): StartNeighborhoodCount[] {
  const mapped: StartNeighborhoodCount[] = [];
  for (const row of rows) {
    if (typeof row._id !== "string") continue;
    const name = row._id.trim();
    if (!name) continue;
    if (
      typeof row.count !== "number" ||
      !Number.isFinite(row.count) ||
      row.count <= 0
    ) {
      continue;
    }
    mapped.push({ name, count: row.count });
  }
  mapped.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
  return mapped;
}

export async function listStartNeighborhoods(
  userId: Types.ObjectId | string,
): Promise<StartNeighborhoodCount[]> {
  await dbConnect();
  const id = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const rows = await Activity.aggregate<{ _id: unknown; count: unknown }>([
    {
      $match: {
        userId: id,
        type: "run",
        "raw.start_neighborhood": { $type: "string" },
      },
    },
    {
      $group: {
        _id: "$raw.start_neighborhood",
        count: { $sum: 1 },
      },
    },
  ]);
  return mapNeighborhoodCounts(rows);
}

