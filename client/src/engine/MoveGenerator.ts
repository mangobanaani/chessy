import { GameState, Move, PieceColor, Position, ChessPiece, PieceType } from '../types/gameState';
import { ChessGameEngine } from './ChessGameEngine';

/**
 * Advanced move generation for chess AI
 * Provides optimized move generation with specialized methods for different move types
 */
export class MoveGenerator {

  /**
   * Generate all valid moves for a given color
   */
  static getAllValidMoves(gameState: GameState, color: PieceColor): Move[] {
    const possibleMoves = ChessGameEngine.getAllPossibleMoves(gameState, color);
    const moves: Move[] = [];
    
    for (const possibleMove of possibleMoves) {
      const capturedPiece = gameState.board[possibleMove.to.y][possibleMove.to.x];
      
      const move: Move = {
        from: possibleMove.from,
        to: possibleMove.to,
        piece: possibleMove.piece,
        capturedPiece: capturedPiece || undefined,
        timestamp: new Date(),
        player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
        notation: MoveGenerator.generateNotation(gameState, possibleMove.piece, possibleMove.from, possibleMove.to, capturedPiece)
      };
      
      // Handle special moves
      if (possibleMove.piece.type === PieceType.PAWN) {
        // Pawn promotion
        if ((possibleMove.piece.color === PieceColor.WHITE && possibleMove.to.y === 0) || 
            (possibleMove.piece.color === PieceColor.BLACK && possibleMove.to.y === 7)) {
          // Generate all promotion options
          const promotionTypes: PieceType[] = [PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT];
          for (const promoteTo of promotionTypes) {
            moves.push({
              ...move,
              promotedTo: promoteTo,
              notation: move.notation + '=' + MoveGenerator.getPieceSymbol(promoteTo)
            });
          }
          continue; // Skip the non-promotion move
        }
      }
      
      // Check for castling
      if (possibleMove.piece.type === PieceType.KING && Math.abs(possibleMove.to.x - possibleMove.from.x) === 2) {
        move.isCastling = true;
        move.notation = possibleMove.to.x > possibleMove.from.x ? 'O-O' : 'O-O-O';
      }
      
      moves.push(move);
    }
    
    return moves;
  }

  /**
   * Generate only capturing moves (for quiescence search)
   */
  static getCapturingMoves(gameState: GameState, color: PieceColor): Move[] {
    const allMoves = MoveGenerator.getAllValidMoves(gameState, color);
    return allMoves.filter(move => move.capturedPiece);
  }

  /**
   * Generate checking moves (moves that put opponent king in check)
   */
  static getCheckingMoves(gameState: GameState, color: PieceColor): Move[] {
    const allMoves = MoveGenerator.getAllValidMoves(gameState, color);
    const checkingMoves: Move[] = [];
    
    for (const move of allMoves) {
      const newGameState = ChessGameEngine.makeMove(gameState, move.from, move.to);
      if (newGameState?.isCheck) {
        checkingMoves.push(move);
      }
    }
    
    return checkingMoves;
  }

  /**
   * Get valid moves for a specific piece at a position
   */
  private static getValidMovesForPiece(gameState: GameState, position: Position): Move[] {
    const piece = gameState.board[position.y][position.x];
    if (!piece) return [];
    
    const validPositions = ChessGameEngine.getValidMoves(gameState, position);
    const moves: Move[] = [];
    
    for (const targetPos of validPositions) {
      const capturedPiece = gameState.board[targetPos.y][targetPos.x];
      
      // Create base move
      const move: Move = {
        from: position,
        to: targetPos,
        piece: piece,
        capturedPiece: capturedPiece || undefined,
        timestamp: new Date(),
        player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
        notation: MoveGenerator.generateNotation(gameState, piece, position, targetPos, capturedPiece)
      };
      
      // Handle special moves
      if (piece.type === PieceType.PAWN) {
        // Pawn promotion
        if ((piece.color === PieceColor.WHITE && targetPos.y === 0) || 
            (piece.color === PieceColor.BLACK && targetPos.y === 7)) {
          // Generate all promotion options
          const promotionTypes: PieceType[] = [PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT];
          for (const promoteTo of promotionTypes) {
            moves.push({
              ...move,
              promotedTo: promoteTo,
              notation: move.notation + '=' + MoveGenerator.getPieceSymbol(promoteTo)
            });
          }
          continue; // Skip the non-promotion move
        }
      }
      
      // Check for castling
      if (piece.type === PieceType.KING && Math.abs(targetPos.x - position.x) === 2) {
        move.isCastling = true;
        move.notation = targetPos.x > position.x ? 'O-O' : 'O-O-O';
      }
      
      moves.push(move);
    }
    
    return moves;
  }

