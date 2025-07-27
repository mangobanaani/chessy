import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useChessAI, AIDifficulty } from '../hooks/useChessAI';
import { ChessAIManager } from '../engine/ChessAIManager';
import { GameState, Move } from '../types/gameState';

// Styled components
const AIPanel = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const AIControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

const Button = styled.button<{ disabled?: boolean; variant?: 'primary' | 'secondary' }>`
  background: ${props => props.disabled ? 'rgba(255, 255, 255, 0.1)' : 
                props.variant === 'primary' ? 'rgba(74, 144, 226, 0.8)' : 'rgba(255, 255, 255, 0.15)'};
  color: ${props => props.disabled ? 'rgba(255, 255, 255, 0.5)' : 'white'};
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover:not(:disabled) {
    background: ${props => props.variant === 'primary' ? 'rgba(74, 144, 226, 1)' : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-1px);
  }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  
  option {
    background: rgba(30, 30, 30, 0.95);
    color: white;
  }
`;

const StatsDisplay = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 14px;
`;

const EvaluationBar = styled.div<{ evaluation: number }>`
  width: 100%;
  height: 8px;
  background: linear-gradient(
    to right,
    #ff4444 0%,
    #ff4444 ${props => Math.max(0, 50 + props.evaluation / 10)}%,
    #44ff44 ${props => Math.min(100, 50 + props.evaluation / 10)}%,
    #44ff44 100%
  );
  border-radius: 4px;
  margin: 8px 0;
`;

const SuggestionsList = styled.div`
  margin-top: 16px;
`;

const SuggestionItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 6px;
  border-left: 3px solid rgba(74, 144, 226, 0.6);
`;

interface ChessAIComponentProps {
  gameState: GameState;
  onMoveSelected: (move: Move) => void;
  isPlayerTurn: boolean;
}

/**
 * Chess AI integration component
 * Demonstrates complete AI functionality with user interface
 */
