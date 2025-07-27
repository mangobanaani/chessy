import React, { useState, useMemo, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { GameStateManager } from '../managers/GameStateManager';
import { ChessRenderer } from '../rendering/ChessRenderer';
import { ChessBoardUI } from './ChessBoardUI';
import { useChessAI, AIDifficulty } from '../hooks/useChessAI';
import { ChessAIManager } from '../engine/ChessAIManager';
import { 
  Position, 
  PieceColor, 
  PieceType,
  GameResult,
  Move 
} from '../types/gameState';

/**
 * Main Chess Application Component
 * 
 * Orchestrates the complete chess game experience including:
 * - Game state management and player interactions
 * - AI opponent with configurable difficulty and personality
 * - Real-time move suggestions and position analysis
 * - Game timing and move history tracking
 * 
 * Architecture follows clean separation of concerns:
 * - Presentation layer (React components and styled components)
 * - Business logic layer (GameStateManager, ChessAI)
 * - Data layer (game state, move history, AI configuration)
 * 
 * @component
 * @author Chess Application Team
 */

// Styled Components - Glassmorphic Design System
// All components follow consistent design patterns with proper theming
const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const GamePanel = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 30px;
  box-shadow: 
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 1200px;
  width: 100%;
`;

const GameContent = styled.div`
  display: flex;
  gap: 30px;
  width: 100%;
  align-items: flex-start;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const BoardSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GameTitle = styled.h1`
  color: rgba(255, 255, 255, 0.95);
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
`;

const CopyrightText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 5px 0 0 0;
  text-align: center;
  font-weight: 400;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const GameClockSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  box-shadow: 
    0 4px 16px 0 rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  min-width: 280px;
`;

const ClockDisplay = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

interface PlayerClockProps {
  isActive: boolean;
  isWhite: boolean;
}

const PlayerClock = styled.div<PlayerClockProps>`
  background: ${props => props.isActive 
    ? props.isWhite 
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0, 0, 0, 0.3)'
    : 'rgba(255, 255, 255, 0.05)'
  };
  border: 2px solid ${props => props.isActive 
    ? props.isWhite 
      ? 'rgba(255, 255, 255, 0.6)'
      : 'rgba(0, 0, 0, 0.6)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  border-radius: 12px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  box-shadow: ${props => props.isActive 
    ? '0 4px 20px rgba(255, 255, 255, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.1)'
  };
`;

interface PlayerNameProps {
  isActive: boolean;
}

const PlayerName = styled.div<PlayerNameProps>`
  color: ${props => props.isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)'};
  font-weight: ${props => props.isActive ? '700' : '500'};
  font-size: 1rem;
  transition: all 0.3s ease;
`;

interface TimeDisplayProps {
  isLowTime: boolean;
}

const TimeDisplay = styled.div<TimeDisplayProps>`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.isLowTime ? '#ff6b6b' : 'rgba(255, 255, 255, 0.95)'};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  animation: ${props => props.isLowTime ? 'pulse 1s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

const MoveHistorySection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  box-shadow: 
    0 4px 16px 0 rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  min-width: 280px;
  height: 300px;
  display: flex;
  flex-direction: column;
`;

const MoveHistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 1.1rem;
`;

const CopyButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  padding: 5px 10px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const MoveHistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }
`;

const MovePair = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MoveNumber = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  min-width: 35px;
  font-size: 0.9rem;
`;

const WhiteMove = styled.span`
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.95rem;
  min-width: 60px;
`;

const BlackMove = styled.span`
  color: rgba(200, 200, 200, 0.9);
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.95rem;
  min-width: 60px;
`;

const NewGameButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 1);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const GameStatus = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const GameSetupSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 
    0 4px 16px 0 rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
`;

const SideSelection = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
`;

const SideLabel = styled.label`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 1rem;
  min-width: 100px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 1);
  }
  
  input[type="radio"] {
    margin: 0;
    accent-color: #667eea;
  }
`;

const StartGameButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
  }
`;

const AIConfigSection = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 600px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const DropdownContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const DropdownLabel = styled.label`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 0.9rem;
`;

const Dropdown = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(102, 126, 234, 0.5);
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
  
  option {
    background: rgba(30, 30, 30, 0.95);
    color: rgba(255, 255, 255, 0.9);
    padding: 8px 12px;
  }
`;

