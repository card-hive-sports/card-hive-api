import { User } from "@card-hive/shared-database";

export type UserWithInventoryCount = User & {
  _count: {
    inventoryItems: number;
  };
};