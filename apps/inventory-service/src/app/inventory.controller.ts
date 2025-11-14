import { Controller, Get } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  getData() {
    return this.inventory.getData();
  }
}
