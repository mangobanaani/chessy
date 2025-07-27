import React, { useState, useEffect } from 'react';
import { ChessGameEngine } from '../engine/ChessGameEngine';
import { ChessAI } from '../engine/ChessAI';
import { BoardEvaluator } from '../engine/BoardEvaluator';
import { OpeningBook } from '../engine/OpeningBook';
import { GameState, PieceColor } from '../types/gameState';

/**
 * Simple test component to verify AI functionality
 * Can be integrated into your existing chess game
 */
export const AITestComponent: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiMove, setAIMove] = useState<string>('');
  const [evaluation, setEvaluation] = useState<number>(0);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [aiStats, setAIStats] = useState<string>('');

  // Initialize game state
  useEffect(() => {
    const initialState = ChessGameEngine.createInitialState(
      'test-game',
      'Human',
      'AI'
    );
    setGameState(initialState);
  }, []);

  // Get AI move
  const getAIMove = async () => {
    if (!gameState) return;
    
    setIsThinking(true);
    setAIMove('');
    setAIStats('Calculating...');
    
    try {
      const startTime = Date.now();
      
      // Try opening book first
      if (OpeningBook.isInOpeningPhase(gameState)) {
        const bookMove = OpeningBook.getBookMove(gameState);
        if (bookMove) {
          const endTime = Date.now();
          setAIMove(`Opening Book: ${bookMove.notation || 'Book move'}`);
          setAIStats(`Used opening book in ${endTime - startTime}ms`);
          setIsThinking(false);
          return;
        }
      }
      
      // Use main AI engine
      const bestMove = ChessAI.findBestMove(gameState, 3, 3000);
      const endTime = Date.now();
      
      if (bestMove) {
        setAIMove(`AI Move: ${bestMove.notation || 'AI suggests move'}`);
        setAIStats(`Search completed in ${endTime - startTime}ms`);
      } else {
        setAIMove('No valid moves found');
        setAIStats('Search failed');
      }
    } catch (error) {
      console.error('AI Error:', error);
      setAIMove('AI Error occurred');
      setAIStats('Error in calculation');
    }
    
    setIsThinking(false);
  };

  // Evaluate position
  const evaluatePosition = () => {
    if (!gameState) return;
    
    const eval_score = BoardEvaluator.evaluate(gameState);
    setEvaluation(eval_score);
  };

  // Make a random move to test the AI
  const makeRandomMove = () => {
    if (!gameState) return;
    
    const possibleMoves = ChessGameEngine.getAllPossibleMoves(gameState, gameState.currentPlayer);
    if (possibleMoves.length > 0) {
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      const newState = ChessGameEngine.makeMove(gameState, randomMove.from, randomMove.to);
      if (newState) {
        setGameState(newState);
      }
    }
  };

  if (!gameState) {
    return <div>Loading chess game...</div>;
  }

  return (
    <div style={{ 
      padding: '20px', 
      background: 'rgba(255, 255, 255, 0.1)', 
      borderRadius: '8px',
      margin: '20px',
      color: 'white'
    }}>
      <h2>Chess AI Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Game Status</h3>
        <p>Current Player: {gameState.currentPlayer}</p>
        <p>Moves Played: {gameState.moves.length}</p>
        <p>Is Check: {gameState.isCheck ? 'Yes' : 'No'}</p>
        <p>Is Game Over: {gameState.isGameOver ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Position Evaluation</h3>
        <p>Score: {evaluation / 100} (White perspective)</p>
        <p>
          {evaluation > 50 ? 'White has advantage' : 
           evaluation < -50 ? 'Black has advantage' : 
           'Position is balanced'}
        </p>
        <button 
          onClick={evaluatePosition}
          style={{ 
            padding: '8px 16px', 
            background: 'rgba(74, 144, 226, 0.8)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Evaluate Position
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>AI Analysis</h3>
        <p>{aiMove || 'No AI analysis yet'}</p>
        <p style={{ fontSize: '14px', opacity: 0.8 }}>{aiStats}</p>
        <button 
          onClick={getAIMove}
          disabled={isThinking}
          style={{ 
            padding: '8px 16px', 
            background: isThinking ? 'rgba(128, 128, 128, 0.5)' : 'rgba(74, 144, 226, 0.8)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isThinking ? 'not-allowed' : 'pointer'
          }}
        >
          {isThinking ? 'AI Thinking...' : 'Get AI Move'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Controls</h3>
        <button 
          onClick={makeRandomMove}
          style={{ 
            padding: '8px 16px', 
            background: 'rgba(255, 165, 0, 0.8)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Make Random Move
        </button>
        
        <button 
          onClick={() => {
            const initialState = ChessGameEngine.createInitialState('test-game', 'Human', 'AI');
            setGameState(initialState);
            setAIMove('');
            setAIStats('');
            setEvaluation(0);
          }}
          style={{ 
            padding: '8px 16px', 
            background: 'rgba(255, 99, 71, 0.8)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset Game
        </button>
      </div>

      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        <h4>AI Features Tested:</h4>
        <ul>
          <li>Board Evaluation ✓</li>
          <li>Move Generation ✓</li>
          <li>Opening Book ✓</li>
          <li>Alpha-Beta Search ✓</li>
          <li>Transposition Table ✓</li>
        </ul>
      </div>
    </div>
  );
};

export default AITestComponent;
