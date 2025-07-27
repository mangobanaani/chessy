import { GameState, Move, PieceColor, PieceType } from '../types/gameState';
import { ChessGameEngine } from './ChessGameEngine';

/**
 * Chess Opening Book for AI Engine
 * 
 * Provides opening theory knowledge to the AI including:
 * - Common opening sequences and variations
 * - Opening evaluations and best responses
 * - General opening principles when out of book
 * - Position evaluation for opening phase
 * 
 * @example
 * ```typescript
 * const bookMove = OpeningBook.getBookMove(gameState);
 * if (bookMove) {
 *   // Use book move
 * } else {
 *   // Fall back to search engine
 * }
 * ```
 */
export class OpeningBook {
  
  /** Constants for opening evaluation and scoring */
  private static readonly OPENING_CONSTANTS = {
    MAX_OPENING_MOVES: 20,
    MAX_DEVELOPED_PIECES: 6,
    PIECE_DEVELOPMENT_BONUS: 30,
    CENTER_CONTROL_BONUS: 20,
    CASTLING_BONUS: 25,
    CENTRAL_PAWN_BONUS: 15,
    PIECE_REPETITION_PENALTY: 10,
    DEVELOPMENT_EVALUATION_WEIGHT: 10,
    CENTER_CONTROL_EVALUATION_WEIGHT: 15,
    KING_SAFETY_BONUS: 10,
    RANDOM_BOOK_MOVES: 2
  } as const;

  /** Center squares for evaluation */
  private static readonly CENTER_SQUARES = [
    { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 4 }
  ] as const;
  
  /**
   * Famous opening sequences with evaluations and responses
   * Key format: algebraic notation sequence separated by hyphens
   */
  private static readonly OPENINGS: { [key: string]: OpeningData } = {
    // King's Pawn openings
    'e4': {
      name: "King's Pawn",
      moves: ['e2-e4'],
      evaluation: 0.3,
      responses: {
        'e5': { moves: ['e7-e5'], evaluation: 0, nextMoves: ['Nf3', 'Bc4', 'd3'] },
        'c5': { moves: ['c7-c5'], evaluation: 0.1, nextMoves: ['Nf3', 'd3', 'Bb5+'] },
        'e6': { moves: ['e7-e6'], evaluation: 0.2, nextMoves: ['d4', 'Nf3', 'Nc3'] },
        'c6': { moves: ['c7-c6'], evaluation: 0.2, nextMoves: ['d4', 'Nc3', 'Nf3'] }
      }
    },
    
    // Queen's Pawn openings
    'd4': {
      name: "Queen's Pawn",
      moves: ['d2-d4'],
      evaluation: 0.2,
      responses: {
        'd5': { moves: ['d7-d5'], evaluation: 0, nextMoves: ['c4', 'Nf3', 'Bg5'] },
        'Nf6': { moves: ['g8-f6'], evaluation: 0.1, nextMoves: ['c4', 'Nf3', 'Bg5'] },
        'f5': { moves: ['f7-f5'], evaluation: -0.1, nextMoves: ['c4', 'Nf3', 'g3'] }
      }
    },
    
    // English Opening
    'c4': {
      name: 'English Opening',
      moves: ['c2-c4'],
      evaluation: 0.2,
      responses: {
        'e5': { moves: ['e7-e5'], evaluation: 0, nextMoves: ['Nc3', 'g3', 'Nf3'] },
        'Nf6': { moves: ['g8-f6'], evaluation: 0.1, nextMoves: ['Nc3', 'd4', 'Nf3'] },
        'c5': { moves: ['c7-c5'], evaluation: 0, nextMoves: ['Nc3', 'g3', 'Nf3'] }
      }
    },
    
    // Ruy Lopez (after 1.e4 e5 2.Nf3 Nc6)
    'e4-e5-Nf3-Nc6-Bb5': {
      name: 'Ruy Lopez',
      moves: ['e2-e4', 'e7-e5', 'g1-f3', 'b8-c6', 'f1-b5'],
      evaluation: 0.4,
      responses: {
        'a6': { moves: ['a7-a6'], evaluation: 0.2, nextMoves: ['Ba4', 'Bxc6', 'Bc4'] },
        'f5': { moves: ['f7-f5'], evaluation: 0.1, nextMoves: ['d3', 'Nc3', 'exf5'] },
        'Nf6': { moves: ['g8-f6'], evaluation: 0.3, nextMoves: ['O-O', 'd3', 'Re1'] }
      }
    },
    
    // Italian Game
    'e4-e5-Nf3-Nc6-Bc4': {
      name: 'Italian Game',
      moves: ['e2-e4', 'e7-e5', 'g1-f3', 'b8-c6', 'f1-c4'],
      evaluation: 0.3,
      responses: {
        'Bc5': { moves: ['f8-c5'], evaluation: 0.1, nextMoves: ['d3', 'c3', 'O-O'] },
        'f5': { moves: ['f7-f5'], evaluation: 0.2, nextMoves: ['d3', 'Ng5', 'Qh5+'] },
        'Be7': { moves: ['f8-e7'], evaluation: 0.2, nextMoves: ['d3', 'O-O', 'Re1'] }
      }
    },
    
    // Queen's Gambit
    'd4-d5-c4': {
      name: "Queen's Gambit",
      moves: ['d2-d4', 'd7-d5', 'c2-c4'],
      evaluation: 0.3,
      responses: {
        'dxc4': { moves: ['d5-c4'], evaluation: 0.1, nextMoves: ['e3', 'Nf3', 'Bxc4'] },
        'e6': { moves: ['e7-e6'], evaluation: 0.2, nextMoves: ['Nc3', 'Nf3', 'Bg5'] },
        'c6': { moves: ['c7-c6'], evaluation: 0.1, nextMoves: ['Nf3', 'Nc3', 'e3'] }
      }
    }
  };
  
