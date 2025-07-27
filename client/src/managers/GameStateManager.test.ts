import { GameStateManager } from './GameStateManager';
import { PieceColor, PieceType } from '../types/gameState';

// Game State Manager Integration Tests
describe('GameStateManager', () => {
  let gameManager: GameStateManager;

  beforeEach(() => {
    gameManager = new GameStateManager('test-game', 'White Player', 'Black Player');
  });

  describe('Initialization', () => {
    test('creates game with proper initial state', () => {
      const state = gameManager.getCurrentState();
      expect(state.id).toBe('test-game');
      expect(state.currentPlayer).toBe(PieceColor.WHITE);
      expect(state.isGameOver).toBe(false);
    });

    test('sets up proper players', () => {
      const players = gameManager.getPlayers();
      expect(players.white).toBe('White Player');
      expect(players.black).toBe('Black Player');
    });
  });

  describe('Move Making', () => {
    test('executes valid moves successfully', () => {
      // White pawn move
      const success = gameManager.makeMove({ x: 4, y: 6 }, { x: 4, y: 4 });
      expect(success).toBe(true);
      
      const state = gameManager.getCurrentState();
      expect(state.currentPlayer).toBe(PieceColor.BLACK);
      expect(state.moves).toHaveLength(1);
    });

    test('rejects invalid moves', () => {
      // Invalid pawn move (three squares)
      const success = gameManager.makeMove({ x: 4, y: 6 }, { x: 4, y: 3 });
      expect(success).toBe(false);
      
      const state = gameManager.getCurrentState();
      expect(state.currentPlayer).toBe(PieceColor.WHITE); // Should still be white's turn
      expect(state.moves).toHaveLength(0);
    });

    test('provides valid moves for pieces', () => {
      const moves = gameManager.getValidMoves({ x: 4, y: 6 }); // White pawn
      expect(moves.length).toBeGreaterThan(0);
      expect(moves).toContainEqual({ x: 4, y: 5 });
      expect(moves).toContainEqual({ x: 4, y: 4 });
    });
  });

  describe('Game State Tracking', () => {
    test('tracks move history correctly', () => {
      gameManager.makeMove({ x: 4, y: 6 }, { x: 4, y: 4 }); // White
      gameManager.makeMove({ x: 4, y: 1 }, { x: 4, y: 3 }); // Black
      
      const history = gameManager.getMoveHistory();
      expect(history).toHaveLength(2);
      expect(history[0].piece.color).toBe(PieceColor.WHITE);
      expect(history[1].piece.color).toBe(PieceColor.BLACK);
    });

    test('detects game over conditions', () => {
      const state = gameManager.getCurrentState();
      expect(state.isGameOver).toBe(false);
      expect(state.isCheck).toBe(false);
      expect(state.isCheckmate).toBe(false);
      expect(state.isStalemate).toBe(false);
    });
  });

  describe('Event System', () => {
    test('fires events on state changes', (done) => {
      let eventFired = false;
      
      const handler = (event: any) => {
        if (event.type === 'move') {
          eventFired = true;
          expect(event.move).toBeDefined();
          done();
        }
      };
      
      gameManager.addEventListener(handler);
      gameManager.makeMove({ x: 4, y: 6 }, { x: 4, y: 4 });
      
      // Clean up
      setTimeout(() => {
        gameManager.removeEventListener(handler);
        if (!eventFired) {
          done();
        }
      }, 100);
    });
  });

  describe('Game Reset', () => {
    test('resets game to initial state', () => {
      // Make some moves
      gameManager.makeMove({ x: 4, y: 6 }, { x: 4, y: 4 });
      gameManager.makeMove({ x: 4, y: 1 }, { x: 4, y: 3 });
      
      // Reset
      gameManager.resetGame();
      
      const state = gameManager.getCurrentState();
      expect(state.currentPlayer).toBe(PieceColor.WHITE);
      expect(state.moves).toHaveLength(0);
      expect(state.isGameOver).toBe(false);
      
      // Check pieces are back in starting positions
      expect(state.board[6][4]?.type).toBe(PieceType.PAWN);
      expect(state.board[6][4]?.color).toBe(PieceColor.WHITE);
    });
  });
});
