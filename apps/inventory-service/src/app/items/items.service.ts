import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, InventoryItem, Prisma } from '@card-hive/shared-database';
import { GetInventoryItemsQueryParams, UpdateInventoryItemRequest } from '@card-hive/shared-types';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async listInventoryItems(query: GetInventoryItemsQueryParams, userID: string) {
    const {
      location,
      page = 1,
      limit = 20,
      order = 'desc',
    } = query;

    const where: Prisma.InventoryItemWhereInput = {
      userID
    };
    
    if (location) {
      where.location = location;
    }

    return this.prisma.paginate<InventoryItem>(this.prisma.inventoryItem, {
      page,
      limit,
      where,
      orderBy: { acquiredAt: order },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            sportType: true,
            rarity: true,
            serialNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getInventoryItem(id: string, userID: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id, userID },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            sportType: true,
            rarity: true,
            serialNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return item;
  }

  async updateInventoryItem(id: string, dto: UpdateInventoryItemRequest, userID: string) {
    await this.ensureItemExists(id, userID);

    const data: Prisma.InventoryItemUpdateInput = {};
    if (dto.location) {
      data.location = dto.location;
    }
    if (dto.acquiredAt) {
      data.acquiredAt = new Date(dto.acquiredAt);
    }
    if (dto.shippedAt) {
      data.shippedAt = new Date(dto.shippedAt);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one value must be provided to update the inventory item');
    }

    return this.prisma.inventoryItem.update({
      where: { id, userID },
      data,
    });
  }

  private async ensureItemExists(id: string, userID: string) {
    const exists = await this.prisma.inventoryItem.findUnique({ where: { id, userID }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Inventory item not found');
    }
  }
}
