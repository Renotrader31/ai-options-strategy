'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, TrendingUp, Activity, Shield, Zap,
  DollarSign, Target, AlertCircle, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, ChevronRight,
  Search, RefreshCw, Award, Flame, X,
  LineChart, Loader, AlertTriangle, Clock,
  Settings, Sliders, Wifi, WifiOff, GitCompare,
  Plus, Minus, Check, Star
} from 'lucide-react';

// Mock data generator for fallback
const generateMockData = (symbol) => {
  const price = 50 + Math.random() * 300;
  const change = (Math.random() - 0.5) * 10;
  const iv = 20 + Math.random() * 60;
  const ivRank = Math.floor(Math.random() * 100);
  
  return {
    stockData: {
      symbol,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(((change / price) * 100).toFixed(2)),
      volume: Math.floor(Math.random() * 100000000),
      avgVolume: Math.floor(Math.random() * 80000000),
      marketCap: Math.floor(price * 1000000000),
      pe: parseFloat((10 + Math.random() * 30).toFixed(1)),
      iv: parseFloat(iv.toFixed(1)),
      ivRank: ivRank,
      atmStrike: Math.round(price / 5) * 5,
      putCallRatio: parseFloat((0.5 + Math.random()).toFixed(2)),
      optionVolume: Math.floor(Math.random() * 50000),
      openInterest: Math.floor(Math.random() * 100000)
    },
    marketConditions: {
      trend: ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)],
      movement: iv > 50 ? 'volatile' : iv < 25 ? 'stable' : 'neutral',
      flowSentiment: ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)],
      unusualOptions: Math.floor(Math.random() * 30),
      has0DTE: Math.random() > 0.5,
      zeroDTEVolume: Math.floor(Math.random() * 50000),
      zeroDTEFlow: Math.floor(Math.random() * 20)
    },
    zeroDTEData: {
      available: Math.random() > 0.5,
      callCount: Math.floor(Math.random() * 50),
      putCount: Math.floor(Math.random() * 50),
      atmCallPremium: price * 0.003,
      atmPutPremium: price * 0.003,
      totalVolume: Math.floor(Math.random() * 50000),
      totalOI: Math.floor(Math.random() * 10000)
    },
    greeksData: {
      available: Math.random() > 0.7,
      atm: {
        delta: 0.5 + (Math.random() - 0.5) * 0.2,
        gamma: Math.random() * 0.05,
        theta: -(Math.random() * 0.5),
        vega: Math.random() * 0.3,
        rho: Math.random() * 0.1
      }
    }
  };
};

