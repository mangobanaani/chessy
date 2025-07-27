/**
 * Core chess game state types and interfaces
 * Pure data structures without behavior, following immutable patterns
 */

/**
 * Represents a position on the chess board
 * Uses standard coordinate system: (0,0) = a1, (7,7) = h8
 */
export interface Position {
  /** Horizontal position (0-7, representing files a-h) */
  x: number;
  /** Vertical position (0-7, representing ranks 1-8) */
  y: number;
}

/**
 * Chess piece types following standard chess notation
 */
export enum PieceType {
  PAWN = 'pawn',
  ROOK = 'rook',
  KNIGHT = 'knight',
  BISHOP = 'bishop',
  QUEEN = 'queen',
  KING = 'king',
}

/**
 * Chess piece colors
 */
export enum PieceColor {
  WHITE = 'white',
  BLACK = 'black',
}

/**
 * Represents a chess piece with its state and properties
 */
export interface ChessPiece {
  /** Unique identifier for the piece */
  id: string;
  /** Type of the chess piece */
  type: PieceType;
  /** Color of the piece (white or black) */
  color: PieceColor;
  /** Current position on the board */
  position: Position;
  /** Whether this piece has moved (important for castling and en passant) */
  hasMoved: boolean;
}

/**
 * Represents a chess move with all necessary metadata
 */
export interface Move {
  /** Starting position of the move */
  from: Position;
  /** Target position of the move */
  to: Position;
  /** The piece being moved */
  piece: ChessPiece;
  /** Piece captured by this move (if any) */
  capturedPiece?: ChessPiece;
  /** Piece type for pawn promotion (if applicable) */
  promotedTo?: PieceType;
  /** Whether this move is a castling move */
  isCastling?: boolean;
  /** When the move was made */
  timestamp: Date;
  /** Player who made the move */
  player: string;
  /** Standard algebraic notation (e.g., "e4", "Nf3", "O-O") */
  notation?: string;
}

/**
 * Complete state of a chess game at any point in time
 */
export interface GameState {
  /** Unique identifier for the game */
  id: string;
  /** 8x8 chess board representation */
  board: (ChessPiece | null)[][];
  /** Which player's turn it is */
  currentPlayer: PieceColor;
  /** Player information for both sides */
  players: {
    white: string;
    black: string;
  };
  /** Complete move history for the game */
  moves: Move[];
  /** Whether the game has ended */
  isGameOver: boolean;
  /** Winner of the game (if any) */
  winner?: PieceColor;
  /** Whether the current player is in check */
  isCheck: boolean;
  /** Whether the current player is in checkmate */
  isCheckmate: boolean;
  /** Whether the game is in stalemate */
  isStalemate: boolean;
  /** Target square for en passant capture (if available) */
  enPassantTarget?: Position;
  /** Castling availability for both players */
  castlingRights: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };
}

/**
 * Possible game ending states
 */
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

/**
 * Game result with status and contextual information
 */
export interface GameResult {
  /** Final status of the game */
  status: GameStatus;
  /** Winner of the game (if applicable) */
  winner?: PieceColor;
  /** Human-readable reason for the game ending */
  reason?: string;
  finalPosition: GameState;
}

// Events for state changes
export interface GameStateChangeEvent {
  type: 'move' | 'gameEnd' | 'playerJoin' | 'playerLeave';
  gameState: GameState;
  move?: Move;
  result?: GameResult;
}
