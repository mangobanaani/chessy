import { ChessGameEngine } from './ChessGameEngine';
import { PieceType, PieceColor, GameState } from '../types/gameState';

// Chess Game Engine Core Logic Tests
describe('ChessGameEngine', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = ChessGameEngine.createInitialState('test-game', 'White Player', 'Black Player');
  });

  // Initial State Tests
  describe('Initial State', () => {
    test('creates proper initial board setup', () => {
      expect(initialState.board).toHaveLength(8);
      expect(initialState.board[0]).toHaveLength(8);
      
      // Check white pieces on rank 8 (index 7)
      expect(initialState.board[7][0]?.type).toBe(PieceType.ROOK);
      expect(initialState.board[7][0]?.color).toBe(PieceColor.WHITE);
      expect(initialState.board[7][4]?.type).toBe(PieceType.KING);
      expect(initialState.board[7][4]?.color).toBe(PieceColor.WHITE);
      
      // Check black pieces on rank 1 (index 0)
      expect(initialState.board[0][0]?.type).toBe(PieceType.ROOK);
      expect(initialState.board[0][0]?.color).toBe(PieceColor.BLACK);
      expect(initialState.board[0][4]?.type).toBe(PieceType.KING);
      expect(initialState.board[0][4]?.color).toBe(PieceColor.BLACK);
      
      // Check pawns
      for (let x = 0; x < 8; x++) {
        expect(initialState.board[6][x]?.type).toBe(PieceType.PAWN);
        expect(initialState.board[6][x]?.color).toBe(PieceColor.WHITE);
        expect(initialState.board[1][x]?.type).toBe(PieceType.PAWN);
        expect(initialState.board[1][x]?.color).toBe(PieceColor.BLACK);
      }
    });

    test('sets white to move first', () => {
      expect(initialState.currentPlayer).toBe(PieceColor.WHITE);
    });

    test('initializes castling rights correctly', () => {
      expect(initialState.castlingRights.whiteKingSide).toBe(true);
      expect(initialState.castlingRights.whiteQueenSide).toBe(true);
      expect(initialState.castlingRights.blackKingSide).toBe(true);
      expect(initialState.castlingRights.blackQueenSide).toBe(true);
    });
  });

  // Basic Move Validation Tests
  describe('Move Validation', () => {
    test('allows valid pawn moves', () => {
      // White pawn two squares forward from starting position
      expect(ChessGameEngine.isValidMove(initialState, { x: 4, y: 6 }, { x: 4, y: 4 })).toBe(true);
      
      // White pawn one square forward from starting position
      expect(ChessGameEngine.isValidMove(initialState, { x: 4, y: 6 }, { x: 4, y: 5 })).toBe(true);
    });

    test('rejects invalid pawn moves', () => {
      // Pawn moving backward
      expect(ChessGameEngine.isValidMove(initialState, { x: 4, y: 6 }, { x: 4, y: 7 })).toBe(false);
      
      // Pawn moving three squares
      expect(ChessGameEngine.isValidMove(initialState, { x: 4, y: 6 }, { x: 4, y: 3 })).toBe(false);
      
      // Pawn moving sideways
      expect(ChessGameEngine.isValidMove(initialState, { x: 4, y: 6 }, { x: 5, y: 6 })).toBe(false);
    });

    test('allows valid knight moves', () => {
      // Knight L-shaped moves
      expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 2, y: 5 })).toBe(true);
      expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 0, y: 5 })).toBe(true);
    });

    test('prevents moving opponent pieces', () => {
      // Trying to move black piece on white's turn
      expect(ChessGameEngine.isValidMove(initialState, { x: 4, y: 1 }, { x: 4, y: 3 })).toBe(false);
    });

    test('prevents capturing own pieces', () => {
      // Trying to capture own piece
      expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 0, y: 7 })).toBe(false);
    });
  });

  // Piece Movement Tests
  describe('Piece Movement Rules', () => {
    test('rook moves horizontally and vertically', () => {
      // Create state with rook in center
      const testState = { ...initialState };
      testState.board[4][4] = {
        id: 'test-rook',
        type: PieceType.ROOK,
        color: PieceColor.WHITE,
        position: { x: 4, y: 4 },
        hasMoved: true
      };
      // Clear the path
      for (let i = 0; i < 8; i++) {
        if (i !== 4) {
          testState.board[4][i] = null; // Horizontal
          testState.board[i][4] = null; // Vertical
        }
      }

      // Valid rook moves
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 7, y: 4 })).toBe(true); // Right
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 0, y: 4 })).toBe(true); // Left
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 7 })).toBe(true); // Down
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 0 })).toBe(true); // Up

      // Invalid rook moves (diagonal)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 6 })).toBe(false);
    });

    test('bishop moves diagonally', () => {
      // Create state with bishop in center
      const testState = { ...initialState };
      testState.board[4][4] = {
        id: 'test-bishop',
        type: PieceType.BISHOP,
        color: PieceColor.WHITE,
        position: { x: 4, y: 4 },
        hasMoved: true
      };
      // Clear diagonal paths
      testState.board[3][3] = null;
      testState.board[5][5] = null;
      testState.board[3][5] = null;
      testState.board[5][3] = null;

      // Valid bishop moves
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 3 })).toBe(true);
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 5, y: 5 })).toBe(true);

      // Invalid bishop moves (straight)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 6 })).toBe(false);
    });

    test('queen combines rook and bishop movement', () => {
      // Create state with queen in center
      const testState = { ...initialState };
      testState.board[4][4] = {
        id: 'test-queen',
        type: PieceType.QUEEN,
        color: PieceColor.WHITE,
        position: { x: 4, y: 4 },
        hasMoved: true
      };
      // Clear paths
      testState.board[4][5] = null;
      testState.board[5][5] = null;

      // Valid queen moves (both straight and diagonal)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 5 })).toBe(true); // Straight
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 5, y: 5 })).toBe(true); // Diagonal

      // Invalid queen moves (knight-like)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 5 })).toBe(false);
    });

    test('king moves one square in any direction', () => {
      // Create state with king in center
      const testState = { ...initialState };
      testState.board[4][4] = {
        id: 'test-king',
        type: PieceType.KING,
        color: PieceColor.WHITE,
        position: { x: 4, y: 4 },
        hasMoved: true
      };
      // Clear adjacent squares
      testState.board[3][3] = null;
      testState.board[3][4] = null;
      testState.board[3][5] = null;
      testState.board[4][3] = null;
      testState.board[4][5] = null;
      testState.board[5][3] = null;
      testState.board[5][4] = null;
      testState.board[5][5] = null;

      // Valid king moves (one square)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 3 })).toBe(true);
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 3 })).toBe(true);

      // Invalid king moves (more than one square)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 2, y: 4 })).toBe(false);
    });

    test('knight moves in L-shape', () => {
      // Create state with knight in center
      const testState = { ...initialState };
      testState.board[4][4] = {
        id: 'test-knight',
        type: PieceType.KNIGHT,
        color: PieceColor.WHITE,
        position: { x: 4, y: 4 },
        hasMoved: true
      };

      // Valid knight moves (L-shaped)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 5 })).toBe(true); // 2 right, 1 down
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 3 })).toBe(true); // 2 right, 1 up
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 5, y: 6 })).toBe(true); // 1 right, 2 down
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 2 })).toBe(true); // 1 left, 2 up

      // Invalid knight moves (not L-shaped)
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 6 })).toBe(false); // Diagonal
      expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 6 })).toBe(false); // Straight
    });
  });

  // Game State Changes
  describe('Game State Changes', () => {
    test('alternates players after move', () => {
      const newState = ChessGameEngine.makeMove(initialState, { x: 4, y: 6 }, { x: 4, y: 4 });
      expect(newState.currentPlayer).toBe(PieceColor.BLACK);
    });

    test('updates piece position after move', () => {
      const newState = ChessGameEngine.makeMove(initialState, { x: 4, y: 6 }, { x: 4, y: 4 });
      expect(newState.board[4][4]?.type).toBe(PieceType.PAWN);
      expect(newState.board[4][4]?.color).toBe(PieceColor.WHITE);
      expect(newState.board[6][4]).toBeNull();
    });

    test('marks piece as moved', () => {
      const newState = ChessGameEngine.makeMove(initialState, { x: 4, y: 6 }, { x: 4, y: 4 });
      expect(newState.board[4][4]?.hasMoved).toBe(true);
    });

    test('records move in history', () => {
      const newState = ChessGameEngine.makeMove(initialState, { x: 4, y: 6 }, { x: 4, y: 4 });
      expect(newState.moves).toHaveLength(1);
      expect(newState.moves[0].from).toEqual({ x: 4, y: 6 });
      expect(newState.moves[0].to).toEqual({ x: 4, y: 4 });
    });
  });

  // Special Moves
  describe('Special Moves', () => {
    test('handles pawn promotion', () => {
      // Create state with white pawn about to promote
      const testState = { ...initialState };
      testState.board[1][4] = {
        id: 'test-pawn',
        type: PieceType.PAWN,
        color: PieceColor.WHITE,
        position: { x: 4, y: 1 },
        hasMoved: true
      };
      testState.board[0][4] = null; // Clear target square

      const newState = ChessGameEngine.makeMove(testState, { x: 4, y: 1 }, { x: 4, y: 0 });
      expect(newState.board[0][4]?.type).toBe(PieceType.QUEEN); // Auto-promotes to queen
    });

    test('handles castling rights after king move', () => {
      // Move white king
      const newState = ChessGameEngine.makeMove(initialState, { x: 4, y: 7 }, { x: 4, y: 6 });
      expect(newState.castlingRights.whiteKingSide).toBe(false);
      expect(newState.castlingRights.whiteQueenSide).toBe(false);
    });

    test('handles castling rights after rook move', () => {
      // Move white king-side rook
      const newState = ChessGameEngine.makeMove(initialState, { x: 7, y: 7 }, { x: 7, y: 6 });
      expect(newState.castlingRights.whiteKingSide).toBe(false);
      expect(newState.castlingRights.whiteQueenSide).toBe(true); // Queen-side still available
    });
  });

  // Check Detection
  describe('Check Detection', () => {
    test('detects when king is in check', () => {
      // Create state where white king is in check
      const testState = { ...initialState };
      testState.board[7][4] = {
        id: 'test-white-king',
        type: PieceType.KING,
        color: PieceColor.WHITE,
        position: { x: 4, y: 7 },
        hasMoved: false
      };
      testState.board[0][4] = {
        id: 'test-black-rook',
        type: PieceType.ROOK,
        color: PieceColor.BLACK,
        position: { x: 4, y: 0 },
        hasMoved: false
      };
      // Clear path between rook and king
      for (let y = 1; y < 7; y++) {
        testState.board[y][4] = null;
      }

      expect(ChessGameEngine.isKingInCheck(testState, PieceColor.WHITE)).toBe(true);
    });

    test('finds king position correctly', () => {
      const kingPos = ChessGameEngine.findKing(initialState, PieceColor.WHITE);
      expect(kingPos).toEqual({ x: 4, y: 7 });

      const blackKingPos = ChessGameEngine.findKing(initialState, PieceColor.BLACK);
      expect(blackKingPos).toEqual({ x: 4, y: 0 });
    });
  });

  // Move Generation
  describe('Move Generation', () => {
    test('generates valid moves for piece', () => {
      const moves = ChessGameEngine.getValidMoves(initialState, { x: 4, y: 6 }); // White pawn
      expect(moves.length).toBeGreaterThan(0);
      expect(moves).toContainEqual({ x: 4, y: 5 }); // One square forward
      expect(moves).toContainEqual({ x: 4, y: 4 }); // Two squares forward
    });

    test('generates all possible moves for color', () => {
      const moves = ChessGameEngine.getAllPossibleMoves(initialState, PieceColor.WHITE);
      expect(moves.length).toBe(20); // 16 pawn moves + 4 knight moves in starting position
    });
  });

  // Performance Tests
  describe('Performance', () => {
    test('move validation completes within reasonable time', () => {
      const start = Date.now();
      
      // Test 100 move validations
      for (let i = 0; i < 100; i++) {
        ChessGameEngine.isValidMove(initialState, { x: 4, y: 6 }, { x: 4, y: 4 });
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('move generation completes within reasonable time', () => {
      const start = Date.now();
      
      // Test move generation
      ChessGameEngine.getAllPossibleMoves(initialState, PieceColor.WHITE);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
