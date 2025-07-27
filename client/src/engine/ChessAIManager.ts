import { GameState, Move, PieceColor } from '../types/gameState';
import { ChessAI } from './ChessAI';
import { OpeningBook } from './OpeningBook';
import { BoardEvaluator } from './BoardEvaluator';

/**
 * AI difficulty levels with specific characteristics
 */
export enum AIDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate', 
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master'
}

/**
 * AI personality traits that affect play style
 */
export interface AIPersonality {
  aggression: number;      // 0-1: How aggressive the AI is
  development: number;     // 0-1: How much it values piece development
  safety: number;          // 0-1: How much it values king safety
  material: number;        // 0-1: How much it values material
  positional: number;      // 0-1: How much it values positional play
}

/**
 * Configuration for AI engine
 */
export interface AIConfig {
  difficulty: AIDifficulty;
  personality?: AIPersonality;
  useOpeningBook: boolean;
  useEndgameTablebase: boolean;
  maxThinkTime: number; // milliseconds
  maxDepth: number;
}

/**
 * AI engine statistics
 */
export interface AIStats {
  nodesSearched: number;
  timeUsed: number;
  depth: number;
  evaluation: number;
  principalVariation: string[];
  transpositionHits: number;
  openingBookHits: number;
}

/**
 * Main AI engine manager that coordinates all AI components
 * Provides a unified interface for chess AI functionality
 */
export class ChessAIManager {
  private config: AIConfig;
  private stats: AIStats;
  private lastAnalysis: Date | null = null;

  constructor(difficulty: AIDifficulty = AIDifficulty.INTERMEDIATE) {
    this.config = ChessAIManager.getDefaultConfig(difficulty);
    this.stats = ChessAIManager.createEmptyStats();
  }

  /**
   * Find the best move for the current position
   */
  async findBestMove(gameState: GameState): Promise<{move: Move | null, stats: AIStats}> {
    const startTime = Date.now();
    this.stats = ChessAIManager.createEmptyStats();
    
    let bestMove: Move | null = null;
    
    try {
      // Try opening book first if enabled and in opening phase
      if (this.config.useOpeningBook && OpeningBook.isInOpeningPhase(gameState)) {
        bestMove = OpeningBook.getBookMove(gameState);
        if (bestMove) {
          this.stats.openingBookHits = 1;
          this.stats.timeUsed = Date.now() - startTime;
          this.stats.evaluation = OpeningBook.getOpeningEvaluation(gameState);
          console.log('AI used opening book move:', bestMove.notation);
          return { move: bestMove, stats: this.stats };
        }
      }
      
      // Use main search engine
      const difficultySettings = ChessAI.getDifficultySettings(this.mapDifficulty());
      bestMove = ChessAI.findBestMove(
        gameState, 
        Math.min(this.config.maxDepth, difficultySettings.depth),
        Math.min(this.config.maxThinkTime, difficultySettings.timeLimit)
      );
      
      // Add personality-based adjustments
      if (bestMove && this.config.personality) {
        bestMove = this.adjustMoveForPersonality(gameState, bestMove);
      }
      
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback to simple move selection
      bestMove = this.getFallbackMove(gameState);
    }
    
    this.stats.timeUsed = Date.now() - startTime;
    this.stats.evaluation = bestMove ? BoardEvaluator.evaluate(gameState) : 0;
    this.lastAnalysis = new Date();
    
    return { move: bestMove, stats: this.stats };
  }

  /**
   * Analyze position and return multiple candidate moves
   */
  async analyzePosition(gameState: GameState, candidateCount: number = 3): Promise<{
    moves: Array<{move: Move, evaluation: number}>,
    stats: AIStats
  }> {
    const startTime = Date.now();
    const candidates: Array<{move: Move, evaluation: number}> = [];
    
    try {
      // Get all valid moves
      const allMoves = await import('./MoveGenerator').then(mg => 
        mg.MoveGenerator.getAllValidMoves(gameState, gameState.currentPlayer)
      );
      
      // Evaluate each move
      for (const move of allMoves.slice(0, Math.min(20, allMoves.length))) {
        const { ChessGameEngine } = await import('./ChessGameEngine');
        const newGameState = ChessGameEngine.makeMove(gameState, move.from, move.to);
        if (newGameState) {
          const evaluation = BoardEvaluator.evaluate(newGameState);
          candidates.push({ move, evaluation });
        }
      }
      
      // Sort by evaluation and take top candidates
      candidates.sort((a, b) => {
        const multiplier = gameState.currentPlayer === PieceColor.WHITE ? -1 : 1;
        return (b.evaluation - a.evaluation) * multiplier;
      });
      
    } catch (error) {
      console.error('Position analysis error:', error);
    }
    
    this.stats.timeUsed = Date.now() - startTime;
    return { 
      moves: candidates.slice(0, candidateCount), 
      stats: this.stats 
    };
  }

  /**
   * Get AI evaluation of current position
   */
  evaluatePosition(gameState: GameState): number {
    return BoardEvaluator.evaluate(gameState);
  }

  /**
   * Check if AI should resign based on position
   */
  shouldResign(gameState: GameState): boolean {
    const evaluation = this.evaluatePosition(gameState);
    const threshold = this.getResignationThreshold();
    
    // Resign if position is hopeless and several moves have passed
    return Math.abs(evaluation) > threshold && gameState.moves.length > 20;
  }

