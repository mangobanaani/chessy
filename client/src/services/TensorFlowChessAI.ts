import { Position, ChessPiece, GameState, PieceColor } from '../types/gameState';
import { ChessGameEngine } from '../engine/ChessGameEngine';

export interface AIMove {
  from: Position;
  to: Position;
  confidence: number;
  evaluation: number;
}

export interface MoveAnalysis {
  move: { from: Position; to: Position };
  evaluation: number;
  depth: number;
  principalVariation?: { from: Position; to: Position }[];
}

export class TensorFlowChessAI {
  private model: any = null;
  private isModelLoaded = false;
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  constructor() {
    this.initializeModel();
  }

  async initializeModel() {
    try {
      // TODO: Load your trained TensorFlow.js model
      // this.model = await tf.loadLayersModel('/models/chess-ai-model.json');
      // this.isModelLoaded = true;
      console.log('TensorFlow chess AI initialized (placeholder)');
    } catch (error) {
      console.error('Failed to load chess AI model:', error);
    }
  }

  /**
   * Calculate best move using AI model or fallback algorithm
   */
  async calculateBestMove(gameState: GameState): Promise<AIMove | null> {
    if (!this.isModelLoaded) {
      console.warn('AI model not loaded, using algorithm-based move');
      return this.calculateBestMoveAlgorithmic(gameState);
    }

    try {
      // Convert game state to tensor format for future model use
      // const boardTensor = this.gameStateToTensor(gameState);
      
      // TODO: Use your trained model to predict the best move
      // const prediction = await this.model.predict(boardTensor);
      // const bestMove = this.tensorToMove(prediction);
      
      // For now, return algorithm-based move as placeholder
      return this.calculateBestMoveAlgorithmic(gameState);
    } catch (error) {
      console.error('Error calculating AI move:', error);
      return this.calculateBestMoveAlgorithmic(gameState);
    }
  }

  /**
   * Calculate best move using game analysis (fallback when model not available)
   */
  private calculateBestMoveAlgorithmic(gameState: GameState): AIMove | null {
    const allMoves = ChessGameEngine.getAllPossibleMoves(gameState);
    
    if (allMoves.length === 0) {
      return null;
    }

    // Analyze each possible move
    const moveAnalyses: MoveAnalysis[] = [];
    
    for (const moveOption of allMoves) {
      const hypotheticalState = ChessGameEngine.makeMove(gameState, moveOption.from, moveOption.to);
      const evaluation = ChessGameEngine.evaluatePosition(hypotheticalState);
      
      moveAnalyses.push({
        move: { from: moveOption.from, to: moveOption.to },
        evaluation: gameState.currentPlayer === PieceColor.BLACK ? evaluation : -evaluation, // Flip for black
        depth: 1
      });
    }

    // Sort moves by evaluation (best first)
    moveAnalyses.sort((a, b) => b.evaluation - a.evaluation);

    // Add some randomness based on difficulty
    let selectedMove: MoveAnalysis;
    switch (this.difficulty) {
      case 'easy':
        // Pick from bottom 50% of moves
        const easyIndex = Math.floor(moveAnalyses.length * 0.5) + 
                         Math.floor(Math.random() * Math.ceil(moveAnalyses.length * 0.5));
        selectedMove = moveAnalyses[Math.min(easyIndex, moveAnalyses.length - 1)];
        break;
      case 'medium':
        // Pick from top 70% of moves with slight randomness
        const mediumIndex = Math.floor(Math.random() * Math.ceil(moveAnalyses.length * 0.7));
        selectedMove = moveAnalyses[mediumIndex];
        break;
      case 'hard':
        // Always pick best move (or top 3 with tiny randomness)
        const hardIndex = Math.floor(Math.random() * Math.min(3, moveAnalyses.length));
        selectedMove = moveAnalyses[hardIndex];
        break;
    }

    return {
      from: selectedMove.move.from,
      to: selectedMove.move.to,
      confidence: 0.8,
      evaluation: selectedMove.evaluation
    };
  }

  /**
   * Set AI difficulty level
   */
  setDifficulty(level: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = level;
  }

