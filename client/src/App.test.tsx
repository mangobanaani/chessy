import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Basic App rendering tests
describe('App Component', () => {
  test('renders Chessy title', () => {
    render(<App />);
    const chessElement = screen.getByText(/Chessy/i);
    expect(chessElement).toBeInTheDocument();
  });

  test('renders copyright notice', () => {
    render(<App />);
    const copyrightElement = screen.getByText(/© by mangobanaani 2025/i);
    expect(copyrightElement).toBeInTheDocument();
  });

  test('renders GPL license notice', () => {
    render(<App />);
    const licenseElement = screen.getByText(/Licensed under GNU GPL v3.0/i);
    expect(licenseElement).toBeInTheDocument();
  });

  test('renders game setup section initially', () => {
    render(<App />);
    const chooseText = screen.getByText(/Choose your side/i);
    expect(chooseText).toBeInTheDocument();
  });

  test('renders side selection options', () => {
    render(<App />);
    const whiteOption = screen.getByLabelText(/Play as White/i);
    const blackOption = screen.getByLabelText(/Play as Black/i);
    expect(whiteOption).toBeInTheDocument();
    expect(blackOption).toBeInTheDocument();
  });

  test('renders AI difficulty dropdown', () => {
    render(<App />);
    const difficultyLabel = screen.getByText(/AI Difficulty/i);
    expect(difficultyLabel).toBeInTheDocument();
  });

  test('renders start game button', () => {
    render(<App />);
    const startButton = screen.getByRole('button', { name: /Start Game/i });
    expect(startButton).toBeInTheDocument();
  });
});
