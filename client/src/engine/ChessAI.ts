import { GameState, PieceColor, Move } from '../types/gameState';
import { ChessGameEngine } from './ChessGameEngine';
import { BoardEvaluator } from './BoardEvaluator';
import { MoveGenerator } from './MoveGenerator';
import { TranspositionTable } from './TranspositionTable';

/**
 * Advanced chess AI engine using Minimax with Alpha-Beta pruning
 * Optimized for performance with move ordering, transposition tables, and iterative deepening
 */
export class ChessAI {
  private static readonly DEFAULT_DEPTH = 4;
  private static readonly MAX_DEPTH = 8;
  private static readonly TIME_LIMIT_MS = 5000; // 5 seconds max think time
  
  private static transpositionTable = new TranspositionTable();
  private static nodeCount = 0;
  private static startTime = 0;

  /**
   * Find the best move for the current player using iterative deepening
   */
  static findBestMove(
    gameState: GameState, 
    maxDepth: number = ChessAI.DEFAULT_DEPTH,
    timeLimit: number = ChessAI.TIME_LIMIT_MS
  ): Move | null {
    ChessAI.nodeCount = 0;
    ChessAI.startTime = Date.now();
    
    const moves = MoveGenerator.getAllValidMoves(gameState, gameState.currentPlayer);
    if (moves.length === 0) return null;
    
    // Single move - no need to calculate
    if (moves.length === 1) return moves[0];
    
    let bestMove: Move | null = null;
    let bestScore = gameState.currentPlayer === PieceColor.WHITE ? -Infinity : Infinity;
    
    // Iterative deepening for better time management and move ordering
    for (let depth = 1; depth <= Math.min(maxDepth, ChessAI.MAX_DEPTH); depth++) {
      if (Date.now() - ChessAI.startTime > timeLimit * 0.9) break;
      
      const result = ChessAI.searchWithTimeout(gameState, depth, -Infinity, Infinity, true, timeLimit);
      if (result) {
        bestMove = result.move;
        bestScore = result.score;
        
        // If we found a mate, no need to search deeper
        if (Math.abs(bestScore) > 9000) break;
      }
    }
    
    console.log(`AI searched ${ChessAI.nodeCount} nodes in ${Date.now() - ChessAI.startTime}ms`);
    console.log(`Best move: ${bestMove?.notation || 'none'} (score: ${bestScore})`);
    
    return bestMove;
  }

