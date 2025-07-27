import { Module } from '@nestjs/common';
import { ChessGameService } from './chess-game.service';
import { ChessGateway } from './chess.gateway';

@Module({
  providers: [ChessGameService, ChessGateway],
  exports: [ChessGameService],
})
export class ChessModule {}
