import { GameState, ChessPiece, PieceType, PieceColor, Position } from '../types/gameState';

/**
 * Advanced board evaluation using piece-square tables and positional factors
 * Provides static evaluation of chess positions for the AI engine
 */
export class BoardEvaluator {
  
  // Base piece values in centipawns (1 pawn = 100)
  private static readonly PIECE_VALUES: Record<PieceType, number> = {
    [PieceType.PAWN]: 100,
    [PieceType.KNIGHT]: 320,
    [PieceType.BISHOP]: 330,
    [PieceType.ROOK]: 500,
    [PieceType.QUEEN]: 900,
    [PieceType.KING]: 20000,
  };

  // Piece-square tables for positional evaluation
  private static readonly PAWN_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ];

  private static readonly KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ];

  private static readonly BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ];

  private static readonly ROOK_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ];

  private static readonly QUEEN_TABLE = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ];

  private static readonly KING_MIDDLE_GAME_TABLE = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ];

  private static readonly KING_END_GAME_TABLE = [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
  ];

  /**
   * Main evaluation function - returns score from White's perspective
   */
  static evaluate(gameState: GameState): number {
    let score = 0;
    
    // Material and positional evaluation
    score += BoardEvaluator.evaluateMaterial(gameState);
    score += BoardEvaluator.evaluatePosition(gameState);
    score += BoardEvaluator.evaluateKingSafety(gameState);
    score += BoardEvaluator.evaluatePawnStructure(gameState);
    score += BoardEvaluator.evaluateMobility(gameState);
    
    // Game phase detection for endgame considerations
    const isEndgame = BoardEvaluator.isEndgame(gameState);
    if (isEndgame) {
      score += BoardEvaluator.evaluateEndgame(gameState);
    }
    
    return score;
  }

  /**
   * Evaluate material balance
   */
  private static evaluateMaterial(gameState: GameState): number {
    let whiteScore = 0;
    let blackScore = 0;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          const value = BoardEvaluator.PIECE_VALUES[piece.type];
          if (piece.color === PieceColor.WHITE) {
            whiteScore += value;
          } else {
            blackScore += value;
          }
        }
      }
    }
    
    return whiteScore - blackScore;
  }

  /**
   * Evaluate piece positions using piece-square tables
   */
  private static evaluatePosition(gameState: GameState): number {
    let score = 0;
    const isEndgame = BoardEvaluator.isEndgame(gameState);
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          const positionScore = BoardEvaluator.getPieceSquareValue(piece, x, y, isEndgame);
          score += piece.color === PieceColor.WHITE ? positionScore : -positionScore;
        }
      }
    }
    
    return score;
  }

  /**
   * Get piece-square table value for a piece at given position
   */
  private static getPieceSquareValue(piece: ChessPiece, x: number, y: number, isEndgame: boolean): number {
    // Flip y coordinate for black pieces
    const tableY = piece.color === PieceColor.WHITE ? 7 - y : y;
    
    switch (piece.type) {
      case PieceType.PAWN:
        return BoardEvaluator.PAWN_TABLE[tableY][x];
      case PieceType.KNIGHT:
        return BoardEvaluator.KNIGHT_TABLE[tableY][x];
      case PieceType.BISHOP:
        return BoardEvaluator.BISHOP_TABLE[tableY][x];
      case PieceType.ROOK:
        return BoardEvaluator.ROOK_TABLE[tableY][x];
      case PieceType.QUEEN:
        return BoardEvaluator.QUEEN_TABLE[tableY][x];
      case PieceType.KING:
        return isEndgame 
          ? BoardEvaluator.KING_END_GAME_TABLE[tableY][x]
          : BoardEvaluator.KING_MIDDLE_GAME_TABLE[tableY][x];
      default:
        return 0;
    }
  }

  /**
   * Evaluate king safety
   */
  private static evaluateKingSafety(gameState: GameState): number {
    let score = 0;
    
    // Find kings
    const whiteKing = BoardEvaluator.findKing(gameState, PieceColor.WHITE);
    const blackKing = BoardEvaluator.findKing(gameState, PieceColor.BLACK);
    
    if (whiteKing && blackKing) {
      // Penalty for king exposure
      score += BoardEvaluator.evaluateKingExposure(gameState, whiteKing, PieceColor.WHITE);
      score -= BoardEvaluator.evaluateKingExposure(gameState, blackKing, PieceColor.BLACK);
      
      // Bonus for castling rights
      if (gameState.castlingRights.whiteKingSide || gameState.castlingRights.whiteQueenSide) {
        score += 20;
      }
      if (gameState.castlingRights.blackKingSide || gameState.castlingRights.blackQueenSide) {
        score -= 20;
      }
    }
    
    return score;
  }

  /**
   * Evaluate king exposure to attacks
   */
  private static evaluateKingExposure(gameState: GameState, kingPos: Position, color: PieceColor): number {
    let exposure = 0;
    
    // Check squares around king for protection
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const x = kingPos.x + dx;
        const y = kingPos.y + dy;
        
        if (x >= 0 && x < 8 && y >= 0 && y < 8) {
          const piece = gameState.board[y][x];
          if (!piece || piece.color !== color) {
            exposure += 10; // Exposed square penalty
          }
        }
      }
    }
    
    return -exposure;
  }

  /**
   * Evaluate pawn structure
   */
  private static evaluatePawnStructure(gameState: GameState): number {
    let score = 0;
    
    const whitePawns = BoardEvaluator.getPawns(gameState, PieceColor.WHITE);
    const blackPawns = BoardEvaluator.getPawns(gameState, PieceColor.BLACK);
    
    // Doubled pawns penalty
    score -= BoardEvaluator.countDoubledPawns(whitePawns) * 10;
    score += BoardEvaluator.countDoubledPawns(blackPawns) * 10;
    
    // Isolated pawns penalty
    score -= BoardEvaluator.countIsolatedPawns(whitePawns) * 15;
    score += BoardEvaluator.countIsolatedPawns(blackPawns) * 15;
    
    // Passed pawns bonus
    score += BoardEvaluator.countPassedPawns(gameState, whitePawns, PieceColor.WHITE) * 20;
    score -= BoardEvaluator.countPassedPawns(gameState, blackPawns, PieceColor.BLACK) * 20;
    
    return score;
  }

  /**
   * Evaluate piece mobility
   */
  private static evaluateMobility(gameState: GameState): number {
    // Basic mobility evaluation - would need full move generation for accuracy
    // This is a simplified version focusing on central control
    let score = 0;
    
    // Control of center squares
    const centerSquares = [{x: 3, y: 3}, {x: 3, y: 4}, {x: 4, y: 3}, {x: 4, y: 4}];
    
    for (const square of centerSquares) {
      const piece = gameState.board[square.y][square.x];
      if (piece) {
        score += piece.color === PieceColor.WHITE ? 10 : -10;
      }
    }
    
    return score;
  }

  /**
   * Evaluate endgame-specific factors
   */
  private static evaluateEndgame(gameState: GameState): number {
    let score = 0;
    
    const whiteKing = BoardEvaluator.findKing(gameState, PieceColor.WHITE);
    const blackKing = BoardEvaluator.findKing(gameState, PieceColor.BLACK);
    
    if (whiteKing && blackKing) {
      // King activity bonus in endgame
      const whiteKingCentrality = BoardEvaluator.getKingCentrality(whiteKing);
      const blackKingCentrality = BoardEvaluator.getKingCentrality(blackKing);
      score += (whiteKingCentrality - blackKingCentrality) * 5;
    }
    
    return score;
  }

  /**
   * Helper methods
   */
  static getPieceValue(pieceType: PieceType): number {
    return BoardEvaluator.PIECE_VALUES[pieceType];
  }

  private static findKing(gameState: GameState, color: PieceColor): Position | null {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece?.type === PieceType.KING && piece.color === color) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private static getPawns(gameState: GameState, color: PieceColor): Position[] {
    const pawns: Position[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece?.type === PieceType.PAWN && piece.color === color) {
          pawns.push({ x, y });
        }
      }
    }
    return pawns;
  }

  private static countDoubledPawns(pawns: Position[]): number {
    const fileCount: Record<number, number> = {};
    for (const pawn of pawns) {
      fileCount[pawn.x] = (fileCount[pawn.x] || 0) + 1;
    }
    return Object.values(fileCount).filter(count => count > 1).length;
  }

  private static countIsolatedPawns(pawns: Position[]): number {
    const files = new Set(pawns.map(p => p.x));
    return pawns.filter(pawn => 
      !files.has(pawn.x - 1) && !files.has(pawn.x + 1)
    ).length;
  }

  private static countPassedPawns(gameState: GameState, pawns: Position[], color: PieceColor): number {
    return pawns.filter(pawn => BoardEvaluator.isPassedPawn(gameState, pawn, color)).length;
  }

  private static isPassedPawn(gameState: GameState, pawn: Position, color: PieceColor): boolean {
    const direction = color === PieceColor.WHITE ? -1 : 1;
    const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    
    // Check if there are enemy pawns blocking this pawn's path
    for (let y = pawn.y + direction; y >= 0 && y < 8; y += direction) {
      for (let x = Math.max(0, pawn.x - 1); x <= Math.min(7, pawn.x + 1); x++) {
        const piece = gameState.board[y][x];
        if (piece?.type === PieceType.PAWN && piece.color === enemyColor) {
          return false;
        }
      }
    }
    return true;
  }

  private static getKingCentrality(kingPos: Position): number {
    const centerDistance = Math.abs(kingPos.x - 3.5) + Math.abs(kingPos.y - 3.5);
    return 7 - centerDistance;
  }

  private static isEndgame(gameState: GameState): boolean {
    let materialCount = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.type !== PieceType.KING && piece.type !== PieceType.PAWN) {
          materialCount += BoardEvaluator.PIECE_VALUES[piece.type];
        }
      }
    }
    return materialCount < 1300; // Endgame threshold
  }
}