  /**
   * Generate algebraic notation for a move
   */
  private static generateNotation(
    gameState: GameState, 
    piece: ChessPiece, 
    from: Position, 
    to: Position, 
    capturedPiece?: ChessPiece | null
  ): string {
    let notation = '';
    
    // Special case for castling (handled in getValidMovesForPiece)
    if (piece.type === PieceType.KING && Math.abs(to.x - from.x) === 2) {
      return to.x > from.x ? 'O-O' : 'O-O-O';
    }
    
    // Piece symbol (except for pawns)
    if (piece.type !== PieceType.PAWN) {
      notation += MoveGenerator.getPieceSymbol(piece.type);
    }
    
    // Disambiguation if needed
    const sameTypeMoves = MoveGenerator.getSameTypeMoves(gameState, piece, to);
    if (sameTypeMoves.length > 1) {
      const sameFileMoves = sameTypeMoves.filter(pos => pos.x === from.x);
      const sameRankMoves = sameTypeMoves.filter(pos => pos.y === from.y);
      
      if (sameFileMoves.length === 1) {
        notation += String.fromCharCode(97 + from.x); // File letter
      } else if (sameRankMoves.length === 1) {
        notation += (8 - from.y).toString(); // Rank number
      } else {
        notation += String.fromCharCode(97 + from.x) + (8 - from.y).toString();
      }
    }
    
    // Capture indicator
    if (capturedPiece) {
      if (piece.type === PieceType.PAWN) {
        notation += String.fromCharCode(97 + from.x); // Pawn capture includes file
      }
      notation += 'x';
    }
    
    // Destination square
    notation += String.fromCharCode(97 + to.x) + (8 - to.y).toString();
    
    return notation;
  }