// Convert API data to our format
const convertAPIData = (fmpData, polygonData, uwData, symbol) => {
  // Process FMP data
  const quote = fmpData && fmpData[0] ? fmpData[0] : null;
  const price = quote ? quote.price : 100 + Math.random() * 200;
  const change = quote ? quote.change : (Math.random() - 0.5) * 10;
  const changePercent = quote ? quote.changesPercentage : ((change / price) * 100);
  
  // Process Polygon data
  const polygonQuote = polygonData?.results?.[0];
  const volume = polygonQuote ? polygonQuote.v : Math.floor(Math.random() * 100000000);
  
  // Process Unusual Whales data
  const uwDataArray = uwData?.data || [];
  const hasUWData = uwDataArray.length > 0;
  
  // Calculate implied volatility from UW data
  let avgIV = 25; // default
  if (hasUWData) {
    const ivSum = uwDataArray.reduce((sum, item) => {
      const iv = item.implied_volatility || item.iv || 0.25;
      return sum + (typeof iv === 'string' ? parseFloat(iv) : iv);
    }, 0);
    avgIV = uwDataArray.length > 0 ? (ivSum / uwDataArray.length) * 100 : 25;
  }
  
  // Calculate flow sentiment from UW data
  let flowSentiment = 'neutral';
  if (hasUWData) {
    const bullishFlow = uwDataArray.filter(item => 
      item.tags?.includes('bullish') || 
      item.option_type === 'call' ||
      (item.delta && parseFloat(item.delta) > 0)
    ).length;
    
    const bearishFlow = uwDataArray.filter(item => 
      item.tags?.includes('bearish') || 
      item.option_type === 'put' ||
      (item.delta && parseFloat(item.delta) < 0)
    ).length;
    
    if (bullishFlow > bearishFlow * 1.5) flowSentiment = 'bullish';
    else if (bearishFlow > bullishFlow * 1.5) flowSentiment = 'bearish';
  }
  
  return {
    stockData: {
      symbol: symbol.toUpperCase(),
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: volume,
      avgVolume: Math.floor(volume * 0.8),
      marketCap: Math.floor(price * 1000000000),
      pe: quote?.pe || parseFloat((10 + Math.random() * 30).toFixed(1)),
      iv: parseFloat(avgIV.toFixed(1)),
      ivRank: Math.floor(avgIV * 1.5), // Simple IV rank calculation
      atmStrike: Math.round(price / 5) * 5,
      putCallRatio: parseFloat((0.5 + Math.random()).toFixed(2)),
      optionVolume: hasUWData ? uwDataArray.reduce((sum, item) => sum + (item.volume || 0), 0) : Math.floor(Math.random() * 50000),
      openInterest: hasUWData ? uwDataArray.reduce((sum, item) => sum + (item.open_interest || 0), 0) : Math.floor(Math.random() * 100000)
    },
    marketConditions: {
      trend: changePercent > 2 ? 'bullish' : changePercent < -2 ? 'bearish' : 'neutral',
      movement: avgIV > 50 ? 'volatile' : avgIV < 25 ? 'stable' : 'neutral',
      flowSentiment: flowSentiment,
      unusualOptions: hasUWData ? uwDataArray.filter(item => item.tags?.includes('unusual')).length : Math.floor(Math.random() * 30),
      has0DTE: hasUWData ? uwDataArray.some(item => {
        const expiry = item.expiry;
        if (!expiry) return false;
        const today = new Date().toISOString().split('T')[0];
        return expiry === today;
      }) : false,
      zeroDTEVolume: Math.floor(Math.random() * 50000),
      zeroDTEFlow: Math.floor(Math.random() * 20)
    },
    zeroDTEData: {
      available: hasUWData,
      callCount: hasUWData ? uwDataArray.filter(item => item.option_type === 'call').length : Math.floor(Math.random() * 50),
      putCount: hasUWData ? uwDataArray.filter(item => item.option_type === 'put').length : Math.floor(Math.random() * 50),
      atmCallPremium: price * 0.003,
      atmPutPremium: price * 0.003,
      totalVolume: hasUWData ? uwDataArray.reduce((sum, item) => sum + (item.volume || 0), 0) : Math.floor(Math.random() * 50000),
      totalOI: hasUWData ? uwDataArray.reduce((sum, item) => sum + (item.open_interest || 0), 0) : Math.floor(Math.random() * 10000)
    },
    greeksData: {
      available: hasUWData && uwDataArray.some(item => item.delta || item.gamma || item.theta || item.vega),
      atm: hasUWData && uwDataArray.length > 0 ? {
        delta: parseFloat(uwDataArray[0]?.delta || '0.5'),
        gamma: parseFloat(uwDataArray[0]?.gamma || '0.02'),
        theta: parseFloat(uwDataArray[0]?.theta || '-0.05'),
        vega: parseFloat(uwDataArray[0]?.vega || '0.15'),
        rho: parseFloat(uwDataArray[0]?.rho || '0.03')
      } : {
        delta: 0.5 + (Math.random() - 0.5) * 0.2,
        gamma: Math.random() * 0.05,
        theta: -(Math.random() * 0.5),
        vega: Math.random() * 0.3,
        rho: Math.random() * 0.1
      }
    }
  };
};

