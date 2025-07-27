import { Injectable } from '@nestjs/common';
import {
  ChessPiece,
  GameState,
  Move,
  PieceColor,
  PieceType,
  Position,
} from './interfaces';

@Injectable()
export class ChessGameService {
  private games: Map<string, GameState> = new Map();

  createGame(
    gameId: string,
    whitePlayer: string,
    blackPlayer: string,
  ): GameState {
    const gameState: GameState = {
      id: gameId,
      board: this.initializeBoard(),
      currentPlayer: PieceColor.WHITE,
      players: {
        white: whitePlayer,
        black: blackPlayer,
      },
      moves: [],
      log: [],
      isGameOver: false,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      castlingRights: {
        whiteKingSide: true,
        whiteQueenSide: true,
        blackKingSide: true,
        blackQueenSide: true,
      },
      mode: 'human', // default, can be set to 'ai' or 'online' externally
      clock: {
        white: 300, // 5 minutes default
        black: 300,
        increment: 0,
        running: false,
        lastMoveTime: Date.now(),
        timeControl: 300,
      },
    };
    this.games.set(gameId, gameState);
    return gameState;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  makeMove(
    gameId: string,
    move: Omit<Move, 'timestamp' | 'piece'>,
  ): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.isGameOver) {
      return null;
    }

    const piece = game.board[move.from.y][move.from.x];
    if (!piece || piece.color !== game.currentPlayer) {
      return null;
    }

    if (!this.isValidMove(game, move.from, move.to)) {
      return null;
    }

    // Update clock
    if (game.clock) {
      const now = Date.now();
      const last = game.clock.lastMoveTime || now;
      const elapsed = Math.floor((now - last) / 1000);
      if (game.currentPlayer === PieceColor.WHITE) {
        game.clock.white -= elapsed;
      } else {
        game.clock.black -= elapsed;
      }
      game.clock.lastMoveTime = now;
      game.clock.running = true;
    }

    // Execute the move
    const capturedPiece = game.board[move.to.y][move.to.x];
    game.board[move.to.y][move.to.x] = piece;
    game.board[move.from.y][move.from.x] = null;

    piece.position = move.to;
    piece.hasMoved = true;

    const fullMove: Move = {
      ...move,
      piece,
      capturedPiece: capturedPiece || undefined,
      timestamp: new Date(),
    };

    game.moves.push(fullMove);
    if (!game.log) game.log = [];
    game.log.push(
      `${piece.type} ${piece.color} ${move.from.x},${move.from.y} -> ${move.to.x},${move.to.y}`,
    );
    game.currentPlayer =
      game.currentPlayer === PieceColor.WHITE
        ? PieceColor.BLACK
        : PieceColor.WHITE;

    // Check for game end conditions
    this.updateGameStatus(game);

