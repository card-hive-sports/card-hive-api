import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { inventoryConfig } from './config/inventory.config';
import { AuthGuard, SharedAuthModule } from '@card-hive/shared-auth';
import { SharedDatabaseModule } from '@card-hive/shared-database';
import { PacksModule } from './packs/packs.module';
import { CardsModule } from './cards/cards.module';
import { ItemsModule } from './items/items.module';
import { APP_GUARD } from '@nestjs/core';

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
    PacksModule,
    CardsModule,
    ItemsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }
  ]
})
export class InventoryModule {}
