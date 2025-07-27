import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Move, PieceColor } from '../types/gameState';
import { ChessAIManager, AIDifficulty, AIConfig, AIStats, AIPersonality } from '../engine/ChessAIManager';

// Export types for external use
export type { AIConfig, AIStats, AIPersonality } from '../engine/ChessAIManager';
export { AIDifficulty } from '../engine/ChessAIManager';

/**
 * Hook state for chess AI
 */
interface UseChessAIState {
  isThinking: boolean;
  lastMove: Move | null;
  lastStats: AIStats | null;
  difficulty: AIDifficulty;
  config: AIConfig;
  error: string | null;
}

/**
 * Return type for useChessAI hook
 */
interface UseChessAIReturn {
  // State
  state: UseChessAIState;
  
  // Actions
  findBestMove: (gameState: GameState) => Promise<Move | null>;
  analyzePosition: (gameState: GameState, candidateCount?: number) => Promise<Array<{move: Move, evaluation: number}>>;
  setDifficulty: (difficulty: AIDifficulty) => void;
  setPersonality: (personality: AIPersonality) => void;
  updateConfig: (config: Partial<AIConfig>) => void;
  
  // Utilities
  evaluatePosition: (gameState: GameState) => number;
  shouldResign: (gameState: GameState) => boolean;
  shouldOfferDraw: (gameState: GameState) => boolean;
  reset: () => void;
  
  // AI suggestions
  getSuggestedMoves: (gameState: GameState, count?: number) => Promise<Array<{move: Move, evaluation: number, description: string}>>;
  getPositionAnalysis: (gameState: GameState) => Promise<{
    evaluation: number;
    description: string;
    threats: string[];
    opportunities: string[];
  }>;
}

/**
 * Custom React hook for chess AI integration
 * Provides easy-to-use interface for AI functionality in React components
 */
export function useChessAI(initialDifficulty: AIDifficulty = AIDifficulty.INTERMEDIATE): UseChessAIReturn {
  const aiManagerRef = useRef<ChessAIManager | null>(null);
  const [state, setState] = useState<UseChessAIState>({
    isThinking: false,
    lastMove: null,
    lastStats: null,
    difficulty: initialDifficulty,
    config: {} as AIConfig,
    error: null
  });

  // Initialize AI manager
  useEffect(() => {
    aiManagerRef.current = new ChessAIManager(initialDifficulty);
    setState(prev => ({
      ...prev,
      config: aiManagerRef.current!.getConfig()
    }));
  }, [initialDifficulty]);

  /**
   * Find best move for current position
   */
  const findBestMove = useCallback(async (gameState: GameState): Promise<Move | null> => {
    if (!aiManagerRef.current) return null;

    setState(prev => ({ ...prev, isThinking: true, error: null }));

    try {
      const result = await aiManagerRef.current.findBestMove(gameState);
      
      setState(prev => ({
        ...prev,
        isThinking: false,
        lastMove: result.move,
        lastStats: result.stats
      }));

      return result.move;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI analysis failed';
      setState(prev => ({
        ...prev,
        isThinking: false,
        error: errorMessage
      }));
      return null;
    }
  }, []);

  /**
   * Analyze position and get candidate moves
   */
  const analyzePosition = useCallback(async (
    gameState: GameState, 
    candidateCount: number = 3
  ): Promise<Array<{move: Move, evaluation: number}>> => {
    if (!aiManagerRef.current) return [];

    try {
      const result = await aiManagerRef.current.analyzePosition(gameState, candidateCount);
      
      setState(prev => ({
        ...prev,
        lastStats: result.stats
      }));

      return result.moves;
    } catch (error) {
      console.error('Position analysis failed:', error);
      return [];
    }
  }, []);

  /**
   * Set AI difficulty level
   */
  const setDifficulty = useCallback((difficulty: AIDifficulty) => {
    if (aiManagerRef.current) {
      aiManagerRef.current = new ChessAIManager(difficulty);
      setState(prev => ({
        ...prev,
        difficulty,
        config: aiManagerRef.current!.getConfig()
      }));
    }
  }, []);

  /**
   * Set AI personality
   */
  const setPersonality = useCallback((personality: AIPersonality) => {
    if (aiManagerRef.current) {
      aiManagerRef.current.setPersonality(personality);
      setState(prev => ({
        ...prev,
        config: aiManagerRef.current!.getConfig()
      }));
    }
  }, []);

  /**
   * Update AI configuration
   */
  const updateConfig = useCallback((config: Partial<AIConfig>) => {
    if (aiManagerRef.current) {
      aiManagerRef.current.updateConfig(config);
      setState(prev => ({
        ...prev,
        config: aiManagerRef.current!.getConfig()
      }));
    }
  }, []);

  /**
   * Evaluate current position
   */
  const evaluatePosition = useCallback((gameState: GameState): number => {
    return aiManagerRef.current?.evaluatePosition(gameState) ?? 0;
  }, []);

  /**
   * Check if AI should resign
   */
  const shouldResign = useCallback((gameState: GameState): boolean => {
    return aiManagerRef.current?.shouldResign(gameState) ?? false;
  }, []);

  /**
   * Check if AI should offer draw
   */
  const shouldOfferDraw = useCallback((gameState: GameState): boolean => {
    return aiManagerRef.current?.shouldOfferDraw(gameState) ?? false;
  }, []);

  /**
   * Reset AI state
   */
  const reset = useCallback(() => {
    if (aiManagerRef.current) {
      aiManagerRef.current.reset();
      setState(prev => ({
        ...prev,
        lastMove: null,
        lastStats: null,
        error: null
      }));
    }
  }, []);

  /**
   * Get suggested moves with descriptions
   */
  const getSuggestedMoves = useCallback(async (
    gameState: GameState, 
    count: number = 3
  ): Promise<Array<{move: Move, evaluation: number, description: string}>> => {
    const candidates = await analyzePosition(gameState, count);
    
    return candidates.map(candidate => ({
      ...candidate,
      description: generateMoveDescription(candidate.move, candidate.evaluation)
    }));
  }, [analyzePosition]);

  /**
   * Get detailed position analysis
   */
  const getPositionAnalysis = useCallback(async (gameState: GameState): Promise<{
    evaluation: number;
    description: string;
    threats: string[];
    opportunities: string[];
  }> => {
    const evaluation = evaluatePosition(gameState);
    const description = generatePositionDescription(gameState, evaluation);
    
    // Simplified threat and opportunity detection
    const threats = detectThreats(gameState);
    const opportunities = detectOpportunities(gameState);
    
    return {
      evaluation,
      description,
      threats,
      opportunities
    };
  }, [evaluatePosition]);

  return {
    state,
    findBestMove,
    analyzePosition,
    setDifficulty,
    setPersonality,
    updateConfig,
    evaluatePosition,
    shouldResign,
    shouldOfferDraw,
    reset,
    getSuggestedMoves,
    getPositionAnalysis
  };
}

