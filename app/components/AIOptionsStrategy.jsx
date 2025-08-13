// app/components/AIOptionsStrategy.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, TrendingUp, Activity, Shield, Zap,
  DollarSign, Target, AlertCircle, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, Info, ChevronRight,
  Search, RefreshCw, Award, Flame, X,
  LineChart, Loader, AlertTriangle, TrendingDown, Clock, Wifi, WifiOff
} from 'lucide-react';

// ... (Include all the strategy definitions from before)

export default function AIOptionsStrategy() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [accountBalance, setAccountBalance] = useState(25000);
  const [maxRisk, setMaxRisk] = useState(2);
  const [dataSource, setDataSource] = useState('mock'); // 'live' or 'mock'
  const [connectionStatus, setConnectionStatus] = useState('checking');
  
  const [stockData, setStockData] = useState(null);
  const [marketConditions, setMarketConditions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [greeksData, setGreeksData] = useState(null);
  const [zeroDTEData, setZeroDTEData] = useState(null);
  
  const favorites = ['AAPL', 'NVDA', 'TSLA', 'SPY', 'AMZN', 'QQQ'];

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection();
  }, []);

  const checkAPIConnection = async () => {
    try {
      const response = await fetch('/api/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: 'SPY',
          includeGreeks: false
        })
      });
      
      const data = await response.json();
      
      if (data.success && !data.useMock) {
        setConnectionStatus('connected');
        setDataSource('live');
      } else {
        setConnectionStatus('fallback');
        setDataSource('mock');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setDataSource('mock');
    }
  };

  // Fetch data for a symbol with live API integration
  const fetchData = useCallback(async (symbol) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching live data for:', symbol);
      
      // Get next expiry for options
      const nextExpiry = getNextExpiry();
      
      // Call our API route with Greeks request
      const response = await fetch('/api/market', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          symbol,
          includeGreeks: true,
          expiry: nextExpiry
        })
      });
      
      console.log('API Response status:', response.status);
      
      const result = await response.json();
      console.log('API Result:', result);
      
      if (result.success && !result.useMock) {
        // Use real data from API
        console.log('Using LIVE data for', symbol);
        setDataSource('live');
        setConnectionStatus('connected');
        setStockData(result.stockData);
        setMarketConditions(result.marketConditions);
        setGreeksData(result.greeksData);
        setZeroDTEData(result.zeroDTEData);
        const recs = generateRecommendations(result.stockData, result.marketConditions, result.zeroDTEData);
        console.log('Generated recommendations:', recs.length);
        setRecommendations(recs);
      } else {
        // Fall back to mock data
        console.log('Using MOCK data for', symbol);
        setDataSource('mock');
        setConnectionStatus('fallback');
        const data = generateMockData(symbol);
        setStockData(data.stockData);
        setMarketConditions(data.marketConditions);
        setGreeksData(data.greeksData);
        setZeroDTEData(data.zeroDTEData);
        setRecommendations(generateRecommendations(data.stockData, data.marketConditions, data.zeroDTEData));
      }
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load data - using fallback');
      setDataSource('mock');
      setConnectionStatus('disconnected');
      // Use mock data as fallback
      const data = generateMockData(symbol);
      setStockData(data.stockData);
      setMarketConditions(data.marketConditions);
      setGreeksData(data.greeksData);
      setZeroDTEData(data.zeroDTEData);
      setRecommendations(generateRecommendations(data.stockData, data.marketConditions, data.zeroDTEData));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchData(selectedStock);
  }, [selectedStock, fetchData]);

  const handleAnalyze = () => {
    const symbol = searchInput.toUpperCase();
    setSelectedStock(symbol);
  };

  // Connection status indicator component
  const ConnectionStatus = () => {
    const statusConfig = {
      connected: {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Live Data',
        color: 'text-green-400',
        bgColor: 'bg-green-400/10'
      },
      fallback: {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Mock Data',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10'
      },
      disconnected: {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Offline',
        color: 'text-red-400',
        bgColor: 'bg-red-400/10'
      },
      checking: {
        icon: <Loader className="w-4 h-4 animate-spin" />,
        text: 'Connecting...',
        color: 'text-gray-400',
        bgColor: 'bg-gray-400/10'
      }
    };

    const config = statusConfig[connectionStatus];

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${config.bgColor}`}>
        <span className={config.color}>{config.icon}</span>
        <span className={`text-sm ${config.color}`}>{config.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            <div>
              <h1 className="text-2xl font-bold">AI Options Strategy Generator</h1>
              <p className="text-sm text-gray-400">
                {dataSource === 'live' ? 'Live Market Data + 0DTE + Greeks' : 'Smart options strategies powered by AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <button 
              onClick={() => fetchData(selectedStock)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>
      
      {/* Error Alert */}
      {error && (
        <div className="mx-6 mt-4 bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-yellow-400">{error}</p>
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      {dataSource === 'live' && (
        <div className="mx-6 mt-4 bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-green-400 font-medium">Live Market Data Active</p>
              <p className="text-xs text-gray-400">
                Connected to: Unusual Whales, Polygon, {greeksData?.available && 'with Live Greeks'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content - rest of your component remains the same */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* ... rest of the component JSX from the original */}
      </div>
    </div>
  );
}

// Helper functions (include all from original)
function generateMockData(symbol) {
  // ... include the mock data generator
}

function getNextExpiry() {
  // ... include the expiry calculator
}

function generateRecommendations(stockData, marketConditions, zeroDTEData) {
  // ... include the recommendations generator
}

// Include all strategy definitions
const strategies = {
  // ... include all strategies from original
};
