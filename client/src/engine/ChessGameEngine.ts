import { 
  GameState, 
  ChessPiece, 
  Position, 
  Move, 
  PieceType, 
  PieceColor, 
  GameStatus,
  GameResult 
} from '../types/gameState';

/**
 * Pure chess game logic engine - no side effects, UI dependencies, or state mutations
 * All methods are pure functions that return new state objects
 */
export class ChessGameEngine {
  
  /**
   * Create initial game state
   */
  static createInitialState(gameId: string, whitePlayer: string, blackPlayer: string): GameState {
    const board = ChessGameEngine.createInitialBoard();
    
    return {
      id: gameId,
      board,
      currentPlayer: PieceColor.WHITE,
      players: {
        white: whitePlayer,
        black: blackPlayer,
      },
      moves: [],
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
    };
  }

  /**
   * Create the initial chess board setup
   */
  private static createInitialBoard(): (ChessPiece | null)[][] {
    const board: (ChessPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // White pieces
    board[7] = [
      ChessGameEngine.createPiece('r1', PieceType.ROOK, PieceColor.WHITE, { x: 0, y: 7 }),
      ChessGameEngine.createPiece('n1', PieceType.KNIGHT, PieceColor.WHITE, { x: 1, y: 7 }),
      ChessGameEngine.createPiece('b1', PieceType.BISHOP, PieceColor.WHITE, { x: 2, y: 7 }),
      ChessGameEngine.createPiece('q1', PieceType.QUEEN, PieceColor.WHITE, { x: 3, y: 7 }),
      ChessGameEngine.createPiece('k1', PieceType.KING, PieceColor.WHITE, { x: 4, y: 7 }),
      ChessGameEngine.createPiece('b2', PieceType.BISHOP, PieceColor.WHITE, { x: 5, y: 7 }),
      ChessGameEngine.createPiece('n2', PieceType.KNIGHT, PieceColor.WHITE, { x: 6, y: 7 }),
      ChessGameEngine.createPiece('r2', PieceType.ROOK, PieceColor.WHITE, { x: 7, y: 7 }),
    ];
    
    for (let x = 0; x < 8; x++) {
      board[6][x] = ChessGameEngine.createPiece(`p${x + 1}`, PieceType.PAWN, PieceColor.WHITE, { x, y: 6 });
    }
    
    // Black pieces
    board[0] = [
      ChessGameEngine.createPiece('R1', PieceType.ROOK, PieceColor.BLACK, { x: 0, y: 0 }),
      ChessGameEngine.createPiece('N1', PieceType.KNIGHT, PieceColor.BLACK, { x: 1, y: 0 }),
      ChessGameEngine.createPiece('B1', PieceType.BISHOP, PieceColor.BLACK, { x: 2, y: 0 }),
      ChessGameEngine.createPiece('Q1', PieceType.QUEEN, PieceColor.BLACK, { x: 3, y: 0 }),
      ChessGameEngine.createPiece('K1', PieceType.KING, PieceColor.BLACK, { x: 4, y: 0 }),
      ChessGameEngine.createPiece('B2', PieceType.BISHOP, PieceColor.BLACK, { x: 5, y: 0 }),
      ChessGameEngine.createPiece('N2', PieceType.KNIGHT, PieceColor.BLACK, { x: 6, y: 0 }),
      ChessGameEngine.createPiece('R2', PieceType.ROOK, PieceColor.BLACK, { x: 7, y: 0 }),
    ];
    
    for (let x = 0; x < 8; x++) {
      board[1][x] = ChessGameEngine.createPiece(`P${x + 1}`, PieceType.PAWN, PieceColor.BLACK, { x, y: 1 });
    }
    
    return board;
  }

  /**
   * Create a chess piece
   */
  private static createPiece(id: string, type: PieceType, color: PieceColor, position: Position): ChessPiece {
    return {
      id,
      type,
      color,
      position,
      hasMoved: false,
    };
  }

  /**
   * Validate if a move is legal
   */
  static isValidMove(gameState: GameState, from: Position, to: Position): boolean {
    const piece = gameState.board[from.y][from.x];
    
    if (!piece) return false;
    if (piece.color !== gameState.currentPlayer) return false;
    if (!ChessGameEngine.isPositionOnBoard(to)) return false;
    
    const targetPiece = gameState.board[to.y][to.x];
    if (targetPiece && targetPiece.color === piece.color) return false;
    
    // Check piece-specific movement rules
    if (!ChessGameEngine.isValidPieceMove(gameState, piece, from, to)) return false;
    
    // Check if move would leave king in check - use basic move without game-ending checks
    const hypotheticalState = ChessGameEngine.makeMoveBasic(gameState, from, to);
    if (ChessGameEngine.isKingInCheck(hypotheticalState, piece.color)) return false;
    
    return true;
  }

  /**
   * Execute a move without checking for game-ending conditions (for validation purposes)
   */
  private static makeMoveBasic(gameState: GameState, from: Position, to: Position): GameState {
    const newBoard = gameState.board.map(row => [...row]);
    const piece = newBoard[from.y][from.x];
    
    if (!piece) return gameState;
    
    // Move the piece
    newBoard[to.y][to.x] = {
      ...piece,
      position: to,
      hasMoved: true,
    };
    newBoard[from.y][from.x] = null;
    
    // Handle pawn promotion
    if (piece.type === PieceType.PAWN) {
      const promotionRank = piece.color === PieceColor.WHITE ? 0 : 7;
      if (to.y === promotionRank) {
        // Auto-promote to Queen
        newBoard[to.y][to.x] = {
          ...newBoard[to.y][to.x]!,
          type: PieceType.QUEEN,
        };
      }
    }
    
    // Handle castling - move the rook too
    if (piece.type === PieceType.KING && Math.abs(to.x - from.x) === 2) {
      const isKingSide = to.x > from.x;
      const rookFromX = isKingSide ? 7 : 0;
      const rookToX = isKingSide ? 5 : 3;
      const rookY = from.y;
      
      // Move the rook
      const rook = newBoard[rookY][rookFromX];
      if (rook) {
        newBoard[rookY][rookToX] = {
          ...rook,
          position: { x: rookToX, y: rookY },
          hasMoved: true,
        };
        newBoard[rookY][rookFromX] = null;
      }
    }
    
    // Update castling rights
    const newCastlingRights = ChessGameEngine.updateCastlingRights(gameState.castlingRights, piece, from);
    
    // Create new game state without game-ending checks
    const newState: GameState = {
      ...gameState,
      board: newBoard,
      currentPlayer: piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE,
      castlingRights: newCastlingRights,
    };
    
    return newState;
  }

  /**
   * Execute a move and return new game state
   */
  static makeMove(gameState: GameState, from: Position, to: Position): GameState {
    const newBoard = gameState.board.map(row => [...row]);
    const piece = newBoard[from.y][from.x];
    const capturedPiece = newBoard[to.y][to.x];
    
    if (!piece) return gameState;
    
    // Move the piece
    newBoard[to.y][to.x] = {
      ...piece,
      position: to,
      hasMoved: true,
    };
    newBoard[from.y][from.x] = null;
    
    // Handle pawn promotion
    let promotedTo: PieceType | undefined;
    if (piece.type === PieceType.PAWN) {
      const promotionRank = piece.color === PieceColor.WHITE ? 0 : 7;
      if (to.y === promotionRank) {
        // Auto-promote to Queen
        promotedTo = PieceType.QUEEN;
        newBoard[to.y][to.x] = {
          ...newBoard[to.y][to.x]!,
          type: PieceType.QUEEN,
        };
        console.log(`Pawn promoted to Queen! ${piece.color} pawn at ${to.x},${to.y}`);
      }
    }
    
    // Handle castling - move the rook too
    let isCastling = false;
    if (piece.type === PieceType.KING && Math.abs(to.x - from.x) === 2) {
      isCastling = true;
      const isKingSide = to.x > from.x;
      const rookFromX = isKingSide ? 7 : 0;
      const rookToX = isKingSide ? 5 : 3;
      const rookY = from.y;
      
      // Move the rook
      const rook = newBoard[rookY][rookFromX];
      if (rook) {
        newBoard[rookY][rookToX] = {
          ...rook,
          position: { x: rookToX, y: rookY },
          hasMoved: true,
        };
        newBoard[rookY][rookFromX] = null;
        console.log(`Castling! ${piece.color} ${isKingSide ? 'king-side' : 'queen-side'}`);
      }
    }
    
    // Create move record
    const move: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined,
      promotedTo,
      isCastling,
      timestamp: new Date(),
      player: gameState.players[piece.color],
    };
    
    // Update castling rights
    const newCastlingRights = ChessGameEngine.updateCastlingRights(gameState.castlingRights, piece, from);
    
    // Create new game state
    const newState: GameState = {
      ...gameState,
      board: newBoard,
      currentPlayer: piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE,
      moves: [...gameState.moves, move],
      castlingRights: newCastlingRights,
    };
    
    // Check game ending conditions
    const opponentColor = piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    newState.isCheck = ChessGameEngine.isKingInCheck(newState, opponentColor);
    newState.isCheckmate = ChessGameEngine.isCheckmate(newState, opponentColor);
    newState.isStalemate = ChessGameEngine.isStalemate(newState, opponentColor);
    newState.isGameOver = newState.isCheckmate || newState.isStalemate;
    
    if (newState.isCheckmate) {
      newState.winner = piece.color;
    }
    
    return newState;
  }