/**
 * Helper function to generate move descriptions
 */
function generateMoveDescription(move: Move, evaluation: number): string {
  const evalDescription = evaluation > 100 ? 'excellent' :
                         evaluation > 50 ? 'good' :
                         evaluation > 0 ? 'decent' :
                         evaluation > -50 ? 'questionable' : 'poor';
  
  if (move.capturedPiece) {
    return `Captures ${move.capturedPiece.type} - ${evalDescription} move`;
  }
  
  if (move.isCastling) {
    return `Castling - ${evalDescription} for king safety`;
  }
  
  if (move.promotedTo) {
    return `Pawn promotion to ${move.promotedTo} - ${evalDescription}`;
  }
  
  return `${move.piece.type} to ${move.notation || 'destination'} - ${evalDescription}`;
}

/**
 * Helper function to generate position descriptions
 */
function generatePositionDescription(gameState: GameState, evaluation: number): string {
  const absEval = Math.abs(evaluation);
  
  if (absEval < 25) {
    return 'Balanced position with equal chances for both sides';
  } else if (absEval < 100) {
    const advantage = evaluation > 0 ? 'White' : 'Black';
    return `${advantage} has a slight advantage`;
  } else if (absEval < 300) {
    const advantage = evaluation > 0 ? 'White' : 'Black';
    return `${advantage} has a clear advantage`;
  } else {
    const advantage = evaluation > 0 ? 'White' : 'Black';
    return `${advantage} has a decisive advantage`;
  }
}

/**
 * Helper function to detect threats
 */
function detectThreats(gameState: GameState): string[] {
  const threats: string[] = [];
  
  if (gameState.isCheck) {
    threats.push('King is in check');
  }
  
  if (gameState.isCheckmate) {
    threats.push('Checkmate');
  }
  
  // Additional threat detection would go here
  // (hanging pieces, tactical motifs, etc.)
  
  return threats;
}

/**
 * Helper function to detect opportunities
 */
function detectOpportunities(_gameState: GameState): string[] {
  const opportunities: string[] = [];
  
  // Basic opportunity detection
  // (attacks on pieces, tactical patterns, etc.)
  
  return opportunities;
}

/**
 * Hook for managing AI vs AI games
 */
export function useAIvsAI() {
  const [whiteAI] = useState(() => new ChessAIManager(AIDifficulty.ADVANCED));
  const [blackAI] = useState(() => new ChessAIManager(AIDifficulty.ADVANCED));
  const [isRunning, setIsRunning] = useState(false);
  const [gameHistory, setGameHistory] = useState<Move[]>([]);

  const startAIGame = useCallback(async (
    gameState: GameState,
    onMove: (move: Move) => void,
    onGameEnd: (result: any) => void
  ) => {
    setIsRunning(true);
    setGameHistory([]);

    // TODO: Implement proper game state updates in the loop
    // Currently this would be an infinite loop without state updates
    const currentState = gameState;
    
    while (!currentState.isGameOver && isRunning) {
      const currentAI = currentState.currentPlayer === PieceColor.WHITE ? whiteAI : blackAI;
      
      try {
        const result = await currentAI.findBestMove(currentState);
        if (!result.move) break;
        
        setGameHistory(prev => [...prev, result.move!]);
        onMove(result.move);
        
        // Update state (would need to integrate with your game state management)
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between moves
        
      } catch (error) {
        console.error('AI vs AI game error:', error);
        break;
      }
    }
    
    setIsRunning(false);
    onGameEnd(currentState);
  }, [whiteAI, blackAI, isRunning]);

  const stopAIGame = useCallback(() => {
    setIsRunning(false);
  }, []);

  return {
    startAIGame,
    stopAIGame,
    isRunning,
    gameHistory,
    whiteAI,
    blackAI
  };
}