  /**
   * Retrieves the best opening book move for the current position
   * 
   * @param gameState - Current game state to analyze
   * @returns Best book move if found, null if position not in book
   * 
   * The method follows this priority:
   * 1. Exact opening sequence match
   * 2. Partial sequence matches for variations
   * 3. General opening principles as fallback
   */
  static getBookMove(gameState: GameState): Move | null {
    const moveSequence = OpeningBook.getMovesFromStart(gameState);
    const sequenceKey = moveSequence.join('-');
    
    // Attempt exact opening match
    const opening = OpeningBook.OPENINGS[sequenceKey];
    if (opening) {
      return OpeningBook.selectMoveFromOpening(gameState, opening);
    }
    
    // Search for partial matches and variations
    for (const [key, openingData] of Object.entries(OpeningBook.OPENINGS)) {
      if (sequenceKey.startsWith(key) || key.startsWith(sequenceKey)) {
        const response = OpeningBook.findResponse(moveSequence, openingData);
        if (response) {
          return OpeningBook.convertNotationToMove(gameState, response);
        }
      }
    }
    
    // Apply general opening principles when out of book
    return OpeningBook.getGeneralOpeningMove(gameState);
  }

  /**
   * Determines if the current position is still in the opening phase
   * 
   * @param gameState - Current game state to evaluate
   * @returns True if position is considered opening phase
   * 
   * Opening phase criteria:
   * - Fewer than 20 total moves (10 per side)
   * - Fewer than 6 pieces developed from starting squares
   */
  static isInOpeningPhase(gameState: GameState): boolean {
    const totalMoves = gameState.moves.length;
    const developedPieces = OpeningBook.countDevelopedPieces(gameState);
    
    return totalMoves < OpeningBook.OPENING_CONSTANTS.MAX_OPENING_MOVES && 
           developedPieces < OpeningBook.OPENING_CONSTANTS.MAX_DEVELOPED_PIECES;
  }

