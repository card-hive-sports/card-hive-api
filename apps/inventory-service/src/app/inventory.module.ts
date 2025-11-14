import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ConfigModule } from '@nestjs/config';
import { inventoryConfig } from './config/inventory.config';
import { SharedAuthModule } from "@card-hive/shared-auth";
import { SharedDatabaseModule } from "@card-hive/shared-database";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [inventoryConfig],
      cache: true,
      expandVariables: true,
    }),
    SharedAuthModule,
    SharedDatabaseModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