    return game;
  }

  private initializeBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = [];
    for (let y = 0; y < 8; y++) {
      board[y] = new Array<ChessPiece | null>(8).fill(null);
    }

    // Place pawns
    for (let x = 0; x < 8; x++) {
      board[1][x] = this.createPiece(
        `b-pawn-${x}`,
        PieceType.PAWN,
        PieceColor.BLACK,
        { x, y: 1 },
      );
      board[6][x] = this.createPiece(
        `w-pawn-${x}`,
        PieceType.PAWN,
        PieceColor.WHITE,
        { x, y: 6 },
      );
    }

    // Place other pieces
    const pieceOrder = [
      PieceType.ROOK,
      PieceType.KNIGHT,
      PieceType.BISHOP,
      PieceType.QUEEN,
      PieceType.KING,
      PieceType.BISHOP,
      PieceType.KNIGHT,
      PieceType.ROOK,
    ];

    for (let x = 0; x < 8; x++) {
      board[0][x] = this.createPiece(
        `b-${pieceOrder[x]}-${x}`,
        pieceOrder[x],
        PieceColor.BLACK,
        { x, y: 0 },
      );
      board[7][x] = this.createPiece(
        `w-${pieceOrder[x]}-${x}`,
        pieceOrder[x],
        PieceColor.WHITE,
        { x, y: 7 },
      );
    }

    return board;
  }

  private createPiece(
    id: string,
    type: PieceType,
    color: PieceColor,
    position: Position,
  ): ChessPiece {
    return {
      id,
      type,
      color,
      position,
      hasMoved: false,
    };
  }

  private isValidMove(game: GameState, from: Position, to: Position): boolean {
    // Basic bounds checking
    if (to.x < 0 || to.x > 7 || to.y < 0 || to.y > 7) {
      return false;
    }

    const piece = game.board[from.y][from.x];
    if (!piece) {
      return false;
    }

    const targetPiece = game.board[to.y][to.x];
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    // Basic piece movement validation (simplified for now)
    return this.isValidPieceMove(piece, from, to, game.board);
  }

  private isValidPieceMove(
    piece: ChessPiece,
    from: Position,
    to: Position,
    board: (ChessPiece | null)[][],
  ): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    switch (piece.type) {
      case PieceType.PAWN:
        return this.isValidPawnMove(piece, dx, dy, board);
      case PieceType.ROOK:
        return (dx === 0 || dy === 0) && this.isPathClear(from, to, board);
      case PieceType.BISHOP:
        return (
          Math.abs(dx) === Math.abs(dy) && this.isPathClear(from, to, board)
        );
      case PieceType.QUEEN:
        return (
          (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) &&
          this.isPathClear(from, to, board)
        );
      case PieceType.KING:
        return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
      case PieceType.KNIGHT:
        return (
          (Math.abs(dx) === 2 && Math.abs(dy) === 1) ||
          (Math.abs(dx) === 1 && Math.abs(dy) === 2)
        );
      default:
        return false;
    }
  }

  private isValidPawnMove(
    piece: ChessPiece,
    dx: number,
    dy: number,
    board: (ChessPiece | null)[][],
  ): boolean {
    const direction = piece.color === PieceColor.WHITE ? -1 : 1;
    const startRow = piece.color === PieceColor.WHITE ? 6 : 1;

    // Forward move
    if (dx === 0) {
      if (dy === direction) {
        return board[piece.position.y + dy][piece.position.x] === null;
      }
      if (dy === 2 * direction && piece.position.y === startRow) {
        return (
          board[piece.position.y + dy][piece.position.x] === null &&
          board[piece.position.y + direction][piece.position.x] === null
        );
      }
    }

    // Diagonal capture
    if (Math.abs(dx) === 1 && dy === direction) {
      const targetPiece = board[piece.position.y + dy][piece.position.x + dx];
      return targetPiece !== null && targetPiece.color !== piece.color;
    }

    return false;
  }

  private isPathClear(
    from: Position,
    to: Position,
    board: (ChessPiece | null)[][],
  ): boolean {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    let x = from.x + dx;
    let y = from.y + dy;

    while (x !== to.x || y !== to.y) {
      if (board[y][x] !== null) {
        return false;
      }
      x += dx;
      y += dy;
    }

    return true;
  }

  private updateGameStatus(game: GameState): void {
    // Simplified game status checking
    // In a full implementation, you would check for check, checkmate, stalemate
    const enemyKing = this.findKing(game.board, game.currentPlayer);
    if (!enemyKing) {
      game.isGameOver = true;
      game.winner =
        game.currentPlayer === PieceColor.WHITE
          ? PieceColor.BLACK
          : PieceColor.WHITE;
    }
  }

  private findKing(
    board: (ChessPiece | null)[][],
    color: PieceColor,
  ): ChessPiece | null {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          return piece;
        }
      }
    }
    return null;
  }

  // Simulate a basic AI move: pick a random valid move for black
  // Simulate a basic AI move: pick a random valid move for black
  getAIMove(
    game: GameState,
  ): Promise<Omit<Move, 'timestamp' | 'piece'> | null> {
    if (!game || game.isGameOver) {
      return Promise.resolve(null);
    }
    // Find all black pieces
    const moves: Array<{ from: Position; to: Position }> = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = game.board[y][x];
        if (piece && piece.color === PieceColor.BLACK) {
          // Try all possible destinations
          for (let ty = 0; ty < 8; ty++) {
            for (let tx = 0; tx < 8; tx++) {
              if (this.isValidMove(game, { x, y }, { x: tx, y: ty })) {
                moves.push({ from: { x, y }, to: { x: tx, y: ty } });
              }
            }
          }
        }
      }
    }
    if (moves.length === 0) {
      return Promise.resolve(null);
    }
    const pick = moves[Math.floor(Math.random() * moves.length)];
    return Promise.resolve({
      from: pick.from,
      to: pick.to,
      player: game.players.black,
    });
  }
}
