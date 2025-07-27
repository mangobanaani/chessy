# Chess Game API - Complete Reference for AI Move Calculation

This document outlines all available methods for calculating the next best move in the chess game, providing everything an AI needs to analyze positions and make decisions.

## Core API Classes

### 1. `ChessGameEngine` - Pure Game Logic
**Static methods for chess rule validation and analysis**

#### Position Analysis Methods
```typescript
// Get all possible moves for current player
ChessGameEngine.getAllPossibleMoves(gameState, color?) 
// Returns: Array<{from: Position, to: Position, piece: ChessPiece}>

// Get all pieces of a specific color
ChessGameEngine.getPiecesByColor(gameState, color)
// Returns: Array<{piece: ChessPiece, position: Position}>

// Check if a specific move is legal
ChessGameEngine.isValidMove(gameState, from, to)
// Returns: boolean

// Get valid moves for a specific piece
ChessGameEngine.getValidMoves(gameState, position)
// Returns: Position[]
```

#### Position Evaluation Methods
```typescript
// Evaluate position score (positive = white advantage)
ChessGameEngine.evaluatePosition(gameState)
// Returns: number

// Check if position is under attack
ChessGameEngine.isPositionUnderAttack(gameState, position, byColor)
// Returns: boolean

// Get detailed attack/defense analysis
ChessGameEngine.getPositionAttackersDefenders(gameState, position)
// Returns: {attackers: ChessPiece[], defenders: ChessPiece[], attackerCount: number, defenderCount: number}

// Check if king is in check
ChessGameEngine.isKingInCheck(gameState, color)
// Returns: boolean
```

#### Game State Methods
```typescript
// Execute a move and get new state
ChessGameEngine.makeMove(gameState, from, to)
// Returns: GameState

// Check for checkmate
ChessGameEngine.isCheckmate(gameState, color)
// Returns: boolean

// Check for stalemate  
ChessGameEngine.isStalemate(gameState, color)
// Returns: boolean

// Evaluate final game result
ChessGameEngine.evaluateGameResult(gameState)
// Returns: GameResult | null
```

### 2. `GameStateManager` - State Management
**Manages game state with controlled access to game logic**

#### Core State Methods
```typescript
const manager = new GameStateManager(gameId, whitePlayer, blackPlayer);

// Get current immutable state
manager.getCurrentState(): GameState

// Make a move (validates and updates state)
manager.makeMove(from, to): boolean

// Simulate move without changing state
manager.simulateMove(from, to): GameState | null
```

#### AI-Friendly Methods
```typescript
// Get all possible moves for current player
manager.getAllPossibleMoves(color?): Array<{from: Position, to: Position, piece: ChessPiece}>

// Get pieces by color
manager.getPiecesByColor(color): Array<{piece: ChessPiece, position: Position}>

// Position evaluation
manager.evaluatePosition(): number

// Attack analysis
manager.isPositionUnderAttack(position, byColor): boolean
manager.getPositionAttackersDefenders(position): {attackers, defenders, attackerCount, defenderCount}

// Game state queries
manager.getCurrentPlayer(): PieceColor
manager.isGameOver(): boolean
manager.getGameResult(): GameResult | null
```

### 3. `ChessAnalysisAPI` - Advanced AI Analysis
**Comprehensive analysis utilities specifically for AI decision making**

#### Complete Position Analysis
```typescript
ChessAnalysisAPI.getCompletePositionAnalysis(gameState)
// Returns comprehensive analysis including:
// - All possible moves with evaluations
// - Material balance and position score
// - King safety analysis
// - Move quality assessment (sound/unsound)
// - Attack/defense analysis for each move
```

#### Move Selection Helpers
```typescript
// Get best N moves ranked by evaluation
ChessAnalysisAPI.getBestMoves(gameState, count): Array<{from, to, piece, evaluation, rank}>

// Find tactical opportunities
ChessAnalysisAPI.getTacticalMoves(gameState): {captures, checks, threats}

// Validate a proposed move
ChessAnalysisAPI.validateProposedMove(gameState, from, to): {isLegal, isSound, evaluation, risks, benefits}
```

