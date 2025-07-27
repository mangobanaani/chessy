import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChessModule } from './chess/chess.module';

@Module({
  imports: [ChessModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
