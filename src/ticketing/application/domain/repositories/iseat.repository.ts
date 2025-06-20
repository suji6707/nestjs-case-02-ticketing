import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { Seat } from '../models/seat';

export interface ISeatRepository {
	findOne(seatId: number): Promise<Seat>;
	selectForUpdate(seatId: number): Promise<optional<Seat>>;
	update(seat: Seat): Promise<Seat>;
	create(seat: Seat): Promise<Seat>;
}
