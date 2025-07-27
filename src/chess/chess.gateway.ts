import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ChessGameService } from './chess-game.service';
import { Position } from './interfaces';

interface JoinGameDto {
  gameId: string;
  playerName: string;
}

interface MakeMoveDto {
  gameId: string;
  from: Position;
  to: Position;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})
export class ChessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChessGateway.name);
  private connectedClients: Map<string, Socket> = new Map();
  private gameRooms: Map<string, Set<string>> = new Map();

  constructor(private chessGameService: ChessGameService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);

    // Remove client from all game rooms
    for (const [gameId, clients] of this.gameRooms.entries()) {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.gameRooms.delete(gameId);
        }
        this.server.to(gameId).emit('playerDisconnected', client.id);
      }
    }
  }

  @SubscribeMessage('createGame')
  handleCreateGame(
    @MessageBody() data: { playerName: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const gameId = this.generateGameId();
    const gameState = this.chessGameService.createGame(
      gameId,
      data.playerName,
      '',
    );

    void client.join(gameId);
    this.gameRooms.set(gameId, new Set([client.id]));

    client.emit('gameCreated', { gameId, gameState });
    this.logger.log(`Game created: ${gameId} by ${data.playerName}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() data: JoinGameDto,
    @ConnectedSocket() client: Socket,
  ): void {
    const game = this.chessGameService.getGame(data.gameId);
    if (!game) {
      client.emit('gameError', { message: 'Game not found' });
      return;
    }

    if (!this.gameRooms.has(data.gameId)) {
      this.gameRooms.set(data.gameId, new Set());
    }

    // At this point, a room for gameId always exists
    const room = this.gameRooms.get(data.gameId)!;
    if (room.size >= 2) {
      client.emit('gameError', { message: 'Game is full' });
      return;
    }

    void client.join(data.gameId);
    room.add(client.id);

    // Update game with second player
    if (room.size === 2 && !game.players.black) {
      game.players.black = data.playerName;
    }

    client.emit('gameJoined', { gameId: data.gameId, gameState: game });
    this.server.to(data.gameId).emit('gameUpdated', game);

    this.logger.log(`Player ${data.playerName} joined game: ${data.gameId}`);
  }

  @SubscribeMessage('makeMove')
  async handleMakeMove(
    @MessageBody() data: MakeMoveDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const updatedGame = this.chessGameService.makeMove(data.gameId, {
      from: data.from,
      to: data.to,
      player: client.id,
    });

    if (!updatedGame) {
      client.emit('gameError', { message: 'Invalid move' });
      return;
    }

    void this.server.to(data.gameId).emit('gameUpdated', updatedGame);
    this.logger.log(
      `Move made in game ${data.gameId}: ${JSON.stringify(data.from)} to ${JSON.stringify(data.to)}`,
    );

    // Simulate AI turn if game mode is AI and it's AI's turn
    if (
      updatedGame.mode === 'ai' &&
      String(updatedGame.currentPlayer) === String(updatedGame.players.black)
    ) {
      // Get AI move from service (implement getAIMove in ChessGameService)
      const aiMove = await this.chessGameService.getAIMove(updatedGame);
      if (aiMove) {
        const aiUpdatedGame = this.chessGameService.makeMove(
          data.gameId,
          aiMove,
        );
        void this.server.to(data.gameId).emit('gameUpdated', aiUpdatedGame);
        this.logger.log(
          `AI move made in game ${data.gameId}: ${JSON.stringify(aiMove.from)} to ${JSON.stringify(aiMove.to)}`,
        );
      }
    }
  }

  @SubscribeMessage('getGame')
  handleGetGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const game = this.chessGameService.getGame(data.gameId);
    if (game) {
      client.emit('gameState', game);
    } else {
      client.emit('error', { message: 'Game not found' });
    }
  }

  private generateGameId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
