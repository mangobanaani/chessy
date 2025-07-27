import { ChessGameEngine } from '../engine/ChessGameEngine';
import { GameStateManager } from '../managers/GameStateManager';
import { 
  GameState, 
  Position, 
  PieceColor, 
  ChessPiece,
  Move 
} from '../types/gameState';

/**
 * Advanced chess analysis utilities for AI move calculation
 * Demonstrates all available API methods for determining next moves
 */
export class ChessAnalysisAPI {
  
  /**
   * Get comprehensive position analysis - EVERYTHING AN AI NEEDS
   */
  static getCompletePositionAnalysis(gameState: GameState): {
    // Basic position info
    currentPlayer: PieceColor;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isGameOver: boolean;
    
    // All possible moves
    allMoves: Array<{from: Position, to: Position, piece: ChessPiece}>;
    moveCount: number;
    
    // Position evaluation
    positionScore: number;
    materialBalance: number;
    
    // Piece analysis
    whitePieces: Array<{piece: ChessPiece, position: Position}>;
    blackPieces: Array<{piece: ChessPiece, position: Position}>;
    
    // Safety analysis
    kingSafety: {
      whiteKingPosition: Position | null;
      blackKingPosition: Position | null;
      whiteKingUnderAttack: boolean;
      blackKingUnderAttack: boolean;
    };
    
    // Move analysis for each possible move
    moveAnalysis: Array<{
      move: {from: Position, to: Position};
      piece: ChessPiece;
      isCapture: boolean;
      capturedPiece?: ChessPiece;
      evaluationAfterMove: number;
      leavesKingInCheck: boolean;
      isSound: boolean;
      attackersDefenders: {
        attackerCount: number;
        defenderCount: number;
      };
    }>;
  } {
    
    // Get all possible moves for current player
    const allMoves = ChessGameEngine.getAllPossibleMoves(gameState);
    
    // Get pieces by color
    const whitePieces = ChessGameEngine.getPiecesByColor(gameState, PieceColor.WHITE);
    const blackPieces = ChessGameEngine.getPiecesByColor(gameState, PieceColor.BLACK);
    
    // Find kings
    const whiteKing = whitePieces.find(p => p.piece.type === 'king');
    const blackKing = blackPieces.find(p => p.piece.type === 'king');
    
    // Basic position evaluation
    const positionScore = ChessGameEngine.evaluatePosition(gameState);
    
    // Calculate material balance
    const materialValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    let whiteMaterial = 0, blackMaterial = 0;
    
    whitePieces.forEach(p => whiteMaterial += materialValues[p.piece.type]);
    blackPieces.forEach(p => blackMaterial += materialValues[p.piece.type]);
    
    // King safety analysis
    const kingSafety = {
      whiteKingPosition: whiteKing?.position || null,
      blackKingPosition: blackKing?.position || null,
      whiteKingUnderAttack: whiteKing ? 
        ChessGameEngine.isPositionUnderAttack(gameState, whiteKing.position, PieceColor.BLACK) : false,
      blackKingUnderAttack: blackKing ? 
        ChessGameEngine.isPositionUnderAttack(gameState, blackKing.position, PieceColor.WHITE) : false,
    };
    
    // Detailed move analysis
    const moveAnalysis = allMoves.map(moveOption => {
      const { from, to, piece } = moveOption;
      const capturedPiece = gameState.board[to.y][to.x];
      
      // Simulate the move to check consequences
      const hypotheticalState = ChessGameEngine.makeMove(gameState, from, to);
      const evaluationAfterMove = ChessGameEngine.evaluatePosition(hypotheticalState);
      
      // Check if move leaves own king in check
      const leavesKingInCheck = ChessGameEngine.isKingInCheck(hypotheticalState, piece.color);
      
      // Get attack/defense analysis for destination square
      const attackDefenseAnalysis = ChessGameEngine.getPositionAttackersDefenders(hypotheticalState, to);
      
      // Check if move is tactically sound
      const isSound = !leavesKingInCheck && (
        !capturedPiece || // Not a capture, or
        attackDefenseAnalysis.defenderCount > 0 || // Protected, or  
        materialValues[piece.type] <= materialValues[capturedPiece.type] // Good trade
      );
      
      return {
        move: { from, to },
        piece,
        isCapture: !!capturedPiece,
        capturedPiece: capturedPiece || undefined,
        evaluationAfterMove,
        leavesKingInCheck,
        isSound,
        attackersDefenders: {
          attackerCount: attackDefenseAnalysis.attackerCount,
          defenderCount: attackDefenseAnalysis.defenderCount,
        }
      };
    });
    
    return {
      // Basic position info
      currentPlayer: gameState.currentPlayer,
      isCheck: gameState.isCheck,
      isCheckmate: gameState.isCheckmate,
      isStalemate: gameState.isStalemate,
      isGameOver: gameState.isGameOver,
      
      // All possible moves
      allMoves,
      moveCount: allMoves.length,
      
      // Position evaluation
      positionScore,
      materialBalance: whiteMaterial - blackMaterial,
      
      // Piece analysis
      whitePieces,
      blackPieces,
      
      // Safety analysis
      kingSafety,
      
      // Move analysis
      moveAnalysis: moveAnalysis.sort((a, b) => b.evaluationAfterMove - a.evaluationAfterMove)
    };
  }
  