const SuggestMoveButton = styled.button`
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: 12px;
  color: white;
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(240, 147, 251, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 15px rgba(240, 147, 251, 0.2);
  }
`;

const SuggestionsPanel = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  box-shadow: 
    0 4px 16px 0 rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  min-width: 280px;
`;

const SuggestionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin: 8px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
`;

const SuggestionMove = styled.span`
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-weight: 600;
  font-size: 1rem;
`;

const SuggestionScore = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 500;
`;

const SuggestionRank = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
`;

const OverlayControlsSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  box-shadow: 
    0 4px 16px 0 rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  min-width: 280px;
`;

/**
 * Props interface for the main chess application component
 * 
 * @interface SimpleChessAppProps
 * @property {string} [initialFEN] - Optional FEN string to initialize game from specific position
 */
interface SimpleChessAppProps {
  initialFEN?: string;
}

/**
 * Game clock state interface
 * Manages timing for both players with active player tracking
 * 
 * @interface GameClock
 * @property {number} white - Remaining time for white player in seconds
 * @property {number} black - Remaining time for black player in seconds  
 * @property {PieceColor} activePlayer - Currently active player (whose time is ticking)
 * @property {boolean} isRunning - Whether the clock is currently counting down
 */
interface GameClock {
  white: number;
  black: number;
  activePlayer: PieceColor;
  isRunning: boolean;
}

/**
 * AI-generated move suggestion with evaluation data
 * Used for displaying move recommendations to the player
 * 
 * @interface SuggestedMove
 * @property {Position} from - Starting position of the suggested move
 * @property {Position} to - Target position of the suggested move
 * @property {string} notation - Algebraic notation representation of the move
 * @property {number} score - Position evaluation score after this move
 * @property {number} rank - Ranking of this suggestion (1 = best, 2 = second best, etc.)
 */
interface SuggestedMove {
  from: Position;
  to: Position;
  notation: string;
  score: number;
  rank: number;
}

/**
 * Board overlay configuration for visual enhancements
 * Controls which overlays are displayed on the chess board
 * 
 * @interface BoardOverlay
 * @property {boolean} suggestedMoves - Whether to show move suggestion overlays
 */
interface BoardOverlay {
  suggestedMoves: boolean;
}

export const SimpleChessApp: React.FC<SimpleChessAppProps> = ({ initialFEN }) => {
  // Core game state management
  // These states control the fundamental game flow and player interaction
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [playerSide, setPlayerSide] = useState<PieceColor | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [selectedSide, setSelectedSide] = useState<PieceColor>(PieceColor.WHITE);
  const [gameKey, setGameKey] = useState<number>(0); // Forces board re-render on reset
  
  // AI configuration state management
  // Controls AI behavior, difficulty, and thinking status
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(AIDifficulty.BEGINNER);
  const [aiPersonalityKey, setAiPersonalityKey] = useState<string>('positional');
  const [aiIsThinking, setAiIsThinking] = useState<boolean>(false);
  
  // Memoized AI personality object derived from selected key
  // Prevents unnecessary re-renders when personality key doesn't change
  const aiPersonality = useMemo(() => {
    const personalities = ChessAIManager.getPersonalityProfiles();
    return personalities[aiPersonalityKey];
  }, [aiPersonalityKey]);
  
  // UI state for move suggestions and board overlays
  // Manages the visual feedback system for move recommendations
  const [suggestedMoves, setSuggestedMoves] = useState<SuggestedMove[]>([]);
  const [boardOverlay, setBoardOverlay] = useState<BoardOverlay>({
    suggestedMoves: false
  });
  
  // Game timing system state
  // Controls chess clock functionality with configurable time limits
  const [gameClock, setGameClock] = useState<GameClock>({
    white: 300, // 5 minutes default
    black: 300,
    activePlayer: PieceColor.WHITE,
    isRunning: false
  });

  // Initialize AI hook with selected difficulty
  // This hook manages the AI engine lifecycle and configuration
  const ai = useChessAI(aiDifficulty);
  
  // Synchronize AI personality changes with the AI engine
  // Ensures personality updates are applied immediately
  useEffect(() => {
    if (ai && aiPersonality) {
      ai.setPersonality(aiPersonality);
    }
  }, [ai, aiPersonality]);

  // Initialize GameStateManager with error handling
  // This is the core game logic orchestrator, memoized for performance
  const gameStateManager = useMemo(() => {
    try {
      const manager = new GameStateManager('chess-game', 'Player', 'AI');
      console.log('GameStateManager initialized successfully');
      return manager;
    } catch (error) {
      console.error('Failed to initialize GameStateManager:', error);
      return null;
    }
  }, [initialFEN]);

  // Memoized move history for efficient rendering
  // Only recalculates when game state actually changes
  const moves = useMemo(() => {
    if (!gameStateManager) return [];
    return gameStateManager.getMoveHistory();
  }, [gameStateManager?.getCurrentState()]);

  /**
   * Formats time duration into MM:SS display format
   * @param seconds - Time in seconds to format
   * @returns Formatted time string (e.g. "05:30")
   */
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Suggestion interaction handlers
  const handleSuggestMoves = useCallback(async () => {
    if (!gameStateManager || !gameStarted || !ai) return;
    
    try {
      const gameState = gameStateManager.getCurrentState();
      const suggestions = await ai.getSuggestedMoves(gameState, 3);
      
      // Convert AI suggestions to UI format
      const uiSuggestions = suggestions.map((suggestion, _index) => ({
        from: suggestion.move.from,
        to: suggestion.move.to,
        notation: suggestion.move.notation || ChessRenderer.positionToNotation(suggestion.move.from) + ChessRenderer.positionToNotation(suggestion.move.to),
        score: Math.round(suggestion.evaluation * 10) / 10,
        rank: _index + 1
      }));
      
      setSuggestedMoves(uiSuggestions);
      setBoardOverlay(prev => ({ ...prev, suggestedMoves: true }));
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }
  }, [gameStateManager, gameStarted, ai]);

  const handleSuggestionClick = useCallback((suggestion: SuggestedMove) => {
    if (!gameStateManager || !gameStarted) return;
    
    // Execute move and clear suggestions
    setSuggestedMoves([]);
    setBoardOverlay(prev => ({ ...prev, suggestedMoves: false }));
    gameStateManager.makeMove(suggestion.from, suggestion.to);
  }, [gameStateManager, gameStarted]);

  // Board overlay data provider for visual enhancements
  const getOverlayData = useMemo(() => {
    if (!gameStateManager || !gameStarted) return null;
    
    const overlayData: any = {};
    
    if (boardOverlay.suggestedMoves && suggestedMoves.length > 0) {
      overlayData.suggestedMoves = suggestedMoves;
    }
    
    return overlayData;
  }, [gameStateManager, gameStarted, boardOverlay, suggestedMoves]);

  /**
   * Chess Notation Generator
   * Converts move objects to standard algebraic notation
   * Handles castling, captures, promotions, and disambiguation
   */
  const getMoveNotation = (move: Move, _index: number): string => {
    // Use renderer's notation if available
    if (move.notation) return move.notation;
    
    // Generate proper algebraic notation when move info is incomplete
    const fromSquare = ChessRenderer.positionToNotation(move.from);
    const toSquare = ChessRenderer.positionToNotation(move.to);
    
    const piece = move.piece;
    if (!piece) return `${fromSquare}-${toSquare}`;
    
    let notation = '';
    
    // Add piece prefix (K, Q, R, B, N) - pawns have no prefix
    if (piece.type !== PieceType.PAWN) {
      switch (piece.type) {
        case PieceType.KING: notation += 'K'; break;
        case PieceType.QUEEN: notation += 'Q'; break;
        case PieceType.ROOK: notation += 'R'; break;
        case PieceType.BISHOP: notation += 'B'; break;
        case PieceType.KNIGHT: notation += 'N'; break;
      }
    }
    
    // Capture notation
    if (move.capturedPiece) {
      if (piece.type === PieceType.PAWN) {
        notation += fromSquare[0]; // Add file notation for pawn captures (e.g., "exd4")
      }
      notation += 'x';
    }
    
    notation += toSquare;
    
    // Special move notations
    if (move.promotedTo) {
      switch (move.promotedTo) {
        case PieceType.QUEEN: notation += '=Q'; break;
        case PieceType.ROOK: notation += '=R'; break;
        case PieceType.BISHOP: notation += '=B'; break;
        case PieceType.KNIGHT: notation += '=N'; break;
      }
    }
    
    if (move.isCastling) {
      notation = move.to.x > move.from.x ? 'O-O' : 'O-O-O';
    }
    
    return notation || `${fromSquare}-${toSquare}`;
  };

  /**
   * Clipboard utility for exporting moves in PGN format
   * Copies the complete move history to the system clipboard
   */
  const copyMovesToClipboard = useCallback(() => {
    const moveText = moves.map((move: Move, _index: number) => {
      const moveNumber = Math.floor(_index / 2) + 1;
      const isWhite = _index % 2 === 0;
      const notation = getMoveNotation(move, _index);
      
      if (isWhite) {
        return `${moveNumber}. ${notation}`;
      } else {
        return ` ${notation}`;
      }
    }).join('');
    
    navigator.clipboard.writeText(moveText.trim()).then(() => {
      console.log('Moves copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy moves:', err);
    });
  }, [moves, getMoveNotation]);

  /**
   * Simple AI Engine
   * Random move selection from legal moves
   * TODO: Replace with proper minimax + alpha-beta pruning
   */
  const makeAIMove = useCallback(() => {
    if (!gameStateManager || !gameStarted || playerSide === null) return;
    
    const gameState = gameStateManager.getCurrentState();
    if (gameState.isGameOver || gameState.currentPlayer === playerSide) return;
    
    console.log('AI turn initiated...');
    
    // Brute force legal move generation
    const allMoves: { from: Position; to: Position }[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece && piece.color === gameState.currentPlayer) {
          for (let toY = 0; toY < 8; toY++) {
            for (let toX = 0; toX < 8; toX++) {
              const from = { x, y };
              const to = { x: toX, y: toY };
              if (gameStateManager.isValidMove(from, to)) {
                allMoves.push({ from, to });
              }
            }
          }
        }
      }
    }
    
    // Execute random move as fallback when AI is unavailable
    if (allMoves.length > 0) {
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      console.log('AI executing move:', randomMove);
      gameStateManager.makeMove(randomMove.from, randomMove.to);
    }
  }, [gameStateManager, playerSide, gameStarted]);

  /**
   * Game State Event Handler
   * Coordinates UI updates, AI triggers, and clock management
   * Central event dispatcher for all game state changes
   */
  useEffect(() => {
    if (!gameStateManager || !gameStarted) return undefined; // Don't trigger AI if game not started
    
    const handleStateChange = (event: any) => {
      const gameState = gameStateManager.getCurrentState();
      
      console.log('State change event:', event.type, 'Current player:', gameState.currentPlayer);
      
      // Clear suggestions when state changes
      setSuggestedMoves([]);
      setBoardOverlay(prev => ({ ...prev, suggestedMoves: false }));
      
      // Update clock to match actual game state
      setGameClock(prev => ({
        ...prev,
        activePlayer: gameState.currentPlayer
      }));
      
      // Check for game end
      if (event.type === 'gameEnd' && event.result) {
        setGameResult(event.result);
        setGameClock(prev => ({ ...prev, isRunning: false })); // Stop clock on game end
        return;
      }
      
      // Check if it's AI's turn - simplified conditions
      if (!gameState.isGameOver && 
          gameStarted && 
          playerSide !== null && 
          gameState.currentPlayer !== playerSide) {
        console.log(`AI turn detected: current player is ${gameState.currentPlayer}, player side is ${playerSide}`);
        // Auto-trigger AI move after a short delay
        setTimeout(makeAIMove, 500);
      } else {
        console.log('AI move NOT triggered - conditions not met:', {
          isGameOver: gameState.isGameOver,
          gameStarted,
          playerSide,
          currentPlayer: gameState.currentPlayer
        });
      }
    };

    // Listen for state changes
    gameStateManager.addEventListener(handleStateChange);

    return () => {
      gameStateManager.removeEventListener(handleStateChange);
    };
  }, [gameStateManager, makeAIMove, playerSide, gameStarted]); // Removed gameClock.isRunning dependency

  // Sync clock with actual game state when game starts
  useEffect(() => {
    if (gameStateManager && gameStarted) {
      const gameState = gameStateManager.getCurrentState();
      console.log('Syncing clock with game state. Current player:', gameState.currentPlayer);
      setGameClock(prev => ({
        ...prev,
        activePlayer: gameState.currentPlayer
      }));
    }
  }, [gameStateManager, gameStarted]);

  // Clock countdown effect - only run when game is started and running
  useEffect(() => {
    if (gameResult || !gameStarted || !gameClock.isRunning) return undefined; // Don't run clock if game not started or paused
    
    const interval = setInterval(() => {
      setGameClock(prev => {
        if (prev.activePlayer === PieceColor.WHITE && prev.white > 0) {
          return { ...prev, white: prev.white - 1 };
        } else if (prev.activePlayer === PieceColor.BLACK && prev.black > 0) {
          return { ...prev, black: prev.black - 1 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameClock.activePlayer, gameClock.isRunning, gameResult, gameStarted]);

  // Handle AI moves during the game
  useEffect(() => {
    if (!gameStateManager || !gameStarted || !ai || !playerSide || gameResult || aiIsThinking) return undefined;

    const gameState = gameStateManager.getCurrentState();
    const isAITurn = gameState.currentPlayer !== playerSide;
    
    if (isAITurn) {
      console.log('AI turn detected, making move...');
      setAiIsThinking(true);
      
      const makeAIMove = async () => {
        try {
          const aiMove = await ai.findBestMove(gameState);
          if (aiMove) {
            console.log('AI making move:', aiMove);
            // Small delay to make AI moves visible
            setTimeout(() => {
              if (gameStateManager && gameStarted && !gameResult) {
                gameStateManager.makeMove(aiMove.from, aiMove.to);
                setAiIsThinking(false);
              }
            }, 500);
          } else {
            setAiIsThinking(false);
          }
        } catch (error) {
          console.error('AI move generation failed:', error);
          setAiIsThinking(false);
        }
      };

      makeAIMove();
    }
  }, [gameStateManager?.getMoveHistory().length, gameStarted, ai, playerSide, gameResult, aiIsThinking]);

  /**
   * Starts a new chess game with the selected player side
   * Initializes game state and starts the game clock
   * The AI will automatically make its move if it plays first
   */
  const startGame = useCallback(() => {
    if (!gameStateManager) return;
    
    console.log(`Starting game - player selected ${selectedSide} side`);
    setPlayerSide(selectedSide);
    setGameStarted(true);
    setGameClock(prev => ({ ...prev, isRunning: true }));
    
    console.log('Game started - AI will be handled by useEffect');
  }, [gameStateManager, selectedSide, ai]);

  /**
   * Handles player move execution with validation
   * Processes the move through the game state manager
   * @param from - Starting position of the piece
   * @param to - Target position for the piece
   */
  const handleMove = useCallback((from: Position, to: Position) => {
    if (!gameStateManager || !gameStarted) return;
    
    console.log('Player move:', { from, to });
    gameStateManager.makeMove(from, to);
  }, [gameStateManager, gameStarted]);
  
  /**
   * Handles game termination and cleanup
   * Updates game result state and stops the game clock
   * @param result - The final game result (win/loss/draw)
   */
  const handleGameEnd = (result: GameResult) => {
    console.log('Game ended:', result);
    setGameResult(result);
    setGameClock(prev => ({ ...prev, isRunning: false }));
  };

  /**
   * Resets the entire game to initial state
   * Clears all React state, resets game manager, and prepares for new game
   * Uses a specific order to prevent AI from triggering during reset
   */
  const resetGame = useCallback(() => {
    if (!gameStateManager) return;
    
    console.log('Resetting game...');
    
    // Reset React states FIRST to prevent AI from triggering
    setPlayerSide(null);
    setGameStarted(false);
    setGameResult(null);
    setSelectedSide(PieceColor.WHITE); // Reset side selection to default
    setGameKey(prev => prev + 1); // Force re-render of board to clear highlights
    setSuggestedMoves([]); // Clear any suggestions
    setBoardOverlay({ // Reset all overlays
      suggestedMoves: false
    });
    setAiIsThinking(false); // Reset AI thinking state
    setGameClock({
      white: 300,
      black: 300,
      activePlayer: PieceColor.WHITE,
      isRunning: false
    });
    
    // Then reset the game state manager (this will emit events)
    gameStateManager.resetGame();
    
    console.log('Game reset - ready for side selection and new game');
  }, [gameStateManager]);

  if (!gameStateManager) {
    return (
      <AppContainer>
        <GamePanel>
          <GameTitle>Chessy</GameTitle>
          <div style={{ color: 'white', textAlign: 'center' }}>
            Failed to initialize game. Please refresh the page.
          </div>
        </GamePanel>
      </AppContainer>
    );
  }

  const players = gameStateManager.getPlayers();
  console.log('Rendering with players:', players);
  console.log('Current game state:', gameStateManager.getCurrentState());

  return (
    <AppContainer>
      <GamePanel>
        <GameTitle>Chessy</GameTitle>
        <CopyrightText>© by mangobanaani 2025. Licensed under GNU GPL v3.0</CopyrightText>

        {!gameStarted && (
          <GameSetupSection>
            <SideSelection>
              <SideLabel>Choose your side:</SideLabel>
              <RadioOption>
                <input
                  type="radio"
                  name="side"
                  value={PieceColor.WHITE}
                  checked={selectedSide === PieceColor.WHITE}
                  onChange={(_e) => setSelectedSide(PieceColor.WHITE)}
                />
                Play as White
              </RadioOption>
              <RadioOption>
                <input
                  type="radio"
                  name="side"
                  value={PieceColor.BLACK}
                  checked={selectedSide === PieceColor.BLACK}
                  onChange={(_e) => setSelectedSide(PieceColor.BLACK)}
                />
                Play as Black
              </RadioOption>
            </SideSelection>
            
            <AIConfigSection>
              <DropdownContainer>
                <DropdownLabel>AI Difficulty:</DropdownLabel>
                <Dropdown 
                  value={aiDifficulty} 
                  onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
                >
                  <option value={AIDifficulty.BEGINNER}>Beginner (~1200 ELO)</option>
                  <option value={AIDifficulty.INTERMEDIATE}>Intermediate (~1500 ELO)</option>
                  <option value={AIDifficulty.ADVANCED}>Advanced (~1800 ELO)</option>
                  <option value={AIDifficulty.EXPERT}>Expert (~2000 ELO)</option>
                  <option value={AIDifficulty.MASTER}>Master (~2200+ ELO)</option>
                </Dropdown>
              </DropdownContainer>
              
              <DropdownContainer>
                <DropdownLabel>AI Personality:</DropdownLabel>
                <Dropdown 
                  value={aiPersonalityKey} 
                  onChange={(e) => setAiPersonalityKey(e.target.value)}
                >
                  <option value="aggressive">Aggressive</option>
                  <option value="positional">Positional</option>
                  <option value="tactical">Tactical</option>
                  <option value="defensive">Defensive</option>
                  <option value="balanced">Balanced</option>
                </Dropdown>
              </DropdownContainer>
            </AIConfigSection>
            
            <StartGameButton onClick={startGame}>
              Start Game
            </StartGameButton>
          </GameSetupSection>
        )}

        <GameContent>
          <BoardSection>
            <ChessBoardUI
              key={gameKey} // Force re-render on game reset to clear highlights
              gameStateManager={gameStateManager}
              playerColor={playerSide || PieceColor.WHITE} // Default to WHITE until player makes first move
              allowBothSidesInitially={false} // Never allow both sides - only allow moves after game starts
              onGameEnd={handleGameEnd}
              onMove={gameStarted ? handleMove : () => {}} // Only allow moves if game has started
              overlayData={getOverlayData}
            />

            {gameResult && (
              <div style={{ color: 'white', textAlign: 'center' }}>
                {gameResult.reason}
              </div>
            )}
          </BoardSection>

          <RightPanel>
            {!gameStarted && (
              <GameStatus>
                Choose your side and click "Start Game" to begin!
              </GameStatus>
            )}
            
            {gameStarted && playerSide && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SuggestMoveButton 
                  onClick={handleSuggestMoves}
                  disabled={!gameStarted || gameStateManager?.getCurrentState().currentPlayer !== playerSide || aiIsThinking}
                >
                  {aiIsThinking ? 'AI Thinking...' : 'Suggest Move'}
                </SuggestMoveButton>
                
                {suggestedMoves.length > 0 && (
                  <SuggestionsPanel>
                    <div style={{ 
                      color: 'rgba(255, 255, 255, 0.9)', 
                      fontWeight: 600, 
                      marginBottom: '15px',
                      textAlign: 'center'
                    }}>
                      Suggested Moves
                    </div>
                    {suggestedMoves.map((suggestion, index) => (
                      <SuggestionItem 
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SuggestionRank>#{suggestion.rank}</SuggestionRank>
                          <SuggestionMove>{suggestion.notation}</SuggestionMove>
                        </div>
                        <SuggestionScore>+{suggestion.score}</SuggestionScore>
                      </SuggestionItem>
                    ))}
                    <div style={{ 
                      textAlign: 'center', 
                      marginTop: '10px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.85rem'
                    }}>
                      Click a move to play it, or use the board circles
                    </div>
                  </SuggestionsPanel>
                )}
              </div>
            )}

            <OverlayControlsSection>
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontWeight: 600, 
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                Move Suggestions
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                {suggestedMoves.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      Green circles show starting positions
                    </div>
                    <div>
                      Purple circles show target positions
                    </div>
                  </>
                ) : gameStarted ? (
                  'Click "Suggest Move" to see recommendations on the board'
                ) : (
                  'Start a game to use move suggestions'
                )}
              </div>
            </OverlayControlsSection>
            
            <GameClockSection>
              <ClockDisplay>
                <PlayerClock 
                  isActive={gameStarted && gameClock.activePlayer === PieceColor.WHITE} 
                  isWhite={true}
                >
                  <PlayerName isActive={gameStarted && gameClock.activePlayer === PieceColor.WHITE}>
                    ⚪ {playerSide === PieceColor.WHITE ? 'You' : playerSide === null ? '?' : 'AI'}
                  </PlayerName>
                  <TimeDisplay isLowTime={gameClock.white < 60}>
                    {formatTime(gameClock.white)}
                  </TimeDisplay>
                </PlayerClock>
                
                <PlayerClock 
                  isActive={gameStarted && gameClock.activePlayer === PieceColor.BLACK} 
                  isWhite={false}
                >
                  <PlayerName isActive={gameStarted && gameClock.activePlayer === PieceColor.BLACK}>
                    ⚫ {playerSide === PieceColor.BLACK ? 'You' : playerSide === null ? '?' : 'AI'}
                  </PlayerName>
                  <TimeDisplay isLowTime={gameClock.black < 60}>
                    {formatTime(gameClock.black)}
                  </TimeDisplay>
                </PlayerClock>
              </ClockDisplay>
            </GameClockSection>

            <MoveHistorySection>
            <MoveHistoryHeader>
              Move History
              <CopyButton onClick={copyMovesToClipboard}>
                Copy
              </CopyButton>
            </MoveHistoryHeader>
            <MoveHistoryList>
              {moves.length === 0 ? (
                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                  No moves yet...
                  <br />
                  <small>Make your first move!</small>
                </div>
              ) : (
                // Group moves in pairs for newspaper-style display
                Array.from({ length: Math.ceil(moves.length / 2) }, (_, pairIndex) => {
                  const whiteMove = moves[pairIndex * 2];
                  const blackMove = moves[pairIndex * 2 + 1];
                  const moveNumber = pairIndex + 1;
                  
                  return (
                    <MovePair key={pairIndex}>
                      <MoveNumber>{moveNumber}.</MoveNumber>
                      <WhiteMove>
                        {whiteMove ? getMoveNotation(whiteMove, pairIndex * 2) : ''}
                      </WhiteMove>
                      <BlackMove>
                        {blackMove ? getMoveNotation(blackMove, pairIndex * 2 + 1) : '...'}
                      </BlackMove>
                    </MovePair>
                  );
                })
              )}
            </MoveHistoryList>
            </MoveHistorySection>
            
            <NewGameButton onClick={resetGame}>
              New Game
            </NewGameButton>
          </RightPanel>
        </GameContent>
      </GamePanel>
    </AppContainer>
  );
};
