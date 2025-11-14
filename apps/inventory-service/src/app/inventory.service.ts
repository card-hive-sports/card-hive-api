import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