  /**
   * Get best N moves according to evaluation
   */
  static getBestMoves(gameState: GameState, count: number = 5): Array<{
    from: Position;
    to: Position;
    piece: ChessPiece;
    evaluation: number;
    rank: number;
  }> {
    const analysis = this.getCompletePositionAnalysis(gameState);
    
    return analysis.moveAnalysis
      .filter(move => move.isSound && !move.leavesKingInCheck)
      .slice(0, count)
      .map((move, index) => ({
        from: move.move.from,
        to: move.move.to,
        piece: move.piece,
        evaluation: move.evaluationAfterMove,
        rank: index + 1
      }));
  }
  
  /**
   * Find tactical moves (captures, checks, threats)
   */
  static getTacticalMoves(gameState: GameState): {
    captures: Array<{from: Position, to: Position, capturedPiece: ChessPiece}>;
    checks: Array<{from: Position, to: Position}>;
    threats: Array<{from: Position, to: Position, threatenedPiece: ChessPiece}>;
  } {
    const analysis = this.getCompletePositionAnalysis(gameState);
    
    const captures = analysis.moveAnalysis
      .filter(move => move.isCapture && move.capturedPiece)
      .map(move => ({
        from: move.move.from,
        to: move.move.to,
        capturedPiece: move.capturedPiece!
      }));
    
    const checks = analysis.moveAnalysis
      .filter(move => {
        const hypotheticalState = ChessGameEngine.makeMove(gameState, move.move.from, move.move.to);
        const opponentColor = gameState.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
        return ChessGameEngine.isKingInCheck(hypotheticalState, opponentColor);
      })
      .map(move => move.move);
    
    // Find moves that threaten opponent pieces
    const threats = analysis.moveAnalysis
      .filter(move => {
        const hypotheticalState = ChessGameEngine.makeMove(gameState, move.move.from, move.move.to);
        const opponentColor = gameState.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
        const opponentPieces = ChessGameEngine.getPiecesByColor(hypotheticalState, opponentColor);
        
        return opponentPieces.some(enemyPiece => 
          ChessGameEngine.isPositionUnderAttack(hypotheticalState, enemyPiece.position, gameState.currentPlayer)
        );
      })
      .map(move => {
        const hypotheticalState = ChessGameEngine.makeMove(gameState, move.move.from, move.move.to);
        const opponentColor = gameState.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
        const opponentPieces = ChessGameEngine.getPiecesByColor(hypotheticalState, opponentColor);
        
        const threatenedPiece = opponentPieces.find(enemyPiece => 
          ChessGameEngine.isPositionUnderAttack(hypotheticalState, enemyPiece.position, gameState.currentPlayer)
        )?.piece;
        
        return {
          from: move.move.from,
          to: move.move.to,
          threatenedPiece: threatenedPiece!
        };
      })
      .filter(threat => threat.threatenedPiece);
    
    return { captures, checks, threats };
  }
  