### 4. `TensorFlowChessAI` - AI Service
**AI implementation with multiple difficulty levels**

#### AI Move Calculation
```typescript
const ai = new TensorFlowChessAI();

// Calculate best move (uses model or algorithm fallback)
await ai.calculateBestMove(gameState): Promise<AIMove | null>

// Set difficulty level
ai.setDifficulty('easy' | 'medium' | 'hard'): void

// Analyze all moves with evaluations
ai.analyzePosition(gameState): MoveAnalysis[]

// Check if a move is tactically sound
ai.isMoveSound(gameState, from, to): boolean
```

## Complete AI Implementation Example

```typescript
import { GameStateManager } from './managers/GameStateManager';
import { ChessAnalysisAPI } from './utils/ChessAnalysisAPI';
import { TensorFlowChessAI } from './services/TensorFlowChessAI';

class MyChessAI {
  private gameManager: GameStateManager;
  private aiService: TensorFlowChessAI;
  
  constructor(gameManager: GameStateManager) {
    this.gameManager = gameManager;
    this.aiService = new TensorFlowChessAI();
  }
  
  async calculateNextMove(): Promise<{from: Position, to: Position} | null> {
    const currentState = this.gameManager.getCurrentState();
    
    // Method 1: Use complete analysis
    const analysis = ChessAnalysisAPI.getCompletePositionAnalysis(currentState);
    console.log(`Found ${analysis.moveCount} possible moves`);
    console.log(`Position evaluation: ${analysis.positionScore}`);
    
    // Method 2: Get best moves
    const bestMoves = ChessAnalysisAPI.getBestMoves(currentState, 5);
    console.log('Top 5 moves:', bestMoves);
    
    // Method 3: Find tactical opportunities
    const tactics = ChessAnalysisAPI.getTacticalMoves(currentState);
    if (tactics.captures.length > 0) {
      console.log('Capture opportunities:', tactics.captures);
    }
    
    // Method 4: Use AI service
    const aiMove = await this.aiService.calculateBestMove(currentState);
    if (aiMove) {
      // Validate the AI's suggestion
      const validation = ChessAnalysisAPI.validateProposedMove(
        currentState, aiMove.from, aiMove.to
      );
      console.log('AI move validation:', validation);
      
      if (validation.isLegal && validation.isSound) {
        return { from: aiMove.from, to: aiMove.to };
      }
    }
    
    // Fallback: Pick best evaluated move
    if (bestMoves.length > 0) {
      return { from: bestMoves[0].from, to: bestMoves[0].to };
    }
    
    return null;
  }
  
  // Alternative: Quick move selection
  getQuickMove(): {from: Position, to: Position} | null {
    const allMoves = this.gameManager.getAllPossibleMoves();
    if (allMoves.length === 0) return null;
    
    // Score each move
    const scoredMoves = allMoves.map(move => {
      const futureState = this.gameManager.simulateMove(move.from, move.to);
      const score = futureState ? 
        this.gameManager.evaluatePosition() : -1000;
      
      return { ...move, score };
    });
    
    // Return best move
    scoredMoves.sort((a, b) => b.score - a.score);
    return { from: scoredMoves[0].from, to: scoredMoves[0].to };
  }
}
```

## Key Capabilities for AI

- **Complete Move Generation** - Get all legal moves instantly
- **Position Evaluation** - Numerical scoring of any position  
- **Move Simulation** - Test moves without changing game state
- **Attack Analysis** - Know what's attacking/defending each square
- **King Safety** - Check detection and safety analysis
- **Tactical Recognition** - Find captures, checks, and threats
- **Move Validation** - Verify any proposed move
- **Game State Queries** - Check game end conditions
- **Difficulty Levels** - Adjustable AI strength
- **Training Data** - Export games for model improvement

## Perfect for TensorFlow Integration

The API provides everything needed for:
- **Model Input**: Convert game state to tensors
- **Move Generation**: Get all legal moves for model selection
- **Position Evaluation**: Training target for position assessment
- **Move Validation**: Ensure model outputs are legal
- **Training Data**: Export game sequences with outcomes

Your chess game API is complete and ready for any AI implementation!
