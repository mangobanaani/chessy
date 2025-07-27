import { GameState } from '../types/gameState';

/**
 * Zobrist hashing for efficient position caching
 * Used in transposition tables for chess AI optimization
 */
class ZobristHash {
  private static readonly RANDOM_NUMBERS: number[][] = ZobristHash.initializeRandomNumbers();
  private static readonly SIDE_TO_MOVE_HASH = Math.floor(Math.random() * 0xFFFFFFFF);
  private static readonly CASTLING_HASH: number[] = ZobristHash.initializeCastlingHash();
  private static readonly EN_PASSANT_HASH: number[] = ZobristHash.initializeEnPassantHash();
  
  private static initializeRandomNumbers(): number[][] {
    const randomNumbers: number[][] = [];
    // Initialize random numbers for each square and piece type
    for (let square = 0; square < 64; square++) {
      randomNumbers[square] = [];
      for (let piece = 0; piece < 12; piece++) { // 6 piece types * 2 colors
        randomNumbers[square][piece] = Math.floor(Math.random() * 0xFFFFFFFF);
      }
    }
    return randomNumbers;
  }
  
  private static initializeCastlingHash(): number[] {
    const castlingHash: number[] = [];
    // Initialize castling rights hashes
    for (let i = 0; i < 4; i++) {
      castlingHash[i] = Math.floor(Math.random() * 0xFFFFFFFF);
    }
    return castlingHash;
  }
  
  private static initializeEnPassantHash(): number[] {
    const enPassantHash: number[] = [];
    // Initialize en passant file hashes
    for (let i = 0; i < 8; i++) {
      enPassantHash[i] = Math.floor(Math.random() * 0xFFFFFFFF);
    }
    return enPassantHash;
  }
  
  static hash(gameState: GameState): string {
    let hash = 0;
    
    // Hash board position
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = gameState.board[y][x];
        if (piece) {
          const pieceIndex = ZobristHash.getPieceIndex(piece.type, piece.color);
          const squareIndex = y * 8 + x;
          hash ^= ZobristHash.RANDOM_NUMBERS[squareIndex][pieceIndex];
        }
      }
    }
    
    // Hash side to move
    if (gameState.currentPlayer === 'black') {
      hash ^= ZobristHash.SIDE_TO_MOVE_HASH;
    }
    
    // Hash castling rights
    if (gameState.castlingRights.whiteKingSide) hash ^= ZobristHash.CASTLING_HASH[0];
    if (gameState.castlingRights.whiteQueenSide) hash ^= ZobristHash.CASTLING_HASH[1];
    if (gameState.castlingRights.blackKingSide) hash ^= ZobristHash.CASTLING_HASH[2];
    if (gameState.castlingRights.blackQueenSide) hash ^= ZobristHash.CASTLING_HASH[3];
    
    // Hash en passant target
    if (gameState.enPassantTarget) {
      hash ^= ZobristHash.EN_PASSANT_HASH[gameState.enPassantTarget.x];
    }
    
    return hash.toString(36);
  }
  
  private static getPieceIndex(type: string, color: string): number {
    const pieceTypeIndex = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'].indexOf(type);
    const colorOffset = color === 'white' ? 0 : 6;
    return pieceTypeIndex + colorOffset;
  }
}

/**
 * Entry in the transposition table
 */
interface TranspositionEntry {
  depth: number;
  score: number;
  bestMove?: string;
  nodeType: 'exact' | 'lowerbound' | 'upperbound';
  timestamp: number;
}

/**
 * Transposition table for caching evaluated positions
 * Dramatically improves search performance by avoiding redundant calculations
 */
export class TranspositionTable {
  private table = new Map<string, TranspositionEntry>();
  private readonly maxSize: number;
  private readonly cleanupThreshold: number;
  
  constructor(maxSize: number = 1000000) { // ~1M entries
    this.maxSize = maxSize;
    this.cleanupThreshold = Math.floor(maxSize * 0.8);
  }
  
  /**
   * Store position evaluation in the table
   */
  set(
    gameState: GameState, 
    depth: number, 
    score: number, 
    bestMove?: string,
    nodeType: 'exact' | 'lowerbound' | 'upperbound' = 'exact'
  ): void {
    const key = ZobristHash.hash(gameState);
    
    // Check if we need to clean up the table
    if (this.table.size > this.cleanupThreshold) {
      this.cleanup();
    }
    
    const entry: TranspositionEntry = {
      depth,
      score,
      bestMove,
      nodeType,
      timestamp: Date.now()
    };
    
    // Only replace if we have a deeper search or same depth with better info
    const existing = this.table.get(key);
    if (!existing || depth >= existing.depth) {
      this.table.set(key, entry);
    }
  }
  
  /**
   * Retrieve position evaluation from the table
   */
  get(gameState: GameState, depth: number): TranspositionEntry | null {
    const key = ZobristHash.hash(gameState);
    const entry = this.table.get(key);
    
    if (!entry || entry.depth < depth) {
      return null;
    }
    
    return entry;
  }
  
  /**
   * Check if position exists in table
   */
  has(gameState: GameState): boolean {
    const key = ZobristHash.hash(gameState);
    return this.table.has(key);
  }
  
  /**
   * Get table statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.table.size,
      maxSize: this.maxSize
    };
  }
  
  /**
   * Clear the entire table
   */
  clear(): void {
    this.table.clear();
  }
  
  /**
   * Clean up old entries to maintain performance
   */
  private cleanup(): void {
    const entries: [string, TranspositionEntry][] = [];
    this.table.forEach((value, key) => {
      entries.push([key, value]);
    });
    
    // Sort by timestamp (oldest first) and depth (shallowest first)
    entries.sort((a, b) => {
      const ageA = Date.now() - a[1].timestamp;
      const ageB = Date.now() - b[1].timestamp;
      
      if (ageA !== ageB) {
        return ageB - ageA; // Older entries first
      }
      
      return a[1].depth - b[1].depth; // Shallower searches first
    });
    
    // Remove oldest 20% of entries
    const removeCount = Math.floor(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      this.table.delete(entries[i][0]);
    }
    
    console.log(`Transposition table cleanup: removed ${removeCount} entries, ${this.table.size} remaining`);
  }
  
  /**
   * Get memory usage estimate in MB
   */
  getMemoryUsage(): number {
    // Rough estimate: each entry is approximately 100 bytes
    return (this.table.size * 100) / (1024 * 1024);
  }
  
  /**
   * Export table state for debugging
   */
  export(): { [key: string]: TranspositionEntry } {
    const exported: { [key: string]: TranspositionEntry } = {};
    this.table.forEach((value, key) => {
      exported[key] = { ...value };
    });
    return exported;
  }
  
  /**
   * Import table state (useful for resuming analysis)
   */
  import(data: { [key: string]: TranspositionEntry }): void {
    this.table.clear();
    Object.entries(data).forEach(([key, value]) => {
      this.table.set(key, value);
    });
  }
}
