import { ChessPiece, PieceType, PieceColor, Position } from '../types/gameState';

/**
 * Pure rendering utilities - no game logic, just visual representation
 */
export class ChessRenderer {
  
  /**
   * Get Unicode symbol for chess piece
   */
  static getPieceSymbol(piece: ChessPiece): string {
    const symbols: Record<PieceColor, Record<PieceType, string>> = {
      [PieceColor.WHITE]: {
        [PieceType.KING]: '♔',
        [PieceType.QUEEN]: '♕',
        [PieceType.ROOK]: '♖',
        [PieceType.BISHOP]: '♗',
        [PieceType.KNIGHT]: '♘',
        [PieceType.PAWN]: '♙',
      },
      [PieceColor.BLACK]: {
        [PieceType.KING]: '♚',
        [PieceType.QUEEN]: '♛',
        [PieceType.ROOK]: '♜',
        [PieceType.BISHOP]: '♝',
        [PieceType.KNIGHT]: '♞',
        [PieceType.PAWN]: '♟',
      },
    };
    
    return symbols[piece.color][piece.type];
  }

  /**
   * Get piece name for accessibility
   */
  static getPieceName(piece: ChessPiece): string {
    return `${piece.color} ${piece.type}`;
  }

  /**
   * Convert position to chess notation (e.g., {x: 0, y: 7} -> "a1")
   */
  static positionToNotation(position: Position): string {
    const file = String.fromCharCode(97 + position.x); // 'a' + x
    const rank = (8 - position.y).toString();
    return file + rank;
  }

  /**
   * Convert chess notation to position (e.g., "a1" -> {x: 0, y: 7})
   */
  static notationToPosition(notation: string): Position {
    const file = notation.charCodeAt(0) - 97; // 'a' = 0
    const rank = 8 - parseInt(notation[1]);
    return { x: file, y: rank };
  }

  /**
   * Check if square is light or dark
   */
  static isLightSquare(position: Position): boolean {
    return (position.x + position.y) % 2 === 0;
  }

  /**
   * Get square color for styling
   */
  static getSquareColor(position: Position): 'light' | 'dark' {
    return ChessRenderer.isLightSquare(position) ? 'light' : 'dark';
  }

  /**
   * Format move for display (e.g., "e2-e4")
   */
  static formatMove(from: Position, to: Position): string {
    return `${ChessRenderer.positionToNotation(from)}-${ChessRenderer.positionToNotation(to)}`;
  }

  /**
   * Get piece value for material calculation
   */
  static getPieceValue(pieceType: PieceType): number {
    const values: Record<PieceType, number> = {
      [PieceType.PAWN]: 1,
      [PieceType.KNIGHT]: 3,
      [PieceType.BISHOP]: 3,
      [PieceType.ROOK]: 5,
      [PieceType.QUEEN]: 9,
      [PieceType.KING]: 0, // King has no point value
    };
    
    return values[pieceType];
  }

  /**
   * Calculate material advantage
   */
  static calculateMaterialAdvantage(board: (ChessPiece | null)[][]): { white: number; black: number; advantage: number } {
    let whiteTotal = 0;
    let blackTotal = 0;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          const value = ChessRenderer.getPieceValue(piece.type);
          if (piece.color === PieceColor.WHITE) {
            whiteTotal += value;
          } else {
            blackTotal += value;
          }
        }
      }
    }
    
    return {
      white: whiteTotal,
      black: blackTotal,
      advantage: whiteTotal - blackTotal,
    };
  }

  /**
   * Generate CSS classes for a square
   */
  static getSquareClasses(
    position: Position, 
    isSelected: boolean, 
    isValidMove: boolean, 
    isLastMove: boolean,
    isInCheck: boolean
  ): string[] {
    const classes: string[] = [];
    
    classes.push('chess-square');
    classes.push(ChessRenderer.getSquareColor(position));
    
    if (isSelected) classes.push('selected');
    if (isValidMove) classes.push('valid-move');
    if (isLastMove) classes.push('last-move');
    if (isInCheck) classes.push('in-check');
    
    return classes;
  }

  /**
   * Generate CSS classes for a piece
   */
  static getPieceClasses(piece: ChessPiece, isDragging: boolean, isAnimating: boolean): string[] {
    const classes: string[] = [];
    
    classes.push('chess-piece');
    classes.push(`piece-${piece.color}`);
    classes.push(`piece-${piece.type}`);
    
    if (isDragging) classes.push('dragging');
    if (isAnimating) classes.push('animating');
    if (piece.hasMoved) classes.push('has-moved');
    
    return classes;
  }

  /**
   * Get animation duration based on move distance
   */
  static getAnimationDuration(from: Position, to: Position): number {
    const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
    return Math.min(300 + distance * 50, 800); // 300-800ms based on distance
  }

  /**
   * Generate board coordinates for display
   */
  static getBoardCoordinates(): { files: string[]; ranks: string[] } {
    return {
      files: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      ranks: ['8', '7', '6', '5', '4', '3', '2', '1'],
    };
  }

  /**
   * Get board orientation classes
   */
  static getBoardOrientationClasses(playerColor: PieceColor): string[] {
    const classes = ['chess-board'];
    
    if (playerColor === PieceColor.BLACK) {
      classes.push('flipped');
    }
    
    return classes;
  }

  /**
   * Format game time for display
   */
  static formatGameTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get status message for game state
   */
  static getStatusMessage(
    currentPlayer: PieceColor,
    isCheck: boolean,
    isCheckmate: boolean,
    isStalemate: boolean,
    isGameOver: boolean
  ): string {
    if (isCheckmate) {
      const winner = currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
      return `Checkmate! ${winner} wins!`;
    }
    
    if (isStalemate) {
      return 'Stalemate! Game is a draw.';
    }
    
    if (isGameOver) {
      return 'Game Over';
    }
    
    if (isCheck) {
      return `${currentPlayer} is in check!`;
    }
    
    return `${currentPlayer} to move`;
  }

  /**
   * Get CSS custom properties for theming
   */
  static getThemeProperties(theme: 'light' | 'dark' | 'auto' = 'auto'): Record<string, string> {
    const themes = {
      light: {
        '--board-light-square': '#f0d9b5',
        '--board-dark-square': '#b58863',
        '--board-border': '#8b4513',
        '--piece-white': '#ffffff',
        '--piece-black': '#000000',
        '--highlight-selected': 'rgba(255, 255, 0, 0.4)',
        '--highlight-valid-move': 'rgba(0, 255, 0, 0.3)',
        '--highlight-last-move': 'rgba(255, 165, 0, 0.4)',
        '--highlight-check': 'rgba(255, 0, 0, 0.5)',
      },
      dark: {
        '--board-light-square': '#769656',
        '--board-dark-square': '#eeeed2',
        '--board-border': '#2d2d2d',
        '--piece-white': '#f8f8f8',
        '--piece-black': '#1a1a1a',
        '--highlight-selected': 'rgba(255, 255, 100, 0.6)',
        '--highlight-valid-move': 'rgba(100, 255, 100, 0.4)',
        '--highlight-last-move': 'rgba(255, 200, 100, 0.5)',
        '--highlight-check': 'rgba(255, 100, 100, 0.6)',
      },
    };
    
    if (theme === 'auto') {
      // You could detect system preference here
      theme = 'light';
    }
    
    return themes[theme];
  }
}