  /**
   * Get current difficulty
   */
  getDifficulty(): 'easy' | 'medium' | 'hard' {
    return this.difficulty;
  }

  /**
   * Analyze a specific position and return all moves with evaluations
   */
  analyzePosition(gameState: GameState): MoveAnalysis[] {
    const allMoves = ChessGameEngine.getAllPossibleMoves(gameState);
    const analyses: MoveAnalysis[] = [];
    
    for (const moveOption of allMoves) {
      const hypotheticalState = ChessGameEngine.makeMove(gameState, moveOption.from, moveOption.to);
      const evaluation = ChessGameEngine.evaluatePosition(hypotheticalState);
      
      analyses.push({
        move: { from: moveOption.from, to: moveOption.to },
        evaluation,
        depth: 1
      });
    }
    
    return analyses.sort((a, b) => b.evaluation - a.evaluation);
  }

  /**
   * Check if a move is tactically sound
   */
  isMoveSound(gameState: GameState, from: Position, to: Position): boolean {
    if (!ChessGameEngine.isValidMove(gameState, from, to)) {
      return false;
    }

    const piece = gameState.board[from.y][from.x];
    if (!piece) return false;

    // Check if move hangs the piece
    const afterMoveState = ChessGameEngine.makeMove(gameState, from, to);
    const opponentColor = piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    
    const isUnderAttack = ChessGameEngine.isPositionUnderAttack(afterMoveState, to, opponentColor);
    const attackDefenseAnalysis = ChessGameEngine.getPositionAttackersDefenders(afterMoveState, to);
    
    // Simple heuristic: move is unsound if piece becomes undefended and under attack
    return !(isUnderAttack && attackDefenseAnalysis.defenderCount === 0);
  }

  private gameStateToTensor(gameState: GameState): number[][][] {
    // Convert the chess board to a tensor representation
    // This is a simplified version - you'll need to adapt this to your model's input format
    const tensor: number[][][] = [];
    
    for (let y = 0; y < 8; y++) {
      const row: number[][] = [];
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        const pieceVector = this.pieceToVector(piece);
        row.push(pieceVector);
      }
      tensor.push(row);
    }
    
    return tensor;
  }

  private pieceToVector(piece: ChessPiece | null): number[] {
    // Convert a chess piece to a numerical vector
    // This is a simplified encoding - adapt to your model's requirements
    if (!piece) return [0, 0, 0, 0, 0, 0, 0]; // Empty square
    
    const pieceTypeMap = {
      'pawn': [1, 0, 0, 0, 0, 0],
      'rook': [0, 1, 0, 0, 0, 0],
      'knight': [0, 0, 1, 0, 0, 0],
      'bishop': [0, 0, 0, 1, 0, 0],
      'queen': [0, 0, 0, 0, 1, 0],
      'king': [0, 0, 0, 0, 0, 1],
    };
    
    const colorValue = piece.color === PieceColor.WHITE ? 1 : -1;
    const pieceVector = pieceTypeMap[piece.type] || [0, 0, 0, 0, 0, 0];
    
    return [...pieceVector, colorValue];
  }

  private getRandomMove(gameState: GameState): AIMove | null {
    // Fallback: generate a random legal move using game engine
    const allMoves = ChessGameEngine.getAllPossibleMoves(gameState);
    
    if (allMoves.length === 0) return null;
    
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    
    return {
      from: randomMove.from,
      to: randomMove.to,
      confidence: 0.5,
      evaluation: 0,
    };
  }

  // Utility methods for model training data preparation
  exportGameForTraining(gameState: GameState, outcome: 'white' | 'black' | 'draw'): any {
    return {
      board: this.gameStateToTensor(gameState),
      moves: gameState.moves,
      outcome,
      timestamp: new Date().toISOString(),
    };
  }

  async saveTrainingData(gameData: any) {
    // Save game data for training
    console.log('Saving training data:', gameData);
    // Implement your data storage logic here
  }
}

// Singleton instance
export const chessAI = new TensorFlowChessAI();