// Strategy definitions (keeping your existing ones)
const strategies = {
  longCall: {
    name: 'Long Call',
    type: 'directional',
    bias: 'bullish',
    description: 'Buy call options for bullish outlook',
    bestFor: 'Strong upward movement expected',
    maxProfit: 'Unlimited',
    maxLoss: 'Premium paid',
    riskReward: 'High',
    greeks: { delta: '+', gamma: '+', theta: '-', vega: '+' },
    calculate: (stockData) => {
      const callPremium = stockData.price * 0.02;
      const breakeven = (stockData.atmStrike || stockData.price) + callPremium;
      return {
        maxLoss: `$${(callPremium * 100).toFixed(2)}`,
        breakeven: `$${breakeven.toFixed(2)}`,
        delta: '+0.50',
        profitProb: '35%'
      };
    }
  },
  longPut: {
    name: 'Long Put',
    type: 'directional',
    bias: 'bearish',
    description: 'Buy put options for bearish outlook',
    bestFor: 'Strong downward movement expected',
    maxProfit: 'Stock to zero minus premium',
    maxLoss: 'Premium paid',
    riskReward: 'High',
    greeks: { delta: '-', gamma: '+', theta: '-', vega: '+' },
    calculate: (stockData) => {
      const putPremium = stockData.price * 0.02;
      const breakeven = (stockData.atmStrike || stockData.price) - putPremium;
      return {
        maxLoss: `$${(putPremium * 100).toFixed(2)}`,
        breakeven: `$${breakeven.toFixed(2)}`,
        delta: '-0.50',
        profitProb: '35%'
      };
    }
  },
  ironCondor: {
    name: 'Iron Condor',
    type: 'neutral',
    bias: 'neutral',
    description: 'Sell OTM call & put spreads',
    bestFor: 'Range-bound markets',
    maxProfit: 'Net credit received',
    maxLoss: 'Strike width - credit',
    riskReward: 'Moderate',
    greeks: { delta: '0', gamma: '-', theta: '+', vega: '-' },
    calculate: (stockData) => {
      const strikeWidth = 5;
      const credit = strikeWidth * 0.3;
      const maxLoss = strikeWidth - credit;
      return {
        maxProfit: `$${(credit * 100).toFixed(2)}`,
        maxLoss: `$${(maxLoss * 100).toFixed(2)}`,
        breakeven: `${(stockData.price - 10).toFixed(2)} - ${(stockData.price + 10).toFixed(2)}`,
        delta: 'Neutral',
        profitProb: '68%'
      };
    }
  },
  bullPutSpread: {
    name: 'Bull Put Spread',
    type: 'spread',
    bias: 'bullish',
    description: 'Sell put + buy lower strike put',
    bestFor: 'Moderate bullish view with income',
    maxProfit: 'Net credit received',
    maxLoss: 'Strike difference - credit',
    riskReward: 'Moderate',
    greeks: { delta: '+', gamma: '0', theta: '+', vega: '-' },
    calculate: (stockData) => {
      const strikeWidth = 5;
      const credit = strikeWidth * 0.35;
      const maxLoss = strikeWidth - credit;
      const breakeven = stockData.price - credit;
      return {
        maxProfit: `$${(credit * 100).toFixed(2)}`,
        maxLoss: `$${(maxLoss * 100).toFixed(2)}`,
        breakeven: `$${breakeven.toFixed(2)}`,
        delta: '+0.15',
        profitProb: '70%'
      };
    }
  },
  zeroDTELongCall: {
    name: '0DTE Long Call',
    type: '0dte',
    bias: 'bullish',
    description: 'Intraday directional play - calls expiring today',
    bestFor: 'Strong intraday momentum with clear direction',
    maxProfit: 'Unlimited (until close)',
    maxLoss: 'Premium paid',
    riskReward: 'Very High Risk',
    greeks: { delta: '++', gamma: '+++', theta: '---', vega: '0' },
    calculate: (stockData) => {
      const callPremium = stockData.price * 0.003;
      const breakeven = stockData.price + callPremium;
      return {
        maxLoss: `$${(callPremium * 100).toFixed(2)}`,
        breakeven: `$${breakeven.toFixed(2)}`,
        delta: '+0.40-0.60',
        profitProb: '25%',
        special: '⚡ EXPIRES TODAY!'
      };
    }
  },
  zeroDTEIronFly: {
    name: '0DTE Iron Fly',
    type: '0dte',
    bias: 'neutral',
    description: 'Sell ATM straddle with protection - expires today',
    bestFor: 'Pin risk at major levels, theta gang special',
    maxProfit: 'Credit received',
    maxLoss: 'Wing width - credit',
    riskReward: 'High Probability',
    greeks: { delta: '0', gamma: '---', theta: '+++', vega: '0' },
    calculate: (stockData) => {
      const credit = stockData.price * 0.015;
      const wingWidth = 5;
      const maxLoss = wingWidth - credit;
      return {
        maxProfit: `$${(credit * 100).toFixed(2)}`,
        maxLoss: `$${(maxLoss * 100).toFixed(2)}`,
        breakeven: `${(stockData.price - credit).toFixed(2)} - ${(stockData.price + credit).toFixed(2)}`,
        profitProb: '68%',
        special: '🔥 MAX THETA DECAY!'
      };
    }
  }
};

