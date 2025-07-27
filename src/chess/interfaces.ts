export interface Position {
  x: number;
  y: number;
}

export enum PieceType {
  PAWN = 'pawn',
  ROOK = 'rook',
  KNIGHT = 'knight',
  BISHOP = 'bishop',
  QUEEN = 'queen',
  KING = 'king',
}

export enum PieceColor {
  WHITE = 'white',
  BLACK = 'black',
}

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  position: Position;
  hasMoved: boolean;
}

export interface Move {
  from: Position;
  to: Position;
  piece: ChessPiece;
  capturedPiece?: ChessPiece;
  timestamp: Date;
  player: string;
  notation?: string; // Chess notation like "e4", "Nf3", etc.
}

export interface GameState {
  id: string;
  board: (ChessPiece | null)[][];
  currentPlayer: PieceColor;
  players: {
    white: string;
    black: string;
  };
  moves: Move[];
  log?: string[];
  isGameOver: boolean;
  winner?: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  enPassantTarget?: Position; // For en passant captures
  castlingRights: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };
  mode?: 'ai' | 'human' | 'online';
  clock?: {
    white: number; // seconds remaining
    black: number; // seconds remaining
    increment?: number; // seconds per move
    running?: boolean;
    lastMoveTime?: number;
    timeControl?: number; // initial time in seconds
  };
}

export interface GameRoom {
  id: string;
  gameState: GameState;
  spectators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum GameStatus {
  WAITING_FOR_PLAYER = 'waiting_for_player',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DRAW = 'draw',
  CHECKMATE = 'checkmate',
  STALEMATE = 'stalemate',
  RESIGNATION = 'resignation',
  TIMEOUT = 'timeout',
}

export interface GameResult {
  status: GameStatus;
  winner?: PieceColor;
  reason?: string;
  finalPosition: GameState;
}

export interface JoinGameDto {
  gameId: string;
  playerName: string;
  color?: PieceColor;
}

export interface MakeMoveDto {
  gameId: string;
  from: Position;
  to: Position;
}