  /**
   * Get all pieces of same type that can move to the target square
   */
  private static getSameTypeMoves(gameState: GameState, piece: ChessPiece, target: Position): Position[] {
    const sameTypePieces: Position[] = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const boardPiece = gameState.board[y][x];
        if (boardPiece?.type === piece.type && 
            boardPiece.color === piece.color) {
          const validMoves = ChessGameEngine.getValidMoves(gameState, { x, y });
          if (validMoves.some(move => move.x === target.x && move.y === target.y)) {
            sameTypePieces.push({ x, y });
          }
        }
      }
    }
    
    return sameTypePieces;
  }

  /**
   * Get piece symbol for notation
   */
  private static getPieceSymbol(pieceType: PieceType): string {
    switch (pieceType) {
      case PieceType.KING: return 'K';
      case PieceType.QUEEN: return 'Q';
      case PieceType.ROOK: return 'R';
      case PieceType.BISHOP: return 'B';
      case PieceType.KNIGHT: return 'N';
      case PieceType.PAWN: return '';
      default: return '';
    }
  }

  /**
   * Generate pseudo-legal moves (before checking for king safety)
   * Used for attack pattern analysis
   */
  static getPseudoLegalMoves(gameState: GameState, color: PieceColor): Move[] {
    const moves: Move[] = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece?.color === color) {
          const pieceMoves = MoveGenerator.getPseudoLegalMovesForPiece(gameState, { x, y });
          moves.push(...pieceMoves);
        }
      }
    }
    
    return moves;
  }

  /**
   * Generate pseudo-legal moves for a specific piece
   */
  private static getPseudoLegalMovesForPiece(gameState: GameState, position: Position): Move[] {
    const piece = gameState.board[position.y][position.x];
    if (!piece) return [];
    
    const moves: Move[] = [];
    
    switch (piece.type) {
      case PieceType.PAWN:
        moves.push(...MoveGenerator.getPawnMoves(gameState, position, piece));
        break;
      case PieceType.KNIGHT:
        moves.push(...MoveGenerator.getKnightMoves(gameState, position, piece));
        break;
      case PieceType.BISHOP:
        moves.push(...MoveGenerator.getBishopMoves(gameState, position, piece));
        break;
      case PieceType.ROOK:
        moves.push(...MoveGenerator.getRookMoves(gameState, position, piece));
        break;
      case PieceType.QUEEN:
        moves.push(...MoveGenerator.getQueenMoves(gameState, position, piece));
        break;
      case PieceType.KING:
        moves.push(...MoveGenerator.getKingMoves(gameState, position, piece));
        break;
    }
    
    return moves;
  }

  /**
   * Piece-specific move generators
   */
  private static getPawnMoves(gameState: GameState, position: Position, piece: ChessPiece): Move[] {
    const moves: Move[] = [];
    const direction = piece.color === PieceColor.WHITE ? -1 : 1;
    const startingRank = piece.color === PieceColor.WHITE ? 6 : 1;
    
    // Forward moves
    const oneSquareAhead = { x: position.x, y: position.y + direction };
    if (MoveGenerator.isValidPosition(oneSquareAhead) && !gameState.board[oneSquareAhead.y][oneSquareAhead.x]) {
      moves.push(MoveGenerator.createMove(piece, position, oneSquareAhead, gameState));
      
      // Two squares forward from starting position
      if (position.y === startingRank) {
        const twoSquareAhead = { x: position.x, y: position.y + 2 * direction };
        if (MoveGenerator.isValidPosition(twoSquareAhead) && !gameState.board[twoSquareAhead.y][twoSquareAhead.x]) {
          moves.push(MoveGenerator.createMove(piece, position, twoSquareAhead, gameState));
        }
      }
    }
    
    // Diagonal captures
    const capturePositions = [
      { x: position.x - 1, y: position.y + direction },
      { x: position.x + 1, y: position.y + direction }
    ];
    
    for (const capturePos of capturePositions) {
      if (MoveGenerator.isValidPosition(capturePos)) {
        const target = gameState.board[capturePos.y][capturePos.x];
        if (target && target.color !== piece.color) {
          moves.push(MoveGenerator.createMove(piece, position, capturePos, gameState, target));
        }
        // En passant (would need additional logic for en passant target tracking)
      }
    }
    
    return moves;
  }

  private static getKnightMoves(gameState: GameState, position: Position, piece: ChessPiece): Move[] {
    const moves: Move[] = [];
    const knightMoves = [
      { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -1, y: 2 }, { x: -2, y: 1 },
      { x: -2, y: -1 }, { x: -1, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -1 }
    ];
    
    for (const move of knightMoves) {
      const newPos = { x: position.x + move.x, y: position.y + move.y };
      if (MoveGenerator.isValidPosition(newPos)) {
        const target = gameState.board[newPos.y][newPos.x];
        if (!target || target.color !== piece.color) {
          moves.push(MoveGenerator.createMove(piece, position, newPos, gameState, target));
        }
      }
    }
    
    return moves;
  }

  private static getBishopMoves(gameState: GameState, position: Position, piece: ChessPiece): Move[] {
    const moves: Move[] = [];
    const directions = [{ x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];
    
    for (const dir of directions) {
      for (let i = 1; i < 8; i++) {
        const newPos = { x: position.x + dir.x * i, y: position.y + dir.y * i };
        if (!MoveGenerator.isValidPosition(newPos)) break;
        
        const target = gameState.board[newPos.y][newPos.x];
        if (target) {
          if (target.color !== piece.color) {
            moves.push(MoveGenerator.createMove(piece, position, newPos, gameState, target));
          }
          break; // Can't move further in this direction
        } else {
          moves.push(MoveGenerator.createMove(piece, position, newPos, gameState));
        }
      }
    }
    
    return moves;
  }

  private static getRookMoves(gameState: GameState, position: Position, piece: ChessPiece): Move[] {
    const moves: Move[] = [];
    const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    
    for (const dir of directions) {
      for (let i = 1; i < 8; i++) {
        const newPos = { x: position.x + dir.x * i, y: position.y + dir.y * i };
        if (!MoveGenerator.isValidPosition(newPos)) break;
        
        const target = gameState.board[newPos.y][newPos.x];
        if (target) {
          if (target.color !== piece.color) {
            moves.push(MoveGenerator.createMove(piece, position, newPos, gameState, target));
          }
          break;
        } else {
          moves.push(MoveGenerator.createMove(piece, position, newPos, gameState));
        }
      }
    }
    
    return moves;
  }

  private static getQueenMoves(gameState: GameState, position: Position, piece: ChessPiece): Move[] {
    return [
      ...MoveGenerator.getRookMoves(gameState, position, piece),
      ...MoveGenerator.getBishopMoves(gameState, position, piece)
    ];
  }

  private static getKingMoves(gameState: GameState, position: Position, piece: ChessPiece): Move[] {
    const moves: Move[] = [];
    
    // Regular king moves
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const newPos = { x: position.x + dx, y: position.y + dy };
        if (MoveGenerator.isValidPosition(newPos)) {
          const target = gameState.board[newPos.y][newPos.x];
          if (!target || target.color !== piece.color) {
            moves.push(MoveGenerator.createMove(piece, position, newPos, gameState, target));
          }
        }
      }
    }
    
    // Castling moves would be handled by ChessGameEngine.getValidMoves validation
    
    return moves;
  }

  /**
   * Helper methods
   */
  private static isValidPosition(position: Position): boolean {
    return position.x >= 0 && position.x < 8 && position.y >= 0 && position.y < 8;
  }

  private static createMove(
    piece: ChessPiece, 
    from: Position, 
    to: Position, 
    gameState: GameState, 
    capturedPiece?: ChessPiece | null
  ): Move {
    return {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined,
      timestamp: new Date(),
      player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
      notation: MoveGenerator.generateNotation(gameState, piece, from, to, capturedPiece)
    };
  }
}