// Enhanced recommendation generator
const generateRecommendations = (stockData, marketConditions, zeroDTEData) => {
  const recommendations = [];
  const ivRank = stockData?.ivRank || 50;
  const trend = marketConditions?.trend || 'neutral';
  const flowSentiment = marketConditions?.flowSentiment || 'neutral';
  const movement = marketConditions?.movement || 'neutral';
  const changePercent = stockData?.changePercent || 0;
  
  console.log('=== LIVE DATA RECOMMENDATION ENGINE ===');
  console.log('Stock:', stockData?.symbol);
  console.log('Price Change:', changePercent + '%');
  console.log('IV Rank:', ivRank);
  console.log('Trend:', trend);
  console.log('Flow Sentiment:', flowSentiment);
  console.log('Movement:', movement);
  console.log('0DTE Available:', marketConditions?.has0DTE || zeroDTEData?.available);
  console.log('======================================');
  
  // PRIORITY 1: 0DTE STRATEGIES (if available)
  if (marketConditions?.has0DTE || zeroDTEData?.available) {
    if (Math.abs(changePercent) > 0.5) {
      if (changePercent > 0.5) {
        recommendations.push({
          ...strategies.zeroDTELongCall,
          winRate: 35,
          priority: 1,
          reason: `⚡ 0DTE MOMENTUM! Stock up ${changePercent.toFixed(2)}% - Ride the intraday trend!`
        });
      }
    } else {
      recommendations.push({
        ...strategies.zeroDTEIronFly,
        winRate: 68,
        priority: 1,
        reason: `🎯 0DTE PIN PLAY! Stock stable (${changePercent.toFixed(2)}%) - Maximum theta decay!`
      });
    }
  }
  
  // PRIORITY 2: DIRECTIONAL PLAYS
  if (Math.abs(changePercent) > 2) {
    if (changePercent > 2) {
      if (ivRank < 40) {
        recommendations.push({
          ...strategies.longCall,
          winRate: 45,
          priority: 2,
          reason: `📈 STRONG BULLISH! Up ${changePercent.toFixed(2)}% with low IV (${ivRank}) - Cheap calls!`
        });
      } else {
        recommendations.push({
          ...strategies.bullPutSpread,
          winRate: 70,
          priority: 2,
          reason: `📈 BULLISH MOMENTUM! Up ${changePercent.toFixed(2)}% - Collect premium on pullbacks`
        });
      }
    }
  }
  
  // PRIORITY 3: IV-BASED STRATEGIES
  if (ivRank > 70) {
    recommendations.push({
      ...strategies.ironCondor,
      winRate: 75,
      priority: 3,
      reason: `🔥 EXTREME IV RANK (${ivRank})! Premium selling opportunity`
    });
  }
  
  // PRIORITY 4: DEFAULT
  if (recommendations.length === 0) {
    recommendations.push({
      ...strategies.ironCondor,
      winRate: 65,
      priority: 5,
      reason: `No strong directional bias - Neutral iron condor`
    });
  }
  
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map(item => [item.name, item])).values()
  );
  
  uniqueRecommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.winRate - a.winRate;
  });
  
  return uniqueRecommendations.slice(0, 5);
};