  /**
   * Calculates comprehensive opening evaluation for the current position
   * 
   * @param gameState - Current game state to evaluate
   * @returns Overall opening evaluation (positive favors white)
   * 
   * Evaluation factors:
   * - Piece development progress
   * - Center control and pawn structure  
   * - King safety and castling rights
   * - Overall positional characteristics
   */
  static getOpeningEvaluation(gameState: GameState): number {
    let evaluation = 0;
    
    // Weight different opening factors
    evaluation += OpeningBook.evaluateDevelopment(gameState);
    evaluation += OpeningBook.evaluateCenterControl(gameState);
    evaluation += OpeningBook.evaluateKingSafety(gameState);
    evaluation += OpeningBook.evaluatePawnStructure(gameState);
    
    return evaluation;
  }

  /**
   * Extracts move sequence from game start to current position
   * 
   * @param gameState - Current game state
   * @returns Array of move notations from game start
   */
  private static getMovesFromStart(gameState: GameState): string[] {
    return gameState.moves.map(move => 
      OpeningBook.moveToNotation(move)
    );
  }

  /**
   * Selects the best move from opening database entry
   * 
   * @param gameState - Current game state
   * @param opening - Opening data to select from
   * @returns Best move from opening, or null if none available
   */
  private static selectMoveFromOpening(gameState: GameState, opening: OpeningData): Move | null {
    const lastMove = gameState.moves[gameState.moves.length - 1];
    const lastMoveNotation = lastMove ? OpeningBook.moveToNotation(lastMove) : '';
    
    if (opening.responses && opening.responses[lastMoveNotation]) {
      const response = opening.responses[lastMoveNotation];
      if (response && response.nextMoves && response.nextMoves.length > 0) {
        const bestMove = response.nextMoves[0]; // Select highest priority move
        if (bestMove) {
          return OpeningBook.convertNotationToMove(gameState, bestMove);
        }
      }
    }
    
    return null;
  }

  /**
   * Finds appropriate response move in opening tree
   * 
   * @param moveSequence - Sequence of moves played so far
   * @param opening - Opening database entry to search
   * @returns Move notation for response, or null if none found
   */
  private static findResponse(moveSequence: string[], opening: OpeningData): string | null {
    if (!opening.responses) return null;
    
    const lastMove = moveSequence[moveSequence.length - 1];
    if (!lastMove) return null;
    
    const response = opening.responses[lastMove];
    
    if (response && response.nextMoves && response.nextMoves.length > 0) {
      // Add controlled randomness to book moves for variety
      const maxMoves = Math.min(OpeningBook.OPENING_CONSTANTS.RANDOM_BOOK_MOVES, response.nextMoves.length);
      const moveIndex = Math.floor(Math.random() * maxMoves);
      const selectedMove = response.nextMoves[moveIndex];
      return selectedMove || null;
    }
    
    return null;
  }

  /**
   * Converts algebraic notation to a Move object
   * 
   * @param gameState - Current game state for move validation
   * @param notation - Chess notation (e.g., "Nf3", "e4", "O-O")
   * @returns Move object if notation is valid, null otherwise
   * 
   * Supports standard algebraic notation including:
   * - Piece moves (Nf3, Bc4)
   * - Pawn moves (e4, d5)
   * - Captures (Bxf7, exd5)
   * - Castling (O-O, O-O-O)
   * - Disambiguation (Nbd2, R1e1)
   */
  private static convertNotationToMove(gameState: GameState, notation: string): Move | null {
    if (!notation) return null;
    
    try {
      // Handle castling first
      if (notation === 'O-O' || notation === '0-0') {
        return OpeningBook.findCastlingMove(gameState, 'kingside');
      }
      if (notation === 'O-O-O' || notation === '0-0-0') {
        return OpeningBook.findCastlingMove(gameState, 'queenside');
      }
      
      const allMoves = ChessGameEngine.getAllPossibleMoves(gameState, gameState.currentPlayer);
      
      // Convert possible moves to Move objects for comparison
      const moves: Move[] = allMoves.map(pm => {
        const targetSquare = gameState.board[pm.to.y]?.[pm.to.x];
        return {
          from: pm.from,
          to: pm.to,
          piece: pm.piece,
          capturedPiece: targetSquare || undefined,
          timestamp: new Date(),
          player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
          notation: OpeningBook.generateAlgebraicNotation(gameState, pm.from, pm.to, pm.piece)
        };
      });
      
      // Find move that matches the notation
      return moves.find(move => 
        move.notation === notation || 
        (move.notation && OpeningBook.normalizeNotation(move.notation) === OpeningBook.normalizeNotation(notation))
      ) || null;
      
    } catch (error) {
      console.warn(`Failed to convert notation "${notation}" to move:`, error);
      return null;
    }
  }

