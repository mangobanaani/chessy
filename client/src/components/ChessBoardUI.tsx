import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { GameStateManager } from '../managers/GameStateManager';
import { ChessGameEngine } from '../engine/ChessGameEngine';
import { ChessRenderer } from '../rendering/ChessRenderer';
import { 
  Position, 
  ChessPiece, 
  PieceColor, 
  GameStateChangeEvent,
  GameResult 
} from '../types/gameState';

/**
 * Pure Chess Board UI Component
 * Handles only rendering and user interaction - no game logic
 * Follows separation of concerns: delegates all logic to appropriate layers
 */

// Styled Components - Chess Board Design System
const BoardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: 480px;
  height: 480px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
`;

/**
 * Chess Square Component
 * Handles multiple visual states: selection, valid moves, suggestions, check status
 * Color-coded overlay system for move suggestions (green=from, purple=to)
 */
const Square = styled.div<{
  isLight: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  isLastMove: boolean;
  isInCheck: boolean;
  isSuggestedFromMove?: boolean; // Green circle - move origin
  isSuggestedToMove?: boolean;   // Purple circle - move destination
  suggestionRank?: number;       // Move ranking (1-3)
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  
  /* Dynamic square coloring based on state */
  background: ${props => {
    if (props.isInCheck) return 'rgba(255, 0, 0, 0.4)';
    if (props.isSelected) return 'rgba(255, 255, 0, 0.4)';
    if (props.isLastMove) return 'rgba(255, 165, 0, 0.3)';
    
    return props.isLight 
      ? 'rgba(240, 217, 181, 0.8)' 
      : 'rgba(181, 136, 99, 0.8)';
  }};
  
  &:hover {
    background: ${props => {
      if (props.isInCheck) return 'rgba(255, 0, 0, 0.5)';
      if (props.isSelected) return 'rgba(255, 255, 0, 0.5)';
      return props.isLight 
        ? 'rgba(240, 217, 181, 0.9)' 
        : 'rgba(181, 136, 99, 0.9)';
    }};
  }
  
  /* Valid move indicator - green dot */
  ${props => props.isValidMove && `
    &::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(0, 255, 0, 0.6);
      pointer-events: none;
    }
  `}
  
  /* Suggestion "from" indicator - green numbered circle */
  ${props => props.isSuggestedFromMove && `
    &::before {
      content: '${props.suggestionRank || '?'}';
      position: absolute;
      top: 4px;
      left: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
  `}
  
  /* Suggestion "to" indicator - purple numbered circle */
  ${props => props.isSuggestedToMove && `
    &::after {
      content: '${props.suggestionRank || '?'}';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(240, 147, 251, 0.5);
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
  `}
`;
// Chess piece rendering with animation support
const PieceElement = styled.div<{ isAnimating: boolean }>`
  font-size: 40px;
  transition: ${props => props.isAnimating ? 'all 0.3s ease' : 'none'};
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
  
  &:hover {
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

// Game status and controls UI components
const StatusDisplay = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  font-size: 1.2rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const GameControls = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
`;

const Button = styled.button`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: none;
    }
  }
`;

// Component props interface
interface ChessBoardUIProps {
  gameStateManager: GameStateManager;
  playerColor?: PieceColor;
  allowBothSidesInitially?: boolean; // Dev mode: allow moves for both sides
  onGameEnd?: (result: GameResult) => void;
  onMove?: (from: Position, to: Position) => void;
  overlayData?: any; // Overlay system for suggestions and heatmaps
}

/**
 * Pure UI Chess Board Component
 * Architecture: Stateful UI component that delegates all game logic
 * Responsibilities: Rendering, user interaction, visual feedback
 * Dependencies: GameStateManager (state), ChessRenderer (utilities)
 */
export const ChessBoardUI: React.FC<ChessBoardUIProps> = ({
  gameStateManager,
  playerColor = PieceColor.WHITE,
  allowBothSidesInitially = false,
  onGameEnd,
  onMove,
  overlayData,
}) => {
  console.log('ChessBoardUI rendering with gameStateManager:', gameStateManager);
  
  // UI state management - mirrors game state for rendering
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(() => {
    const initialState = gameStateManager.getCurrentState();
    console.log('Initial board from state:', initialState.board);
    return initialState.board;
  });
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>(PieceColor.WHITE);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [animatingPieces, setAnimatingPieces] = useState<Set<string>>(new Set());

  /**
   * Game State Synchronization Handler
   * Syncs UI state with GameStateManager events
   * Handles move animations and game end conditions
   */
  const handleGameStateChange = useCallback((event: GameStateChangeEvent) => {
    const { gameState, move, result } = event;
    
    // Sync UI state with game state
    setBoard(gameState.board);
    setCurrentPlayer(gameState.currentPlayer);
    setIsGameOver(gameState.isGameOver);
    
    // Generate status message using renderer
    const statusMessage = ChessRenderer.getStatusMessage(
      gameState.currentPlayer,
      gameState.isCheck,
      gameState.isCheckmate,
      gameState.isStalemate,
      gameState.isGameOver
    );
    setGameStatus(statusMessage);
    
    // Handle move animation system
    if (move) {
      setLastMove({ from: move.from, to: move.to });
      
      // Trigger piece animation
      const pieceId = move.piece.id;
      setAnimatingPieces(prev => {
        const newSet = new Set(prev);
        newSet.add(pieceId);
        return newSet;
      });
      
      // Clear animation after duration
      setTimeout(() => {
        setAnimatingPieces(prev => {
          const newSet = new Set(prev);
          newSet.delete(pieceId);
          return newSet;
        });
      }, ChessRenderer.getAnimationDuration(move.from, move.to));
    }
    
    // Propagate game end events
    if (result && onGameEnd) {
      onGameEnd(result);
    }
    
    // Reset selection state after moves
    setSelectedPosition(null);
    setValidMoves([]);
  }, [onGameEnd]);

  // Initialize game state listener
  useEffect(() => {
    gameStateManager.addEventListener(handleGameStateChange);
    
    // Initialize UI with current state
    const currentState = gameStateManager.getCurrentState();
    setBoard(currentState.board);
    setCurrentPlayer(currentState.currentPlayer);
    setIsGameOver(currentState.isGameOver);
    
    const statusMessage = ChessRenderer.getStatusMessage(
      currentState.currentPlayer,
      currentState.isCheck,
      currentState.isCheckmate,
      currentState.isStalemate,
      currentState.isGameOver
    );
    setGameStatus(statusMessage);
    
    return () => {
      gameStateManager.removeEventListener(handleGameStateChange);
    };
  }, [gameStateManager, handleGameStateChange]);

  // Reset visual state when game is reset (detect by empty moves array)
  useEffect(() => {
    const currentState = gameStateManager.getCurrentState();
    if (currentState.moves.length === 0) {
      // Game has been reset - clear all visual state
      setSelectedPosition(null);
      setValidMoves([]);
      setLastMove(null);
      setAnimatingPieces(new Set());
    }
  }, [gameStateManager]);

  /**
   * Square Click Handler
   * Manages piece selection, move validation, and move execution
   * Handles special cases: castling, piece selection fallback
   */
  const handleSquareClick = useCallback((position: Position) => {
    if (isGameOver) return;
    
    const piece = board[position.y][position.x];
    
    // Piece selection logic
    const currentGameState = gameStateManager.getCurrentState();
    const isFirstMove = currentGameState.moves.length === 0;
    const canSelectPiece = piece && piece.color === currentPlayer && 
      (allowBothSidesInitially && isFirstMove ? true : piece.color === playerColor);
    
    if (canSelectPiece) {
      setSelectedPosition(position);
      let moves = gameStateManager.getValidMoves(position);
      
      // Special castling handling for rook selection
      if (piece.type === 'rook' && !piece.hasMoved) {
        const kingPosition = ChessGameEngine.findKing(gameStateManager.getCurrentState(), piece.color);
        if (kingPosition) {
          const isKingSideRook = position.x === 7;
          const kingTargetX = isKingSideRook ? 6 : 2;
          const kingTarget = { x: kingTargetX, y: kingPosition.y };
          
          // Add castling target if valid
          if (ChessGameEngine.isValidMove(gameStateManager.getCurrentState(), kingPosition, kingTarget)) {
            moves = [...moves, kingTarget];
          }
        }
      }
      
      setValidMoves(moves);
      return;
    }
    
    // Move execution logic
    if (selectedPosition) {
      const selectedPiece = board[selectedPosition.y][selectedPosition.x];
      let success = false;
      
      // Handle rook-initiated castling moves
      if (selectedPiece?.type === 'rook' && !selectedPiece.hasMoved) {
        const kingPosition = ChessGameEngine.findKing(gameStateManager.getCurrentState(), selectedPiece.color);
        if (kingPosition && position.x === kingPosition.x && position.y === kingPosition.y) {
          // Convert to king castling move
          const isKingSideRook = selectedPosition.x === 7;
          const kingTarget = { x: isKingSideRook ? 6 : 2, y: kingPosition.y };
          success = gameStateManager.makeMove(kingPosition, kingTarget);
        } else {
          success = gameStateManager.makeMove(selectedPosition, position);
        }
      } else {
        success = gameStateManager.makeMove(selectedPosition, position);
      }
      
      // Notify parent component of successful moves
      if (success && onMove) {
        onMove(selectedPosition, position);
      }
      
      // Handle invalid moves - fallback selection
      if (!success) {
        const canSelectFallbackPiece = piece && piece.color === currentPlayer && 
          (allowBothSidesInitially && currentGameState.moves.length === 0 ? true : piece.color === playerColor);
        
        if (canSelectFallbackPiece) {
          setSelectedPosition(position);
          const moves = gameStateManager.getValidMoves(position);
          setValidMoves(moves);
        } else {
          setSelectedPosition(null);
          setValidMoves([]);
        }
      } else {
        setSelectedPosition(null);
        setValidMoves([]);
      }
    }
  }, [
    board, 
    selectedPosition, 
    currentPlayer, 
    playerColor,
    allowBothSidesInitially,
    isGameOver, 
    gameStateManager, 
    onMove
  ]);

  /**
   * Square Renderer
   * Generates individual square with all visual states and overlays
   * Handles suggestion overlays (from/to positions) and piece rendering
   */
  const renderSquare = useCallback((position: Position) => {
    const piece = board[position.y][position.x];
    const isLight = ChessRenderer.isLightSquare(position);
    const isSelected = selectedPosition !== null && 
      selectedPosition.x === position.x && 
      selectedPosition.y === position.y;
    const isValidMove = validMoves.some(move => 
      move.x === position.x && move.y === position.y
    );
    const isLastMoveSquare = lastMove && (
      (lastMove.from.x === position.x && lastMove.from.y === position.y) ||
      (lastMove.to.x === position.x && lastMove.to.y === position.y)
    );
    const isInCheck = piece?.type === 'king' && 
      gameStateManager.isKingInCheck(piece.color);
    
    // Process overlay data for suggestion visualization
    let isSuggestedFromMove = false;
    let isSuggestedToMove = false;
    let suggestionRank = 0;
    
    if (overlayData) {
      if (overlayData.suggestedMoves) {
        // Check for "from" position (green circle)
        const fromSuggestion = overlayData.suggestedMoves.find((move: any) => 
          move.from.x === position.x && move.from.y === position.y
        );
        if (fromSuggestion) {
          isSuggestedFromMove = true;
          suggestionRank = fromSuggestion.rank;
        }
        
        // Check for "to" position (purple circle)
        const toSuggestion = overlayData.suggestedMoves.find((move: any) => 
          move.to.x === position.x && move.to.y === position.y
        );
        if (toSuggestion) {
          isSuggestedToMove = true;
          suggestionRank = toSuggestion.rank;
        }
      }
    }
    
    return (
      <Square
        key={`${position.x}-${position.y}`}
        isLight={isLight}
        isSelected={isSelected}
        isValidMove={isValidMove}
        isLastMove={isLastMoveSquare || false}
        isInCheck={isInCheck || false}
        isSuggestedFromMove={isSuggestedFromMove}
        isSuggestedToMove={isSuggestedToMove}
        suggestionRank={suggestionRank}
        onClick={() => handleSquareClick(position)}
      >
        {piece && (
          <PieceElement
            isAnimating={animatingPieces.has(piece.id)}
            title={ChessRenderer.getPieceName(piece)}
          >
            {ChessRenderer.getPieceSymbol(piece)}
          </PieceElement>
        )}
      </Square>
    );
  }, [
    board, 
    selectedPosition, 
    validMoves, 
    lastMove, 
    animatingPieces, 
    gameStateManager, 
    handleSquareClick,
    overlayData
  ]);

  // 8x8 board renderer - generates all squares in row-major order
  const renderBoard = () => {
    const squares: React.ReactElement[] = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const position = { x, y };
        squares.push(renderSquare(position));
      }
    }
    
    return squares;
  };

  return (
    <>
      <StatusDisplay>
        {gameStatus}
      </StatusDisplay>
      
      <BoardContainer>
        {renderBoard()}
      </BoardContainer>
      
      <GameControls>
        <Button 
          onClick={() => {
            setSelectedPosition(null);
            setValidMoves([]);
          }}
          disabled={!selectedPosition}
        >
          Clear Selection
        </Button>
      </GameControls>
    </>
  );
};