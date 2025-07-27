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
  isGameOver: boolean;
  winner?: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
}