  /**
   * Get all valid moves for a piece
   */
  static getValidMoves(gameState: GameState, position: Position): Position[] {
    const validMoves: Position[] = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const to = { x, y };
        if (ChessGameEngine.isValidMove(gameState, position, to)) {
          validMoves.push(to);
        }
      }
    }
    
    return validMoves;
  }

  /**
   * Get all possible moves for the current player - ESSENTIAL FOR AI
   */
  static getAllPossibleMoves(gameState: GameState, color?: PieceColor): Array<{from: Position, to: Position, piece: ChessPiece}> {
    const playerColor = color || gameState.currentPlayer;
    const allMoves: Array<{from: Position, to: Position, piece: ChessPiece}> = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === playerColor) {
          const from = { x, y };
          const validMoves = ChessGameEngine.getValidMoves(gameState, from);
          
          validMoves.forEach(to => {
            allMoves.push({ from, to, piece });
          });
        }
      }
    }
    
    return allMoves;
  }

  /**
   * Get all pieces of a specific color - USEFUL FOR AI ANALYSIS
   */
  static getPiecesByColor(gameState: GameState, color: PieceColor): Array<{piece: ChessPiece, position: Position}> {
    const pieces: Array<{piece: ChessPiece, position: Position}> = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === color) {
          pieces.push({ piece, position: { x, y } });
        }
      }
    }
    
    return pieces;
  }

  /**
   * Evaluate position score for AI - ESSENTIAL FOR AI DECISION MAKING
   */
  static evaluatePosition(gameState: GameState): number {
    let score = 0;
    
    // Material value calculation
    const pieceValues = {
      [PieceType.PAWN]: 1,
      [PieceType.KNIGHT]: 3,
      [PieceType.BISHOP]: 3,
      [PieceType.ROOK]: 5,
      [PieceType.QUEEN]: 9,
      [PieceType.KING]: 0,
    };
    
    // Position bonuses for pieces (simplified)
    const centerSquares = [
      {x: 3, y: 3}, {x: 3, y: 4}, {x: 4, y: 3}, {x: 4, y: 4}
    ];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          let pieceScore = pieceValues[piece.type];
          
          // Bonus for central control
          if (centerSquares.some(center => center.x === x && center.y === y)) {
            pieceScore += 0.1;
          }
          
          // Bonus for piece development (not in starting position)
          if (piece.hasMoved && (piece.type === PieceType.KNIGHT || piece.type === PieceType.BISHOP)) {
            pieceScore += 0.1;
          }
          
          score += piece.color === PieceColor.WHITE ? pieceScore : -pieceScore;
        }
      }
    }
    
    // Bonus/penalty for check
    if (gameState.isCheck) {
      score += gameState.currentPlayer === PieceColor.WHITE ? -0.5 : 0.5;
    }
    
    // Major bonus/penalty for checkmate
    if (gameState.isCheckmate) {
      score += gameState.winner === PieceColor.WHITE ? 1000 : -1000;
    }
    
    return score;
  }

  /**
   * Check if a position is under attack by opponent - USEFUL FOR AI SAFETY
   */
  static isPositionUnderAttack(gameState: GameState, position: Position, byColor: PieceColor): boolean {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === byColor) {
          // Check if this piece can attack the target position
          if (ChessGameEngine.isValidPieceMove(gameState, piece, { x, y }, position)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Count attackers and defenders of a position - ADVANCED AI ANALYSIS
   */
  static getPositionAttackersDefenders(gameState: GameState, position: Position): {
    attackers: ChessPiece[],
    defenders: ChessPiece[],
    attackerCount: number,
    defenderCount: number
  } {
    const attackers: ChessPiece[] = [];
    const defenders: ChessPiece[] = [];
    const targetPiece = gameState.board[position.y][position.x];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && ChessGameEngine.isValidPieceMove(gameState, piece, { x, y }, position)) {
          if (targetPiece && piece.color !== targetPiece.color) {
            attackers.push(piece);
          } else if (targetPiece && piece.color === targetPiece.color) {
            defenders.push(piece);
          }
        }
      }
    }
    
    return {
      attackers,
      defenders,
      attackerCount: attackers.length,
      defenderCount: defenders.length
    };
  }

  /**
   * Check piece-specific movement rules
   */
  private static isValidPieceMove(gameState: GameState, piece: ChessPiece, from: Position, to: Position): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    switch (piece.type) {
      case PieceType.PAWN:
        return ChessGameEngine.isValidPawnMove(gameState, piece, from, to, dx, dy);
      case PieceType.ROOK:
        return ChessGameEngine.isValidRookMove(gameState, from, to, dx, dy);
      case PieceType.BISHOP:
        return ChessGameEngine.isValidBishopMove(gameState, from, to, dx, dy);
      case PieceType.QUEEN:
        return ChessGameEngine.isValidQueenMove(gameState, from, to, dx, dy);
      case PieceType.KING:
        return ChessGameEngine.isValidKingMove(gameState, piece, from, to, dx, dy);
      case PieceType.KNIGHT:
        return ChessGameEngine.isValidKnightMove(dx, dy);
      default:
        return false;
    }
  }

  private static isValidPawnMove(gameState: GameState, piece: ChessPiece, from: Position, to: Position, dx: number, dy: number): boolean {
    const direction = piece.color === PieceColor.WHITE ? -1 : 1;
    const startRow = piece.color === PieceColor.WHITE ? 6 : 1;
    const targetPiece = gameState.board[to.y][to.x];
    
    // Forward move
    if (dx === 0) {
      if (dy === direction && !targetPiece) return true;
      if (dy === 2 * direction && from.y === startRow && !targetPiece && !gameState.board[from.y + direction][from.x]) return true;
    }
    
    // Diagonal capture
    if (Math.abs(dx) === 1 && dy === direction) {
      if (targetPiece && targetPiece.color !== piece.color) return true;
      // En passant logic would go here
    }
    
    return false;
  }

  private static isValidRookMove(gameState: GameState, from: Position, to: Position, dx: number, dy: number): boolean {
    if (dx !== 0 && dy !== 0) return false;
    return ChessGameEngine.isPathClear(gameState, from, to);
  }

  private static isValidBishopMove(gameState: GameState, from: Position, to: Position, dx: number, dy: number): boolean {
    if (Math.abs(dx) !== Math.abs(dy)) return false;
    return ChessGameEngine.isPathClear(gameState, from, to);
  }

  private static isValidQueenMove(gameState: GameState, from: Position, to: Position, dx: number, dy: number): boolean {
    const isRookMove = (dx === 0 || dy === 0);
    const isBishopMove = (Math.abs(dx) === Math.abs(dy));
    if (!isRookMove && !isBishopMove) return false;
    return ChessGameEngine.isPathClear(gameState, from, to);
  }

  private static isValidKingMove(gameState: GameState, piece: ChessPiece, from: Position, to: Position, dx: number, dy: number): boolean {
    // Normal king move (one square in any direction)
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
    
    // Castling: King moves 2 squares horizontally
    if (Math.abs(dx) === 2 && dy === 0) {
      return ChessGameEngine.canCastle(gameState, piece, from, to);
    }
    
    return false;
  }

  private static isValidKnightMove(dx: number, dy: number): boolean {
    return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
  }

  /**
   * Check if path between two positions is clear
   */
  private static isPathClear(gameState: GameState, from: Position, to: Position): boolean {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    
    let x = from.x + dx;
    let y = from.y + dy;
    
    while (x !== to.x || y !== to.y) {
      if (gameState.board[y][x] !== null) return false;
      x += dx;
      y += dy;
    }
    
    return true;
  }

  /**
   * Check if a position is on the board
   */
  private static isPositionOnBoard(position: Position): boolean {
    return position.x >= 0 && position.x < 8 && position.y >= 0 && position.y < 8;
  }

  /**
   * Check if king is in check - PUBLIC for AI analysis
   */
  static isKingInCheck(gameState: GameState, color: PieceColor): boolean {
    const kingPosition = ChessGameEngine.findKing(gameState, color);
    if (!kingPosition) return false;
    
    const opponentColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    
    // Check if any opponent piece can attack the king
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === opponentColor) {
          if (ChessGameEngine.isValidPieceMove(gameState, piece, { x, y }, kingPosition)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Find king position
   */
  static findKing(gameState: GameState, color: PieceColor): Position | null {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * Check if it's checkmate
   */
  private static isCheckmate(gameState: GameState, color: PieceColor): boolean {
    if (!ChessGameEngine.isKingInCheck(gameState, color)) return false;
    
    // If king is in check, see if there are any legal moves
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === color) {
          const validMoves = ChessGameEngine.getValidMoves(gameState, { x, y });
          if (validMoves.length > 0) return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if it's stalemate
   */
  private static isStalemate(gameState: GameState, color: PieceColor): boolean {
    if (ChessGameEngine.isKingInCheck(gameState, color)) return false;
    
    // If king is not in check, see if there are any legal moves
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === color) {
          const validMoves = ChessGameEngine.getValidMoves(gameState, { x, y });
          if (validMoves.length > 0) return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if castling is valid
   */
  private static canCastle(gameState: GameState, king: ChessPiece, from: Position, to: Position): boolean {
    // King must not have moved
    if (king.hasMoved) return false;
    
    // King must not be in check
    if (ChessGameEngine.isKingInCheck(gameState, king.color)) return false;
    
    const isKingSide = to.x > from.x;
    const isWhite = king.color === PieceColor.WHITE;
    
    // Check castling rights
    if (isWhite) {
      if (isKingSide && !gameState.castlingRights.whiteKingSide) return false;
      if (!isKingSide && !gameState.castlingRights.whiteQueenSide) return false;
    } else {
      if (isKingSide && !gameState.castlingRights.blackKingSide) return false;
      if (!isKingSide && !gameState.castlingRights.blackQueenSide) return false;
    }
    
    // Find the rook
    const rookX = isKingSide ? 7 : 0;
    const rookY = isWhite ? 7 : 0;
    const rook = gameState.board[rookY][rookX];
    
    // Rook must exist, be the same color, and not have moved
    if (!rook || rook.color !== king.color || rook.type !== PieceType.ROOK || rook.hasMoved) {
      return false;
    }
    
    // Path between king and rook must be clear
    const startX = Math.min(from.x, rookX);
    const endX = Math.max(from.x, rookX);
    for (let x = startX + 1; x < endX; x++) {
      if (gameState.board[from.y][x] !== null) return false;
    }
    
    // King must not pass through or end up in check
    const kingPath = isKingSide ? [from.x + 1, from.x + 2] : [from.x - 1, from.x - 2];
    for (const x of kingPath) {
      const testState = {
        ...gameState,
        board: gameState.board.map(row => [...row])
      };
      // Temporarily place king at this position
      testState.board[from.y][from.x] = null;
      testState.board[from.y][x] = { ...king, position: { x, y: from.y } };
      
      if (ChessGameEngine.isKingInCheck(testState, king.color)) return false;
    }
    
    return true;
  }

  /**
   * Update castling rights based on piece movement
   */
  private static updateCastlingRights(
    currentRights: GameState['castlingRights'], 
    piece: ChessPiece, 
    from: Position
  ): GameState['castlingRights'] {
    const newRights = { ...currentRights };
    
    // King moved
    if (piece.type === PieceType.KING) {
      if (piece.color === PieceColor.WHITE) {
        newRights.whiteKingSide = false;
        newRights.whiteQueenSide = false;
      } else {
        newRights.blackKingSide = false;
        newRights.blackQueenSide = false;
      }
    }
    
    // Rook moved
    if (piece.type === PieceType.ROOK) {
      if (piece.color === PieceColor.WHITE) {
        if (from.x === 0 && from.y === 7) newRights.whiteQueenSide = false;
        if (from.x === 7 && from.y === 7) newRights.whiteKingSide = false;
      } else {
        if (from.x === 0 && from.y === 0) newRights.blackQueenSide = false;
        if (from.x === 7 && from.y === 0) newRights.blackKingSide = false;
      }
    }
    
    return newRights;
  }

  /**
   * Evaluate game result
   */
  static evaluateGameResult(gameState: GameState): GameResult | null {
    if (!gameState.isGameOver) return null;
    
    if (gameState.isCheckmate) {
      return {
        status: GameStatus.CHECKMATE,
        winner: gameState.winner,
        reason: `Checkmate! ${gameState.winner} wins.`,
        finalPosition: gameState,
      };
    }
    
    if (gameState.isStalemate) {
      return {
        status: GameStatus.STALEMATE,
        reason: 'Stalemate! Game is a draw.',
        finalPosition: gameState,
      };
    }
    
    return {
      status: GameStatus.DRAW,
      reason: 'Game ended in a draw.',
      finalPosition: gameState,
    };
  }
}