  /**
   * Finds castling move for the current player
   */
  private static findCastlingMove(gameState: GameState, side: 'kingside' | 'queenside'): Move | null {
    const allMoves = ChessGameEngine.getAllPossibleMoves(gameState, gameState.currentPlayer);
    
    for (const move of allMoves) {
      if (move.piece.type === PieceType.KING) {
        const deltaX = Math.abs(move.to.x - move.from.x);
        if (deltaX === 2) {
          const isKingside = move.to.x > move.from.x;
          if ((side === 'kingside' && isKingside) || (side === 'queenside' && !isKingside)) {
            return {
              from: move.from,
              to: move.to,
              piece: move.piece,
              capturedPiece: undefined, // Castling never captures
              isCastling: true,
              timestamp: new Date(),
              player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
              notation: side === 'kingside' ? 'O-O' : 'O-O-O'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Generates algebraic notation for a move
   */
  private static generateAlgebraicNotation(gameState: GameState, from: any, to: any, piece: any): string {
    // Simplified notation generation - can be enhanced for full standard compliance
    const pieceSymbol = piece.type === PieceType.PAWN ? '' : piece.type.charAt(0).toUpperCase();
    const toSquare = String.fromCharCode(97 + to.x) + (8 - to.y);
    const isCapture = gameState.board[to.y]?.[to.x] !== null;
    
    if (piece.type === PieceType.PAWN && isCapture) {
      const fromFile = String.fromCharCode(97 + from.x);
      return `${fromFile}x${toSquare}`;
    }
    
    return `${pieceSymbol}${isCapture ? 'x' : ''}${toSquare}`;
  }

  /**
   * Normalizes notation for comparison
   */
  private static normalizeNotation(notation: string): string {
    return notation.replace(/[+#]/g, '').trim();
  }

  /**
   * Converts a Move object to simplified algebraic notation
   * 
   * @param move - Move object to convert
   * @returns Standard algebraic notation string
   */
  private static moveToNotation(move: Move): string {
    if (move.notation) return move.notation;
    
    // Generate basic coordinate notation as fallback
    const fromSquare = String.fromCharCode(97 + move.from.x) + (8 - move.from.y);
    const toSquare = String.fromCharCode(97 + move.to.x) + (8 - move.to.y);
    return `${fromSquare}-${toSquare}`;
  }

  /**
   * Applies general opening principles when position is not in book
   * 
   * @param gameState - Current game state
   * @returns Best move based on opening principles, or null if no moves available
   * 
   * Opening principles applied:
   * - Develop knights before bishops
   * - Control the center with pawns and pieces
   * - Castle early for king safety
   * - Avoid moving the same piece twice
   */
  private static getGeneralOpeningMove(gameState: GameState): Move | null {
    const possibleMoves = ChessGameEngine.getAllPossibleMoves(gameState, gameState.currentPlayer);
    if (possibleMoves.length === 0) return null;
    
    // Convert to Move objects and score based on opening principles
    const moves: Move[] = possibleMoves.map(pm => {
      const targetSquare = gameState.board[pm.to.y]?.[pm.to.x];
      return {
        from: pm.from,
        to: pm.to,
        piece: pm.piece,
        capturedPiece: targetSquare || undefined,
        timestamp: new Date(),
        player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
        notation: OpeningBook.moveToNotation({ from: pm.from, to: pm.to, piece: pm.piece } as Move)
      };
    });
    
    const scoredMoves = moves.map((move: Move) => ({
      move,
      score: OpeningBook.scoreOpeningMove(gameState, move)
    }));
    
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Add randomness among top moves to avoid predictability
    const topMoveCount = Math.min(3, scoredMoves.length);
    const topMoves = scoredMoves.slice(0, topMoveCount);
    if (topMoves.length === 0) return null;
    const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
    return selectedMove?.move || null;
  }

  /**
   * Scores a move based on opening principles
   * 
   * @param gameState - Current game state for context
   * @param move - Move to evaluate
   * @returns Numerical score (higher = better for opening play)
   */
  private static scoreOpeningMove(gameState: GameState, move: Move): number {
    let score = 0;
    
    // Prioritize piece development
    if (move.piece.type === PieceType.KNIGHT || move.piece.type === PieceType.BISHOP) {
      score += OpeningBook.OPENING_CONSTANTS.PIECE_DEVELOPMENT_BONUS;
    }
    
    // Reward center control
    if (OpeningBook.CENTER_SQUARES.some(sq => sq.x === move.to.x && sq.y === move.to.y)) {
      score += OpeningBook.OPENING_CONSTANTS.CENTER_CONTROL_BONUS;
    }
    
    // Encourage castling for king safety
    if (move.isCastling) {
      score += OpeningBook.OPENING_CONSTANTS.CASTLING_BONUS;
    }
    
    // Penalize moving the same piece multiple times
    const pieceMoves = gameState.moves.filter(m => 
      m.piece.type === move.piece.type && m.piece.color === move.piece.color
    ).length;
    score -= pieceMoves * OpeningBook.OPENING_CONSTANTS.PIECE_REPETITION_PENALTY;
    
    // Encourage central pawn advances
    if (move.piece.type === PieceType.PAWN && 
        (move.to.x === 3 || move.to.x === 4) && 
        (move.to.y === 3 || move.to.y === 4)) {
      score += OpeningBook.OPENING_CONSTANTS.CENTRAL_PAWN_BONUS;
    }
    
    return score;
  }

  /**
   * Count developed pieces
   */
  private static countDevelopedPieces(gameState: GameState): number {
    let developed = 0;
    
    // Count pieces not on starting squares
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y]?.[x];
        if (piece && OpeningBook.isPieceDeveloped(piece, x, y)) {
          developed++;
        }
      }
    }
    
    return developed;
  }

  /**
   * Determines if a piece has been developed from its starting position
   * 
   * @param piece - Chess piece to check
   * @param x - Current x coordinate (0-7)
   * @param y - Current y coordinate (0-7)
   * @returns True if piece has moved from starting square
   */
  private static isPieceDeveloped(piece: { type: PieceType; color: PieceColor; hasMoved?: boolean }, x: number, y: number): boolean {
    const isWhite = piece.color === PieceColor.WHITE;
    const startingRank = isWhite ? 7 : 0;
    const pawnRank = isWhite ? 6 : 1;
    
    switch (piece.type) {
      case PieceType.PAWN:
        return y !== pawnRank;
      case PieceType.KNIGHT:
        return !(y === startingRank && (x === 1 || x === 6));
      case PieceType.BISHOP:
        return !(y === startingRank && (x === 2 || x === 5));
      case PieceType.ROOK:
        return !(y === startingRank && (x === 0 || x === 7));
      case PieceType.QUEEN:
        return !(y === startingRank && x === 3);
      case PieceType.KING:
        return piece.hasMoved === true;
      default:
        return false;
    }
  }

  /**
   * Evaluates piece development for opening phase
   * 
   * @param gameState - Current game state
   * @returns Development evaluation (positive favors white)
   */
  private static evaluateDevelopment(gameState: GameState): number {
    const whiteDeveloped = OpeningBook.countDevelopedPiecesForColor(gameState, PieceColor.WHITE);
    const blackDeveloped = OpeningBook.countDevelopedPiecesForColor(gameState, PieceColor.BLACK);
    return (whiteDeveloped - blackDeveloped) * OpeningBook.OPENING_CONSTANTS.DEVELOPMENT_EVALUATION_WEIGHT;
  }

  /**
   * Counts developed pieces for a specific color
   * 
   * @param gameState - Current game state
   * @param color - Piece color to count
   * @returns Number of developed pieces
   */
  private static countDevelopedPiecesForColor(gameState: GameState, color: PieceColor): number {
    let count = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y]?.[x];
        if (piece?.color === color && OpeningBook.isPieceDeveloped(piece, x, y)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Evaluates center control in the opening
   * 
   * @param gameState - Current game state
   * @returns Center control evaluation (positive favors white)
   */
  private static evaluateCenterControl(gameState: GameState): number {
    let whiteControl = 0;
    let blackControl = 0;
    
    for (const square of OpeningBook.CENTER_SQUARES) {
      const piece = gameState.board[square.y]?.[square.x];
      if (piece) {
        if (piece.color === PieceColor.WHITE) {
          whiteControl++;
        } else {
          blackControl++;
        }
      }
    }
    
    return (whiteControl - blackControl) * OpeningBook.OPENING_CONSTANTS.CENTER_CONTROL_EVALUATION_WEIGHT;
  }

  /**
   * Evaluates king safety in the opening phase
   * 
   * @param gameState - Current game state
   * @returns King safety evaluation (positive favors white)
   */
  private static evaluateKingSafety(gameState: GameState): number {
    let safety = 0;
    
    // Check if kings have moved (castling availability)
    const whiteKingMoved = gameState.moves.some(m => 
      m.piece.type === PieceType.KING && m.piece.color === PieceColor.WHITE
    );
    const blackKingMoved = gameState.moves.some(m => 
      m.piece.type === PieceType.KING && m.piece.color === PieceColor.BLACK
    );
    
    // Bonus for maintaining castling rights
    if (!whiteKingMoved && gameState.castlingRights.whiteKingSide) {
      safety += OpeningBook.OPENING_CONSTANTS.KING_SAFETY_BONUS;
    }
    if (!blackKingMoved && gameState.castlingRights.blackKingSide) {
      safety -= OpeningBook.OPENING_CONSTANTS.KING_SAFETY_BONUS;
    }
    
    return safety;
  }

  /**
   * Evaluates pawn structure quality in the opening
   * 
   * @param gameState - Current game state
   * @returns Pawn structure evaluation (positive favors white)
   */
  private static evaluatePawnStructure(gameState: GameState): number {
    let structure = 0;
    
    // Evaluate central pawn presence and advancement
    const e4 = gameState.board[4]?.[4];  // e4 square
    const d4 = gameState.board[4]?.[3];  // d4 square  
    const e5 = gameState.board[3]?.[4];  // e5 square
    const d5 = gameState.board[3]?.[3];  // d5 square
    
    // Award points for central pawn control
    if (e4?.type === PieceType.PAWN && e4.color === PieceColor.WHITE) structure += 5;
    if (d4?.type === PieceType.PAWN && d4.color === PieceColor.WHITE) structure += 5;
    if (e5?.type === PieceType.PAWN && e5.color === PieceColor.BLACK) structure -= 5;
    if (d5?.type === PieceType.PAWN && d5.color === PieceColor.BLACK) structure -= 5;
    
    return structure;
  }
}

/**
 * Opening database entry structure
 * Contains opening name, move sequence, evaluation, and possible responses
 */
interface OpeningData {
  /** Human-readable name of the opening */
  name: string;
  /** Sequence of moves in the opening line */
  moves: string[];
  /** Static evaluation of the opening position */
  evaluation: number;
  /** Possible responses and continuations */
  responses?: {
    [moveNotation: string]: {
      /** Moves in this variation */
      moves: string[];
      /** Evaluation after this response */
      evaluation: number;
      /** Best continuation moves */
      nextMoves?: string[];
    };
  };
}