  /**
   * Offer draw based on position evaluation
   */
  shouldOfferDraw(gameState: GameState): boolean {
    const evaluation = Math.abs(this.evaluatePosition(gameState));
    const drawThreshold = 50; // Close to equal position
    const moveCount = gameState.moves.length;
    
    // Offer draw in balanced endgame or repetitive positions
    return evaluation < drawThreshold && moveCount > 40;
  }

  /**
   * Update AI configuration
   */
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current AI configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Get AI statistics from last move
   */
  getStats(): AIStats {
    return { ...this.stats };
  }

  /**
   * Reset AI state (clear caches, stats, etc.)
   */
  reset(): void {
    this.stats = ChessAIManager.createEmptyStats();
    this.lastAnalysis = null;
    // Could clear transposition table here if needed
  }

  /**
   * Set AI personality
   */
  setPersonality(personality: AIPersonality): void {
    this.config.personality = { ...personality };
  }

  /**
   * Get predefined personality profiles
   */
  static getPersonalityProfiles(): Record<string, AIPersonality> {
    return {
      aggressive: {
        aggression: 0.9,
        development: 0.7,
        safety: 0.3,
        material: 0.6,
        positional: 0.4
      },
      positional: {
        aggression: 0.3,
        development: 0.8,
        safety: 0.7,
        material: 0.5,
        positional: 0.9
      },
      tactical: {
        aggression: 0.7,
        development: 0.6,
        safety: 0.5,
        material: 0.8,
        positional: 0.6
      },
      defensive: {
        aggression: 0.2,
        development: 0.7,
        safety: 0.9,
        material: 0.7,
        positional: 0.8
      },
      balanced: {
        aggression: 0.5,
        development: 0.7,
        safety: 0.6,
        material: 0.7,
        positional: 0.7
      }
    };
  }

  /**
   * Private helper methods
   */
  private static getDefaultConfig(difficulty: AIDifficulty): AIConfig {
    const configs: Record<AIDifficulty, AIConfig> = {
      [AIDifficulty.BEGINNER]: {
        difficulty,
        useOpeningBook: false,
        useEndgameTablebase: false,
        maxThinkTime: 1000,
        maxDepth: 2
      },
      [AIDifficulty.INTERMEDIATE]: {
        difficulty,
        useOpeningBook: true,
        useEndgameTablebase: false,
        maxThinkTime: 3000,
        maxDepth: 3
      },
      [AIDifficulty.ADVANCED]: {
        difficulty,
        useOpeningBook: true,
        useEndgameTablebase: true,
        maxThinkTime: 5000,
        maxDepth: 4
      },
      [AIDifficulty.EXPERT]: {
        difficulty,
        useOpeningBook: true,
        useEndgameTablebase: true,
        maxThinkTime: 8000,
        maxDepth: 5
      },
      [AIDifficulty.MASTER]: {
        difficulty,
        useOpeningBook: true,
        useEndgameTablebase: true,
        maxThinkTime: 15000,
        maxDepth: 6
      }
    };
    
    return configs[difficulty];
  }

  private static createEmptyStats(): AIStats {
    return {
      nodesSearched: 0,
      timeUsed: 0,
      depth: 0,
      evaluation: 0,
      principalVariation: [],
      transpositionHits: 0,
      openingBookHits: 0
    };
  }

  private mapDifficulty(): 'easy' | 'medium' | 'hard' | 'expert' {
    switch (this.config.difficulty) {
      case AIDifficulty.BEGINNER: return 'easy';
      case AIDifficulty.INTERMEDIATE: return 'medium';
      case AIDifficulty.ADVANCED: return 'hard';
      case AIDifficulty.EXPERT:
      case AIDifficulty.MASTER: return 'expert';
      default: return 'medium';
    }
  }

  private adjustMoveForPersonality(gameState: GameState, move: Move): Move {
    if (!this.config.personality) return move;
    
    // This is a simplified personality adjustment
    // In a full implementation, you'd analyze multiple candidate moves
    // and choose based on personality traits
    
    return move;
  }

  private getFallbackMove(gameState: GameState): Move | null {
    // Simple fallback: get any valid move
    try {
      const { ChessGameEngine } = require('./ChessGameEngine');
      const possibleMoves = ChessGameEngine.getAllPossibleMoves(gameState, gameState.currentPlayer);
      if (possibleMoves.length > 0) {
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        return {
          from: randomMove.from,
          to: randomMove.to,
          piece: randomMove.piece,
          timestamp: new Date(),
          player: gameState.currentPlayer === PieceColor.WHITE ? gameState.players.white : gameState.players.black,
          notation: 'fallback'
        };
      }
    } catch (error) {
      console.error('Fallback move error:', error);
    }
    return null;
  }

  private getResignationThreshold(): number {
    switch (this.config.difficulty) {
      case AIDifficulty.BEGINNER: return 2000; // Resign when down 20 points
      case AIDifficulty.INTERMEDIATE: return 1500;
      case AIDifficulty.ADVANCED: return 1200;
      case AIDifficulty.EXPERT: return 1000;
      case AIDifficulty.MASTER: return 800;
      default: return 1500;
    }
  }
}