  /**
   * Validate if a proposed move makes sense
   */
  static validateProposedMove(gameState: GameState, from: Position, to: Position): {
    isLegal: boolean;
    isSound: boolean;
    evaluation: number;
    risks: string[];
    benefits: string[];
  } {
    const isLegal = ChessGameEngine.isValidMove(gameState, from, to);
    
    if (!isLegal) {
      return {
        isLegal: false,
        isSound: false,
        evaluation: -1000,
        risks: ['Move is not legal'],
        benefits: []
      };
    }
    
    const piece = gameState.board[from.y][from.x]!;
    const capturedPiece = gameState.board[to.y][to.x];
    
    const hypotheticalState = ChessGameEngine.makeMove(gameState, from, to);
    const evaluation = ChessGameEngine.evaluatePosition(hypotheticalState);
    
    const risks: string[] = [];
    const benefits: string[] = [];
    
    // Check for risks
    const leavesKingInCheck = ChessGameEngine.isKingInCheck(hypotheticalState, piece.color);
    if (leavesKingInCheck) risks.push('Leaves king in check');
    
    const isUnderAttack = ChessGameEngine.isPositionUnderAttack(hypotheticalState, to, 
      piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE);
    const attackDefense = ChessGameEngine.getPositionAttackersDefenders(hypotheticalState, to);
    
    if (isUnderAttack && attackDefense.defenderCount === 0) {
      risks.push(`Piece becomes undefended`);
    }
    
    // Check for benefits
    if (capturedPiece) {
      benefits.push(`Captures ${capturedPiece.type}`);
    }
    
    const opponentColor = piece.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    if (ChessGameEngine.isKingInCheck(hypotheticalState, opponentColor)) {
      benefits.push('Gives check');
    }
    
    const isSound = risks.length === 0 || benefits.length > risks.length;
    
    return {
      isLegal,
      isSound,
      evaluation,
      risks,
      benefits
    };
  }

  /**
   * Example: How to use GameStateManager for AI integration
   */
  static demonstrateGameStateManagerUsage(gameManager: GameStateManager): void {
    const currentState = gameManager.getCurrentState();
    
    console.log('=== COMPLETE AI ANALYSIS EXAMPLE ===');
    
    // Get all the information an AI needs
    const allMoves = gameManager.getAllPossibleMoves();
    console.log(`Available moves: ${allMoves.length}`);
    
    const currentPlayerPieces = gameManager.getPiecesByColor(currentState.currentPlayer);
    console.log(`${currentState.currentPlayer} pieces: ${currentPlayerPieces.length}`);
    
    const positionEval = gameManager.evaluatePosition();
    console.log(`Position evaluation: ${positionEval}`);
    
    // Analyze each possible move
    console.log('\n=== MOVE ANALYSIS ===');
    allMoves.slice(0, 5).forEach((move, index) => {
      console.log(`${index + 1}. ${JSON.stringify(move.from)} -> ${JSON.stringify(move.to)}`);
      
      // Simulate the move
      const futureState = gameManager.simulateMove(move.from, move.to);
      if (futureState) {
        const futureEval = ChessGameEngine.evaluatePosition(futureState);
        console.log(`   Evaluation after move: ${futureEval}`);
        
        const isUnderAttack = gameManager.isPositionUnderAttack(move.to, 
          currentState.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE);
        console.log(`   Destination under attack: ${isUnderAttack}`);
      }
    });
    
    console.log('\n=== THIS IS EVERYTHING YOUR AI NEEDS! ===');
  }
}

export default ChessAnalysisAPI;
