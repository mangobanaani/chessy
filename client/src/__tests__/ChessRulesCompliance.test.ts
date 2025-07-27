import { ChessGameEngine } from '../engine/ChessGameEngine';
import { PieceType, PieceColor, GameState } from '../types/gameState';

/**
 * Chess Rules Verification Tests
 * Based on official FIDE Laws of Chess: https://en.wikipedia.org/wiki/Rules_of_chess
 */
describe('Chess Rules Compliance', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = ChessGameEngine.createInitialState('test', 'White', 'Black');
  });

  describe('Article 3: The moves of the pieces', () => {
    describe('3.1 Pawn Movement', () => {
      test('pawn moves one square forward to an unoccupied square', () => {
        expect(ChessGameEngine.isValidMove(initialState, { x: 0, y: 6 }, { x: 0, y: 5 })).toBe(true);
      });

      test('pawn on starting rank can move two squares forward if both squares are unoccupied', () => {
        expect(ChessGameEngine.isValidMove(initialState, { x: 0, y: 6 }, { x: 0, y: 4 })).toBe(true);
      });

      test('pawn cannot move two squares if not on starting rank', () => {
        // Move pawn first
        const movedState = ChessGameEngine.makeMove(initialState, { x: 0, y: 6 }, { x: 0, y: 5 });
        const afterBlackMove = ChessGameEngine.makeMove(movedState, { x: 0, y: 1 }, { x: 0, y: 2 });
        
        // Try to move white pawn two squares (should fail)
        expect(ChessGameEngine.isValidMove(afterBlackMove, { x: 0, y: 5 }, { x: 0, y: 3 })).toBe(false);
      });

      test('pawn captures diagonally one square forward', () => {
        // Create state with enemy piece to capture
        const testState = { ...initialState };
        testState.board[5][1] = {
          id: 'black-pawn',
          type: PieceType.PAWN,
          color: PieceColor.BLACK,
          position: { x: 1, y: 5 },
          hasMoved: true
        };

        expect(ChessGameEngine.isValidMove(testState, { x: 0, y: 6 }, { x: 1, y: 5 })).toBe(true);
      });

      test('pawn cannot capture forward', () => {
        // Place enemy piece directly in front
        const testState = { ...initialState };
        testState.board[5][0] = {
          id: 'black-pawn',
          type: PieceType.PAWN,
          color: PieceColor.BLACK,
          position: { x: 0, y: 5 },
          hasMoved: true
        };

        expect(ChessGameEngine.isValidMove(testState, { x: 0, y: 6 }, { x: 0, y: 5 })).toBe(false);
      });
    });

    describe('3.2 Rook Movement', () => {
      test('rook moves horizontally any number of squares', () => {
        const testState = { ...initialState };
        // Clear the path and place rook in center
        testState.board[4][4] = testState.board[7][0]; // Move rook to center
        testState.board[7][0] = null;
        // Clear horizontal path
        for (let x = 0; x < 8; x++) {
          if (x !== 4) testState.board[4][x] = null;
        }

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 7, y: 4 })).toBe(true);
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 0, y: 4 })).toBe(true);
      });

      test('rook moves vertically any number of squares', () => {
        const testState = { ...initialState };
        // Clear the path and place rook in center
        testState.board[4][4] = testState.board[7][0]; // Move rook to center
        testState.board[7][0] = null;
        // Clear vertical path
        for (let y = 0; y < 8; y++) {
          if (y !== 4) testState.board[y][4] = null;
        }

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 7 })).toBe(true);
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 0 })).toBe(true);
      });

      test('rook cannot move diagonally', () => {
        const testState = { ...initialState };
        testState.board[4][4] = testState.board[7][0]; // Move rook to center
        testState.board[7][0] = null;

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 6 })).toBe(false);
      });
    });

    describe('3.3 Bishop Movement', () => {
      test('bishop moves diagonally any number of squares', () => {
        const testState = { ...initialState };
        // Clear the path and place bishop in center
        testState.board[4][4] = testState.board[7][2]; // Move bishop to center
        testState.board[7][2] = null;
        // Clear diagonal paths
        testState.board[3][3] = null;
        testState.board[5][5] = null;

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 3 })).toBe(true);
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 5, y: 5 })).toBe(true);
      });

      test('bishop cannot move horizontally or vertically', () => {
        const testState = { ...initialState };
        testState.board[4][4] = testState.board[7][2]; // Move bishop to center
        testState.board[7][2] = null;

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 6, y: 4 })).toBe(false);
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 6 })).toBe(false);
      });
    });

    describe('3.4 Queen Movement', () => {
      test('queen combines rook and bishop movements', () => {
        const testState = { ...initialState };
        // Clear the path and place queen in center
        testState.board[4][4] = testState.board[7][3]; // Move queen to center
        testState.board[7][3] = null;
        // Clear some paths
        testState.board[4][5] = null; // Horizontal
        testState.board[5][4] = null; // Vertical
        testState.board[5][5] = null; // Diagonal

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 5 })).toBe(true); // Rook-like
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 5, y: 4 })).toBe(true); // Rook-like
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 5, y: 5 })).toBe(true); // Bishop-like
      });
    });

    describe('3.5 King Movement', () => {
      test('king moves one square in any direction', () => {
        const testState = { ...initialState };
        // Clear the path and place king in center
        testState.board[4][4] = testState.board[7][4]; // Move king to center
        testState.board[7][4] = null;
        // Clear adjacent squares
        testState.board[3][3] = null;
        testState.board[3][4] = null;
        testState.board[4][3] = null;

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 3 })).toBe(true); // Diagonal
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 4 })).toBe(true); // Horizontal
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 4, y: 3 })).toBe(true); // Vertical
      });

      test('king cannot move more than one square', () => {
        const testState = { ...initialState };
        testState.board[4][4] = testState.board[7][4]; // Move king to center
        testState.board[7][4] = null;

        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 2, y: 4 })).toBe(false);
      });
    });

    describe('3.6 Knight Movement', () => {
      test('knight moves in L-shape: two squares in one direction, one square perpendicular', () => {
        expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 2, y: 5 })).toBe(true);
        expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 0, y: 5 })).toBe(true);
        expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 3, y: 6 })).toBe(true);
      });

      test('knight cannot move in non-L patterns', () => {
        expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 2, y: 6 })).toBe(false); // Diagonal
        expect(ChessGameEngine.isValidMove(initialState, { x: 1, y: 7 }, { x: 1, y: 5 })).toBe(false); // Vertical
      });
    });
  });

  describe('Article 4: Special Moves', () => {
    describe('4.1 Castling', () => {
      test('castling rights exist initially', () => {
        expect(initialState.castlingRights.whiteKingSide).toBe(true);
        expect(initialState.castlingRights.whiteQueenSide).toBe(true);
        expect(initialState.castlingRights.blackKingSide).toBe(true);
        expect(initialState.castlingRights.blackQueenSide).toBe(true);
      });

      test('castling rights are lost when king moves', () => {
        const newState = ChessGameEngine.makeMove(initialState, { x: 4, y: 7 }, { x: 4, y: 6 });
        expect(newState.castlingRights.whiteKingSide).toBe(false);
        expect(newState.castlingRights.whiteQueenSide).toBe(false);
      });

      test('castling rights are lost when rook moves', () => {
        const newState = ChessGameEngine.makeMove(initialState, { x: 7, y: 7 }, { x: 7, y: 6 });
        expect(newState.castlingRights.whiteKingSide).toBe(false);
        expect(newState.castlingRights.whiteQueenSide).toBe(true); // Queen side still intact
      });
    });

    describe('4.2 Pawn Promotion', () => {
      test('pawn promotes when reaching opposite end', () => {
        // Create state with pawn about to promote
        const testState = { ...initialState };
        testState.board[1][4] = {
          id: 'promoting-pawn',
          type: PieceType.PAWN,
          color: PieceColor.WHITE,
          position: { x: 4, y: 1 },
          hasMoved: true
        };
        testState.board[0][4] = null; // Clear promotion square

        const newState = ChessGameEngine.makeMove(testState, { x: 4, y: 1 }, { x: 4, y: 0 });
        expect(newState.board[0][4]?.type).toBe(PieceType.QUEEN); // Auto-promotes to queen
        expect(newState.board[1][4]).toBeNull(); // Pawn is gone
      });
    });
  });

  describe('Article 5: Check, Checkmate, and Stalemate', () => {
    describe('5.1 Check Detection', () => {
      test('detects when king is in check', () => {
        // Create a position where white king is in check
        const testState = { ...initialState };
        // Clear the board and place specific pieces
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            testState.board[y][x] = null;
          }
        }
        
        // Place white king
        testState.board[7][4] = {
          id: 'white-king',
          type: PieceType.KING,
          color: PieceColor.WHITE,
          position: { x: 4, y: 7 },
          hasMoved: false
        };
        
        // Place black rook attacking the king
        testState.board[0][4] = {
          id: 'black-rook',
          type: PieceType.ROOK,
          color: PieceColor.BLACK,
          position: { x: 4, y: 0 },
          hasMoved: false
        };

        expect(ChessGameEngine.isKingInCheck(testState, PieceColor.WHITE)).toBe(true);
      });

      test('king cannot move into check', () => {
        // Create a position where king would move into check
        const testState = { ...initialState };
        // Clear and setup specific position
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            testState.board[y][x] = null;
          }
        }
        
        testState.board[4][4] = {
          id: 'white-king',
          type: PieceType.KING,
          color: PieceColor.WHITE,
          position: { x: 4, y: 4 },
          hasMoved: true
        };
        
        testState.board[0][3] = {
          id: 'black-rook',
          type: PieceType.ROOK,
          color: PieceColor.BLACK,
          position: { x: 3, y: 0 },
          hasMoved: false
        };

        // King cannot move to x:3 because it would be in check from the rook
        expect(ChessGameEngine.isValidMove(testState, { x: 4, y: 4 }, { x: 3, y: 4 })).toBe(false);
      });
    });
  });

  describe('Performance Requirements', () => {
    test('move validation is fast enough for real-time play', () => {
      const start = Date.now();
      
      // Perform 1000 move validations
      for (let i = 0; i < 1000; i++) {
        ChessGameEngine.isValidMove(initialState, { x: 0, y: 6 }, { x: 0, y: 4 });
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('position evaluation is efficient', () => {
      const start = Date.now();
      
      // Perform 100 position evaluations
      for (let i = 0; i < 100; i++) {
        ChessGameEngine.evaluatePosition(initialState);
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