  /**
   * Minimax search with alpha-beta pruning and time limit
   */
  private static searchWithTimeout(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    timeLimit: number
  ): { move: Move; score: number } | null {
    if (Date.now() - ChessAI.startTime > timeLimit) return null;
    
    const moves = MoveGenerator.getAllValidMoves(gameState, gameState.currentPlayer);
    if (moves.length === 0) return null;
    
    // Order moves for better pruning
    const orderedMoves = ChessAI.orderMoves(gameState, moves);
    
    let bestMove = orderedMoves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;
    
    for (const move of orderedMoves) {
      if (Date.now() - ChessAI.startTime > timeLimit) break;
      
      const newGameState = ChessGameEngine.makeMove(gameState, move.from, move.to);
      if (!newGameState) continue;
      
      const score = ChessAI.minimax(newGameState, depth - 1, alpha, beta, !isMaximizing, timeLimit);
      if (score === null) break; // Timeout
      
      if (isMaximizing && score > bestScore) {
        bestScore = score;
        bestMove = move;
        alpha = Math.max(alpha, score);
      } else if (!isMaximizing && score < bestScore) {
        bestScore = score;
        bestMove = move;
        beta = Math.min(beta, score);
      }
      
      // Alpha-beta pruning
      if (beta <= alpha) break;
    }
    
    return { move: bestMove, score: bestScore };
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private static minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    timeLimit: number
  ): number | null {
    if (Date.now() - ChessAI.startTime > timeLimit) return null;
    
    ChessAI.nodeCount++;
    
    // Terminal conditions
    if (depth === 0 || gameState.isGameOver) {
      return ChessAI.quiescenceSearch(gameState, alpha, beta, isMaximizing, 3);
    }
    
    // Check transposition table
    const ttEntry = ChessAI.transpositionTable.get(gameState, depth);
    if (ttEntry) return ttEntry.score;
    
    const moves = MoveGenerator.getAllValidMoves(gameState, gameState.currentPlayer);
    if (moves.length === 0) {
      // No moves available - checkmate or stalemate
      if (gameState.isCheck) {
        // Checkmate - heavily favor/penalize based on perspective
        return isMaximizing ? -10000 + depth : 10000 - depth;
      }
      return 0; // Stalemate
    }
    
    const orderedMoves = ChessAI.orderMoves(gameState, moves);
    let bestScore = isMaximizing ? -Infinity : Infinity;
    
    for (const move of orderedMoves) {
      if (Date.now() - ChessAI.startTime > timeLimit) return null;
      
      const newGameState = ChessGameEngine.makeMove(gameState, move.from, move.to);
      if (!newGameState) continue;
      
      const score = ChessAI.minimax(newGameState, depth - 1, alpha, beta, !isMaximizing, timeLimit);
      if (score === null) return null;
      
      if (isMaximizing) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, score);
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, score);
      }
      
      // Alpha-beta pruning
      if (beta <= alpha) break;
    }
    
    // Store in transposition table
    ChessAI.transpositionTable.set(gameState, depth, bestScore);
    
    return bestScore;
  }

  /**
   * Quiescence search to avoid horizon effect
   * Only searches capturing moves to find tactical solutions
   */
  private static quiescenceSearch(
    gameState: GameState,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    depth: number
  ): number {
    const standPat = BoardEvaluator.evaluate(gameState);
    
    if (depth === 0) return standPat;
    
    if (isMaximizing && standPat >= beta) return beta;
    if (!isMaximizing && standPat <= alpha) return alpha;
    
    if (isMaximizing) alpha = Math.max(alpha, standPat);
    else beta = Math.min(beta, standPat);
    
    // Only consider capturing moves in quiescence
    const capturingMoves = MoveGenerator.getCapturingMoves(gameState, gameState.currentPlayer);
    const orderedMoves = ChessAI.orderMoves(gameState, capturingMoves);
    
    for (const move of orderedMoves) {
      const newGameState = ChessGameEngine.makeMove(gameState, move.from, move.to);
      if (!newGameState) continue;
      
      const score = ChessAI.quiescenceSearch(newGameState, alpha, beta, !isMaximizing, depth - 1);
      
      if (isMaximizing) {
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
      } else {
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
    }
    
    return isMaximizing ? alpha : beta;
  }

  /**
   * Order moves for better alpha-beta pruning
   * Priority: Captures > Checks > Castling > Others
   */
  private static orderMoves(gameState: GameState, moves: Move[]): Move[] {
    return moves.sort((a, b) => {
      const scoreA = ChessAI.getMoveOrderingScore(gameState, a);
      const scoreB = ChessAI.getMoveOrderingScore(gameState, b);
      return scoreB - scoreA; // Higher scores first
    });
  }

  /**
   * Calculate move ordering score for prioritization
   */
  private static getMoveOrderingScore(gameState: GameState, move: Move): number {
    let score = 0;
    
    // Capturing moves get high priority
    if (move.capturedPiece) {
      const capturedValue = BoardEvaluator.getPieceValue(move.capturedPiece.type);
      const capturingValue = BoardEvaluator.getPieceValue(move.piece.type);
      score += (capturedValue - capturingValue) * 10 + 1000;
    }
    
    // Promotions
    if (move.promotedTo) {
      score += BoardEvaluator.getPieceValue(move.promotedTo) * 10 + 800;
    }
    
    // Castling
    if (move.isCastling) {
      score += 500;
    }
    
    // Central squares
    const centerDistance = Math.abs(move.to.x - 3.5) + Math.abs(move.to.y - 3.5);
    score += (7 - centerDistance) * 5;
    
    // Piece development (moving from back rank)
    if (move.piece.color === PieceColor.WHITE && move.from.y === 7 && move.to.y < 7) {
      score += 30;
    } else if (move.piece.color === PieceColor.BLACK && move.from.y === 0 && move.to.y > 0) {
      score += 30;
    }
    
    return score;
  }

  /**
   * Get difficulty-adjusted search parameters
   */
  static getDifficultySettings(difficulty: 'easy' | 'medium' | 'hard' | 'expert') {
    switch (difficulty) {
      case 'easy':
        return { depth: 2, timeLimit: 1000, randomness: 0.3 };
      case 'medium':
        return { depth: 3, timeLimit: 2000, randomness: 0.1 };
      case 'hard':
        return { depth: 4, timeLimit: 5000, randomness: 0.05 };
      case 'expert':
        return { depth: 6, timeLimit: 10000, randomness: 0 };
      default:
        return { depth: 4, timeLimit: 5000, randomness: 0 };
    }
  }

  /**
   * Find best move with difficulty adjustment
   */
  static findBestMoveWithDifficulty(
    gameState: GameState,
    difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium'
  ): Move | null {
    const settings = ChessAI.getDifficultySettings(difficulty);
    const bestMove = ChessAI.findBestMove(gameState, settings.depth, settings.timeLimit);
    
    // Add randomness for easier difficulties
    if (bestMove && settings.randomness > 0 && Math.random() < settings.randomness) {
      const allMoves = MoveGenerator.getAllValidMoves(gameState, gameState.currentPlayer);
      const decentMoves = allMoves.slice(0, Math.ceil(allMoves.length * 0.3));
      return decentMoves[Math.floor(Math.random() * decentMoves.length)] || bestMove;
    }
    
    return bestMove;
  }
}
