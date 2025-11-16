import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CardLocation, PrismaService, Prisma, Card } from '@card-hive/shared-database';
import { CreateCardRequest, GetCardsQueryParams, UpdateCardRequest } from '@card-hive/shared-types';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCards(query: GetCardsQueryParams) {
    const {
      packID,
      sportType,
      rarity,
      serialNumber,
      page = 1,
      limit = 20,
      order = 'desc',
    } = query;

    const where: Prisma.CardWhereInput = {};
    if (packID) {
      where.packID = packID;
    }
    if (sportType) {
      where.sportType = sportType;
    }
    if (rarity) {
      where.rarity = rarity;
    }
    if (serialNumber) {
      where.serialNumber = serialNumber;
    }

    return this.prisma.paginate<Card>(this.prisma.card, {
      page,
      limit,
      where,
      orderBy: { createdAt: order },
      include: {
        pack: {
          select: {
            id: true,
            name: true,
            sportType: true,
          },
        },
      },
    });
  }

  async getCard(id: string) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: {
        pack: {
          select: {
            id: true,
            packType: true,
            sportType: true,
          },
        },
      },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    return card;
  }

  async createCard(dto: CreateCardRequest) {
    const location = dto.ownerID ? CardLocation.VAULT : CardLocation.HOUSE;

    return this.prisma.$transaction(async (tx) => {
      const card = await tx.card.create({
        data: {
          pack: { connect: { id: dto.packID } },
          name: dto.name,
          sportType: dto.sportType,
          rarity: dto.rarity,
          serialNumber: dto.serialNumber,
          estimatedValue: dto.estimatedValue ? new Prisma.Decimal(dto.estimatedValue) : undefined,
          description: dto.description,
          playerName: dto.playerName,
          year: dto.year,
          manufacturer: dto.manufacturer,
          condition: dto.condition,
          imageUrl: dto.imageUrl,
          bannerUrl: dto.bannerUrl,
        },
      });

      const inventoryData: Prisma.InventoryItemCreateInput = {
        card: { connect: { id: card.id } },
        location,
      };

      if (dto.ownerID) {
        inventoryData.user = { connect: { id: dto.ownerID } };
      }

      await tx.inventoryItem.create({
        data: inventoryData,
      });

      return card;
    });
  }

  async updateCard(id: string, dto: UpdateCardRequest) {
    await this.ensureCardExists(id);

    const data: Prisma.CardUpdateInput = {};
    if (dto.name) {
      data.name = dto.name;
    }
    if (dto.sportType) {
      data.sportType = dto.sportType;
    }
    if (dto.rarity) {
      data.rarity = dto.rarity;
    }
    if (dto.serialNumber) {
      data.serialNumber = dto.serialNumber;
    }
    if (dto.estimatedValue) {
      data.estimatedValue = new Prisma.Decimal(dto.estimatedValue);
    }
    if (dto.description) {
      data.description = dto.description;
    }
    if (dto.playerName) {
      data.playerName = dto.playerName;
    }
    if (typeof dto.year === 'number') {
      data.year = dto.year;
    }
    if (dto.manufacturer) {
      data.manufacturer = dto.manufacturer;
    }
    if (dto.condition) {
      data.condition = dto.condition;
    }
    if (dto.imageUrl) {
      data.imageUrl = dto.imageUrl;
    }
    if (dto.bannerUrl) {
      data.bannerUrl = dto.bannerUrl;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required when updating a card');
    }

    return this.prisma.card.update({
      where: { id },
      data,
    });
  }

  async deleteCard(id: string) {
    await this.ensureCardExists(id);
    await this.prisma.card.delete({ where: { id } });
  }

  private async ensureCardExists(id: string) {
    const exists = await this.prisma.card.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Card not found');
    }
  }
}