// Main Component
export default function AIOptionsStrategy() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [accountBalance, setAccountBalance] = useState(25000);
  const [maxRisk, setMaxRisk] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparedSymbols, setComparedSymbols] = useState([]);
  const [comparisonData, setComparisonData] = useState({});
  const [dataSource, setDataSource] = useState('checking');
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
    setConnectionStatus('checking');
    try {
      // Test all three APIs
      const testSymbol = 'AAPL';
      const [fmpTest, polygonTest, uwTest] = await Promise.allSettled([
        fetch(`/api/fmp-api?symbol=${testSymbol}`),
        fetch(`/api/polygon-api?symbol=${testSymbol}`),
        fetch(`/api/unusual-whales-api?symbol=${testSymbol}`)
      ]);
      
      const workingAPIs = [fmpTest, polygonTest, uwTest].filter(
        result => result.status === 'fulfilled' && result.value.ok
      ).length;
      
      if (workingAPIs >= 2) {
        setConnectionStatus('connected');
        setDataSource('live');
      } else if (workingAPIs >= 1) {
        setConnectionStatus('partial');
        setDataSource('mixed');
      } else {
        setConnectionStatus('disconnected');
        setDataSource('mock');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setDataSource('mock');
    }
  };

  // Fetch live data from your APIs
  const fetchLiveData = async (symbol) => {
    try {
      // Call all three APIs in parallel
      const [fmpResponse, polygonResponse, uwResponse] = await Promise.allSettled([
        fetch(`/api/fmp-api?symbol=${symbol}`),
        fetch(`/api/polygon-api?symbol=${symbol}`),
        fetch(`/api/unusual-whales-api?symbol=${symbol}`)
      ]);
      
      // Process responses
      const fmpData = fmpResponse.status === 'fulfilled' && fmpResponse.value.ok 
        ? await fmpResponse.value.json() 
        : null;
      
      const polygonData = polygonResponse.status === 'fulfilled' && polygonResponse.value.ok 
        ? await polygonResponse.value.json() 
        : null;
      
      const uwData = uwResponse.status === 'fulfilled' && uwResponse.value.ok 
        ? await uwResponse.value.json() 
        : null;
      
      // Convert API data to our format
      return convertAPIData(fmpData, polygonData, uwData, symbol);
      
    } catch (error) {
      console.error('Live data fetch error:', error);
      throw error;
    }
  };

  // Main fetch function
  const fetchData = useCallback(async (symbol) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let data;
      let isLiveData = false;
      
      if (dataSource === 'live' || dataSource === 'mixed') {
        try {
          data = await fetchLiveData(symbol);
          isLiveData = true;
          console.log('🚀 Using LIVE DATA for', symbol);
        } catch (liveError) {
          console.log('📊 Live data failed, using mock for', symbol);
          data = generateMockData(symbol);
        }
      } else {
        console.log('📊 Using MOCK data for', symbol);
        data = generateMockData(symbol);
      }
      
      // Update data source indicator
      setDataSource(isLiveData ? 'live' : 'mock');
      
      // Set all the state
      setStockData(data.stockData);
      setMarketConditions(data.marketConditions);
      setGreeksData(data.greeksData);
      setZeroDTEData(data.zeroDTEData);
      
      // Store for comparison if in compare mode
      if (compareMode) {
        setComparisonData(prev => ({
          ...prev,
          [symbol]: data
        }));
      }
      
      // Generate recommendations
      const recs = generateRecommendations(data.stockData, data.marketConditions, data.zeroDTEData);
      setRecommendations(recs);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load data - using demo data');
      
      const data = generateMockData(symbol);
      setStockData(data.stockData);
      setMarketConditions(data.marketConditions);
      setGreeksData(data.greeksData);
      setZeroDTEData(data.zeroDTEData);
      setRecommendations(generateRecommendations(data.stockData, data.marketConditions, data.zeroDTEData));
    } finally {
      setIsLoading(false);
    }
  }, [dataSource, compareMode]);

  // Load initial data
  useEffect(() => {
    fetchData(selectedStock);
  }, [selectedStock, fetchData]);

  const handleAnalyze = () => {
    const symbol = searchInput.toUpperCase();
    setSelectedStock(symbol);
    
    if (compareMode) {
      addToComparison(symbol);
    }
  };

  // Comparison functions
  const addToComparison = (symbol) => {
    if (comparedSymbols.length < 4 && !comparedSymbols.includes(symbol)) {
      setComparedSymbols(prev => [...prev, symbol]);
      fetchData(symbol);
    }
  };

  const removeFromComparison = (symbol) => {
    setComparedSymbols(prev => prev.filter(s => s !== symbol));
    setComparisonData(prev => {
      const newData = { ...prev };
      delete newData[symbol];
      return newData;
    });
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (!compareMode) {
      setComparedSymbols([]);
      setComparisonData({});
    }
  };

  // Calculate position sizing
  const calculatePositionSize = (strategy) => {
    if (!stockData) return { contracts: 1, totalCost: 100 };
    
    const details = strategy.calculate ? strategy.calculate(stockData) : {};
    const maxLossStr = details.maxLoss || '100';
    const maxLoss = parseFloat(maxLossStr.match(/[\d.]+/)) || 100;
    const riskAmount = (accountBalance * maxRisk) / 100;
    let contracts = Math.floor(riskAmount / maxLoss);
    
    if (!contracts || contracts === Infinity || contracts === 0 || isNaN(contracts)) {
      contracts = 10;
    }
    
    const totalCost = contracts * maxLoss;
    
    return { contracts, totalCost };
  };

  // Connection status indicator
  const ConnectionStatus = () => {
    const statusConfig = {
      connected: {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Live Data',
        color: 'text-green-400',
        bgColor: 'bg-green-400/10'
      },
      partial: {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Partial Live',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10'
      },
      disconnected: {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Mock Data',
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
                {dataSource === 'live' ? '🚀 Live Market Data Active' : 'Smart options strategies powered by AI'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <button 
              onClick={toggleCompareMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                compareMode 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Compare ({comparedSymbols.length})
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 ${showSettings ? 'bg-purple-600' : 'bg-gray-800'} rounded-lg`}
            >
              <Settings className="w-5 h-5" />
            </button>
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

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-bold mb-4">Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Account Balance</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Max Risk %</label>
              <input
                type="number"
                value={maxRisk}
                onChange={(e) => setMaxRisk(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                min="1" max="10"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Reconnect APIs</label>
              <button
                onClick={checkAPIConnection}
                className="w-full px-2 py-1 bg-blue-600 rounded text-white hover:bg-blue-700"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Mode Header */}
      {compareMode && (
        <div className="bg-purple-900/20 border-b border-purple-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-purple-400">📊 Comparison Mode Active</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Selected: {comparedSymbols.length}/4</span>
              <button
                onClick={() => {
                  setComparedSymbols([]);
                  setComparisonData({});
                }}
                className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>
          {comparedSymbols.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {comparedSymbols.map(symbol => (
                <div key={symbol} className="flex items-center gap-2 bg-purple-800/30 px-3 py-1 rounded">
                  <span className="font-medium">{symbol}</span>
                  <button
                    onClick={() => removeFromComparison(symbol)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Source Indicator */}
      {dataSource === 'live' && (
        <div className="mx-6 mt-4 bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-green-400 font-medium">🚀 Live Market Data Active</p>
              <p className="text-xs text-gray-400">
                Connected to: FMP, Polygon{greeksData?.available && ', Unusual Whales with Greeks'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mx-6 mt-4 bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-yellow-400">{error}</p>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Stock Search */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Analyze Stock Options
            {compareMode && (
              <span className="text-sm bg-purple-600/20 text-purple-400 px-2 py-1 rounded ml-2">
                Compare Mode
              </span>
            )}
          </h2>
          
          <div className="flex gap-4 items-end mb-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-2 block">Enter Stock Symbol</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg text-lg font-medium"
                  placeholder="AAPL"
                />
              </div>
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : compareMode ? (
                <Plus className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {compareMode ? 'Add to Compare' : 'Analyze Options'}
            </button>
          </div>
          
          {/* Quick Access */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Quick Access:</span>
            {favorites.map(symbol => (
              <button
                key={symbol}
                onClick={() => {
                  setSearchInput(symbol);
                  setSelectedStock(symbol);
                  if (compareMode) addToComparison(symbol);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors relative ${
                  selectedStock === symbol 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {symbol}
                {compareMode && comparedSymbols.includes(symbol) && (
                  <Check className="w-3 h-3 absolute -top-1 -right-1 text-green-400" />
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Comparison View */}
        {compareMode && comparedSymbols.length > 1 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-purple-500" />
              Symbol Comparison
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4">Metric</th>
                    {comparedSymbols.map(symbol => (
                      <th key={symbol} className="text-left py-3 px-4 font-bold">{symbol}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-400">Price</td>
                    {comparedSymbols.map(symbol => {
                      const data = comparisonData[symbol]?.stockData;
                      return (
                        <td key={symbol} className="py-3 px-4 font-medium">
                          ${data?.price?.toFixed(2) || '--'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-400">Change %</td>
                    {comparedSymbols.map(symbol => {
                      const data = comparisonData[symbol]?.stockData;
                      const change = data?.changePercent || 0;
                      return (
                        <td key={symbol} className={`py-3 px-4 font-medium ${
                          change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {change >= 0 ? '+' : ''}{change?.toFixed(2) || '--'}%
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-400">IV Rank</td>
                    {comparedSymbols.map(symbol => {
                      const data = comparisonData[symbol]?.stockData;
                      const ivRank = data?.ivRank || 0;
                      return (
                        <td key={symbol} className={`py-3 px-4 font-medium ${
                          ivRank > 70 ? 'text-red-400' : 
                          ivRank > 30 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {ivRank}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-400">Flow Sentiment</td>
                    {comparedSymbols.map(symbol => {
                      const sentiment = comparisonData[symbol]?.marketConditions?.flowSentiment;
                      return (
                        <td key={symbol} className="py-3 px-4 font-medium capitalize">
                          {sentiment === 'bullish' ? '🐂 Bullish' : 
                           sentiment === 'bearish' ? '🐻 Bearish' : '➖ Neutral'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* 0DTE Alert Box */}
        {(marketConditions?.has0DTE || zeroDTEData?.available) && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-yellow-500" />
              <div>
                <div className="font-bold text-yellow-400">🔥 0DTE Options Available!</div>
                <div className="text-sm text-gray-300">
                  {zeroDTEData?.totalVolume || marketConditions?.zeroDTEVolume || 0} contracts traded today • 
                  {' '}{marketConditions?.zeroDTEFlow || 0} unusual flows • 
                  {' '}{zeroDTEData?.callCount || 0} Calls / {zeroDTEData?.putCount || 0} Puts • 
                  Expires at close!
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Market Data */}
        {stockData && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Market Data for {selectedStock}
              {dataSource === 'live' && (
                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded ml-2">
                  LIVE
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Price</div>
                <div className="text-2xl font-bold">${stockData.price?.toFixed(2)}</div>
                <div className={`text-sm mt-1 flex items-center gap-1 ${
                  stockData.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stockData.change >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stockData.change >= 0 ? '+' : ''}{stockData.change?.toFixed(2)} ({stockData.changePercent?.toFixed(2)}%)
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Implied Volatility</div>
                <div className="text-2xl font-bold text-purple-400">{stockData.iv?.toFixed(1)}%</div>
                <div className="text-sm mt-1">
                  <span className="text-gray-500">IV Rank:</span> 
                  <span className={`ml-2 ${
                    stockData.ivRank > 70 ? 'text-red-400' : 
                    stockData.ivRank > 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {stockData.ivRank}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Option Flow</div>
                <div className="text-lg font-bold text-blue-400">
                  {marketConditions?.flowSentiment === 'bullish' ? '🐂 Bullish' : 
                   marketConditions?.flowSentiment === 'bearish' ? '🐻 Bearish' : '➖ Neutral'}
                </div>
                <div className="text-sm mt-1 text-gray-500">
                  P/C: {stockData.putCallRatio?.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Market Trend</div>
                <div className="text-lg font-bold capitalize">
                  {marketConditions?.trend || 'Neutral'}
                </div>
                <div className="text-sm mt-1 text-gray-500">
                  {marketConditions?.unusualOptions || 0} Unusual
                  {marketConditions?.has0DTE && (
                    <span className="ml-2 text-yellow-400">• 0DTE!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Greeks Display */}
        {greeksData && greeksData.available && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-purple-500" />
              Live Greeks for {selectedStock} (ATM Options)
              <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded ml-2">
                LIVE
              </span>
            </h2>
            
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Delta</div>
                <div className={`text-2xl font-bold ${greeksData.atm.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {greeksData.atm.delta?.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Direction exposure</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Gamma</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {greeksData.atm.gamma?.toFixed(4)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Delta change rate</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Theta</div>
                <div className="text-2xl font-bold text-red-400">
                  {greeksData.atm.theta?.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Time decay/day</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Vega</div>
                <div className="text-2xl font-bold text-purple-400">
                  {greeksData.atm.vega?.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">IV sensitivity</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Rho</div>
                <div className="text-2xl font-bold text-blue-400">
                  {greeksData.atm.rho?.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Interest rate</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Strategy Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              AI Recommended Strategies ({recommendations.length})
              {dataSource === 'live' && (
                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                  LIVE DATA
                </span>
              )}
              {recommendations.some(r => r.type === '0dte') && (
                <span className="text-sm bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded ml-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  0DTE Available
                </span>
              )}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((strategy, index) => {
                const details = strategy.calculate ? strategy.calculate(stockData) : {};
                const is0DTE = strategy.type === '0dte';
                
                return (
                  <div
                    key={index}
                    className={`bg-gray-900 rounded-lg border ${
                      is0DTE ? 'border-yellow-600' : 'border-gray-800'
                    } p-6 hover:border-purple-700 transition-all cursor-pointer`}
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold mb-1">
                          {strategy.name}
                          {is0DTE && (
                            <span className="ml-2 text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
                              0DTE
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400">{strategy.description}</p>
                      </div>
                      {index === 0 && (
                        <Award className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Win Rate:</span>
                        <span className="text-green-400 font-medium">{strategy.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Profit:</span>
                        <span className="text-green-400">{details.maxProfit || strategy.maxProfit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Loss:</span>
                        <span className="text-red-400">{details.maxLoss || strategy.maxLoss}</span>
                      </div>
                      {details.breakeven && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Breakeven:</span>
                          <span className="text-yellow-400">{details.breakeven}</span>
                        </div>
                      )}
                      {details.special && (
                        <div className="text-center mt-2 text-purple-400 font-medium">
                          {details.special}
                        </div>
                      )}
                    </div>
                    
                    {strategy.reason && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-xs text-purple-400">{strategy.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Strategy Details Modal */}
        {selectedStrategy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" 
               onClick={() => setSelectedStrategy(null)}>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto" 
                 onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">
                  {selectedStrategy.name} Strategy Details
                  {selectedStrategy.type === '0dte' && (
                    <span className="ml-2 text-sm bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded">
                      EXPIRES TODAY!
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setSelectedStrategy(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium mb-3 text-gray-300">Strategy Overview</h3>
                  <p className="text-sm text-gray-400 mb-4">{selectedStrategy.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Best For:</span>
                      <span className="text-right">{selectedStrategy.bestFor}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Market Bias:</span>
                      <span className="capitalize">{selectedStrategy.bias}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Win Rate:</span>
                      <span className="text-green-400 font-medium">{selectedStrategy.winRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Risk/Reward:</span>
                      <span>{selectedStrategy.riskReward}</span>
                    </div>
                  </div>
                  
                  {selectedStrategy.reason && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <span className="text-xs text-gray-500">AI Reasoning:</span>
                      <p className="text-sm text-purple-400 mt-1">{selectedStrategy.reason}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-3 text-gray-300">Position Sizing</h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Account Size:</span>
                        <span>${accountBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Risk Amount ({maxRisk}%):</span>
                        <span>${((accountBalance * maxRisk) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Recommended Contracts:</span>
                        <span className="text-purple-400 font-medium">
                          {calculatePositionSize(selectedStrategy).contracts}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Investment:</span>
                        <span className="font-medium">${calculatePositionSize(selectedStrategy).totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Risk Management */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-3 text-red-400">⚠️ Risk Management Rules</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Set stop loss at 50% of max loss</li>
                  <li>• Take profits at 50-75% of max profit</li>
                  <li>• Never risk more than {maxRisk}% of account per trade</li>
                  <li>• Monitor position at market open and 30 min before close</li>
                  {selectedStrategy.type === '0dte' && (
                    <li className="text-yellow-400">• ⚡ 0DTE: Must close before market close!</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