export const ChessAIComponent: React.FC<ChessAIComponentProps> = ({
  gameState,
  onMoveSelected,
  isPlayerTurn
}) => {
  const ai = useChessAI(AIDifficulty.INTERMEDIATE);
  const [suggestions, setSuggestions] = useState<Array<{move: Move, evaluation: number, description: string}>>([]);
  const [analysis, setAnalysis] = useState<{
    evaluation: number;
    description: string;
    threats: string[];
    opportunities: string[];
  } | null>(null);

  // Handle AI move
  const handleAIMove = useCallback(async () => {
    if (!isPlayerTurn) return;
    
    const move = await ai.findBestMove(gameState);
    if (move) {
      onMoveSelected(move);
    }
  }, [ai, gameState, isPlayerTurn, onMoveSelected]);

  // Get move suggestions
  const getSuggestions = useCallback(async () => {
    const suggestions = await ai.getSuggestedMoves(gameState, 3);
    setSuggestions(suggestions);
  }, [ai, gameState]);

  // Analyze position
  const analyzePosition = useCallback(async () => {
    const result = await ai.getPositionAnalysis(gameState);
    setAnalysis(result);
  }, [ai, gameState]);

  // Handle difficulty change
  const handleDifficultyChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const difficulty = event.target.value as AIDifficulty;
    ai.setDifficulty(difficulty);
  }, [ai]);

  // Handle personality change
  const handlePersonalityChange = useCallback((personality: string) => {
    const personalities = ChessAIManager.getPersonalityProfiles();
    if (personalities[personality]) {
      ai.setPersonality(personalities[personality]);
    }
  }, [ai]);

  // Current evaluation
  const currentEvaluation = ai.evaluatePosition(gameState);

  return (
    <AIPanel>
      <h3>Chess AI Assistant</h3>
      
      <AIControls>
        <div>
          <label>Difficulty: </label>
          <Select value={ai.state.difficulty} onChange={handleDifficultyChange}>
            <option value={AIDifficulty.BEGINNER}>Beginner</option>
            <option value={AIDifficulty.INTERMEDIATE}>Intermediate</option>
            <option value={AIDifficulty.ADVANCED}>Advanced</option>
            <option value={AIDifficulty.EXPERT}>Expert</option>
            <option value={AIDifficulty.MASTER}>Master</option>
          </Select>
        </div>

        <div>
          <label>Personality: </label>
          <Select onChange={(e) => handlePersonalityChange(e.target.value)}>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
            <option value="positional">Positional</option>
            <option value="tactical">Tactical</option>
            <option value="defensive">Defensive</option>
          </Select>
        </div>
      </AIControls>

      <div>
        <Button
          variant="primary"
          onClick={handleAIMove}
          disabled={!isPlayerTurn || ai.state.isThinking}
        >
          {ai.state.isThinking ? 'AI Thinking...' : 'Get AI Move'}
        </Button>

        <Button onClick={getSuggestions} disabled={ai.state.isThinking}>
          Get Suggestions
        </Button>

        <Button onClick={analyzePosition} disabled={ai.state.isThinking}>
          Analyze Position
        </Button>
      </div>

      {/* Position Evaluation */}
      <div>
        <h4>Position Evaluation</h4>
        <EvaluationBar evaluation={currentEvaluation} />
        <div style={{ textAlign: 'center', fontSize: '14px' }}>
          {currentEvaluation > 0 ? 'White' : 'Black'} +{Math.abs(currentEvaluation / 100).toFixed(1)}
        </div>
        {analysis && (
          <div style={{ marginTop: '8px', fontSize: '14px' }}>
            {analysis.description}
          </div>
        )}
      </div>

      {/* AI Statistics */}
      {ai.state.lastStats && (
        <StatsDisplay>
          <h4>Last Move Analysis</h4>
          <StatRow>
            <span>Time Used:</span>
            <span>{ai.state.lastStats.timeUsed}ms</span>
          </StatRow>
          <StatRow>
            <span>Search Depth:</span>
            <span>{ai.state.lastStats.depth}</span>
          </StatRow>
          <StatRow>
            <span>Nodes Searched:</span>
            <span>{ai.state.lastStats.nodesSearched.toLocaleString()}</span>
          </StatRow>
          {ai.state.lastStats.openingBookHits > 0 && (
            <StatRow>
              <span>Opening Book:</span>
              <span>Used</span>
            </StatRow>
          )}
        </StatsDisplay>
      )}

      {/* Move Suggestions */}
      {suggestions.length > 0 && (
        <SuggestionsList>
          <h4>Suggested Moves</h4>
          {suggestions.map((suggestion, index) => (
            <SuggestionItem key={index}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {suggestion.move.notation || 'Move'} ({suggestion.evaluation > 0 ? '+' : ''}{(suggestion.evaluation / 100).toFixed(2)})
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {suggestion.description}
              </div>
              <Button
                style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px' }}
                onClick={() => onMoveSelected(suggestion.move)}
              >
                Play This Move
              </Button>
            </SuggestionItem>
          ))}
        </SuggestionsList>
      )}

      {/* Threats and Opportunities */}
      {analysis && (analysis.threats.length > 0 || analysis.opportunities.length > 0) && (
        <div style={{ marginTop: '16px' }}>
          {analysis.threats.length > 0 && (
            <div>
              <h4 style={{ color: '#ff6b6b' }}>Threats</h4>
              {analysis.threats.map((threat, index) => (
                <div key={index} style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {threat}
                </div>
              ))}
            </div>
          )}

          {analysis.opportunities.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ color: '#51cf66' }}>Opportunities</h4>
              {analysis.opportunities.map((opportunity, index) => (
                <div key={index} style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {opportunity}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {ai.state.error && (
        <div style={{ 
          color: '#ff6b6b', 
          background: 'rgba(255, 107, 107, 0.1)',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '12px',
          fontSize: '14px'
        }}>
          Error: {ai.state.error}
        </div>
      )}

      {/* Game Status Suggestions */}
      <div style={{ marginTop: '16px', fontSize: '14px' }}>
        {ai.shouldResign(gameState) && (
          <div style={{ color: '#ff6b6b' }}>
            AI suggests: Consider resigning - position is very difficult
          </div>
        )}
        {ai.shouldOfferDraw(gameState) && (
          <div style={{ color: '#ffd43b' }}>
            AI suggests: This position looks drawish - consider offering a draw
          </div>
        )}
      </div>
    </AIPanel>
  );
};

export default ChessAIComponent;
