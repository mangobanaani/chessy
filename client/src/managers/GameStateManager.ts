import { GameState, Move, Position, PieceColor, GameStateChangeEvent, GameResult, ChessPiece } from '../types/gameState';
import { ChessGameEngine } from '../engine/ChessGameEngine';

/**
 * Game state manager - handles state transitions, validation, and event emission
 * Keeps state immutable and provides controlled access to game logic
 */
export class GameStateManager {
  private gameState: GameState;
  private eventListeners: Array<(event: GameStateChangeEvent) => void> = [];

  constructor(gameId: string, whitePlayer: string, blackPlayer: string) {
    this.gameState = ChessGameEngine.createInitialState(gameId, whitePlayer, blackPlayer);
  }

  /**
   * Get current game state (immutable)
   */
  getCurrentState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Add event listener for state changes
   */
  addEventListener(listener: (event: GameStateChangeEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: GameStateChangeEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit state change event
   */
  private emitEvent(event: GameStateChangeEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Attempt to make a move
   */
  makeMove(from: Position, to: Position): boolean {
    if (this.gameState.isGameOver) {
      return false;
    }

    if (!ChessGameEngine.isValidMove(this.gameState, from, to)) {
      return false;
    }

    const previousState = this.gameState;
    this.gameState = ChessGameEngine.makeMove(this.gameState, from, to);
    
    const move = this.gameState.moves[this.gameState.moves.length - 1];
    
    this.emitEvent({
      type: 'move',
      gameState: { ...this.gameState },
      move,
    });

    // Check if game ended
    if (this.gameState.isGameOver && !previousState.isGameOver) {
      const result = ChessGameEngine.evaluateGameResult(this.gameState);
      if (result) {
        this.emitEvent({
          type: 'gameEnd',
          gameState: { ...this.gameState },
          result,
        });
      }
    }

    return true;
  }

  /**
   * Get valid moves for a piece
   */
  getValidMoves(position: Position): Position[] {
    return ChessGameEngine.getValidMoves(this.gameState, position);
  }

  /**
   * Get all possible moves for current player - ESSENTIAL FOR AI
   */
  getAllPossibleMoves(color?: PieceColor): Array<{from: Position, to: Position, piece: ChessPiece}> {
    return ChessGameEngine.getAllPossibleMoves(this.gameState, color);
  }

  /**
   * Get all pieces of a specific color
   */
  getPiecesByColor(color: PieceColor): Array<{piece: ChessPiece, position: Position}> {
    return ChessGameEngine.getPiecesByColor(this.gameState, color);
  }

  /**
   * Evaluate current position score
   */
  evaluatePosition(): number {
    return ChessGameEngine.evaluatePosition(this.gameState);
  }

  /**
   * Check if position is under attack
   */
  isPositionUnderAttack(position: Position, byColor: PieceColor): boolean {
    return ChessGameEngine.isPositionUnderAttack(this.gameState, position, byColor);
  }

  /**
   * Get attackers and defenders of a position
   */
  getPositionAttackersDefenders(position: Position): {
    attackers: ChessPiece[],
    defenders: ChessPiece[],
    attackerCount: number,
    defenderCount: number
  } {
    return ChessGameEngine.getPositionAttackersDefenders(this.gameState, position);
  }

  /**
   * Simulate a move without changing state - USEFUL FOR AI LOOKAHEAD
   */
  simulateMove(from: Position, to: Position): GameState | null {
    if (!ChessGameEngine.isValidMove(this.gameState, from, to)) {
      return null;
    }
    return ChessGameEngine.makeMove(this.gameState, from, to);
  }

  /**
   * Check if a move is valid
   */
  isValidMove(from: Position, to: Position): boolean {
    return ChessGameEngine.isValidMove(this.gameState, from, to);
  }

  /**
   * Get current player
   */
  getCurrentPlayer(): PieceColor {
    return this.gameState.currentPlayer;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.gameState.isGameOver;
  }

  /**
   * Get game result if game is over
   */
  getGameResult(): GameResult | null {
    return ChessGameEngine.evaluateGameResult(this.gameState);
  }

  /**
   * Get move history
   */
  getMoveHistory(): Move[] {
    return [...this.gameState.moves];
  }

  /**
   * Get board state
   */
  getBoard() {
    return this.gameState.board.map(row => [...row]);
  }

  /**
   * Check if king is in check
   */
  isKingInCheck(color: PieceColor): boolean {
    return this.gameState.isCheck && this.gameState.currentPlayer === color;
  }

  /**
   * Reset game to initial state
   */
  resetGame(): void {
    const { id, players } = this.gameState;
    this.gameState = ChessGameEngine.createInitialState(id, players.white, players.black);
    
    this.emitEvent({
      type: 'move',
      gameState: { ...this.gameState },
    });
  }

  /**
   * Load game state from external source
   */
  loadGameState(newState: GameState): void {
    this.gameState = { ...newState };
    
    this.emitEvent({
      type: 'move',
      gameState: { ...this.gameState },
    });
  }

  /**
   * Export current state for serialization
   */
  exportState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Get player names
   */
  getPlayers(): { white: string; black: string } {
    return { ...this.gameState.players };
  }

  /**
   * Set player names
   */
  setPlayers(white: string, black: string): void {
    this.gameState = {
      ...this.gameState,
      players: { white, black },
    };
    
    this.emitEvent({
      type: 'playerJoin',
      gameState: { ...this.gameState },
    });
  }
}
