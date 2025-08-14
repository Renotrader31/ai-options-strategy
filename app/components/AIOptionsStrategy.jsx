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
  const quote = fmpData && fmpData[0] ? fmpData[0] : null;
  const price = quote ? quote.price : 100 + Math.random() * 200;
  const change = quote ? quote.change : (Math.random() - 0.5) * 10;
  const changePercent = quote ? quote.changesPercentage : ((change / price) * 100);
  
  const polygonQuote = polygonData?.results?.[0];
  const volume = polygonQuote ? polygonQuote.v : Math.floor(Math.random() * 100000000);
  
  const uwDataArray = uwData?.data || [];
  const hasUWData = uwDataArray.length > 0;
  
  let avgIV = 25;
  if (hasUWData) {
    const ivSum = uwDataArray.reduce((sum, item) => {
      const iv = item.implied_volatility || item.iv || 0.25;
      return sum + (typeof iv === 'string' ? parseFloat(iv) : iv);
    }, 0);
    avgIV = uwDataArray.length > 0 ? (ivSum / uwDataArray.length) * 100 : 25;
  }
  
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
      ivRank: Math.floor(avgIV * 1.5),
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

// Strategy definitions (simplified to save space)
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
    calculate: (stockData) => ({
      maxLoss: `$${(stockData.price * 0.02 * 100).toFixed(2)}`,
      breakeven: `$${(stockData.price + stockData.price * 0.02).toFixed(2)}`,
      delta: '+0.50',
      profitProb: '35%'
    })
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
    calculate: (stockData) => ({
      maxProfit: `$${(1.5 * 100).toFixed(2)}`,
      maxLoss: `$${(3.5 * 100).toFixed(2)}`,
      breakeven: `${(stockData.price - 10).toFixed(2)} - ${(stockData.price + 10).toFixed(2)}`,
      delta: 'Neutral',
      profitProb: '68%'
    })
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
    calculate: (stockData) => ({
      maxProfit: `$${(1.75 * 100).toFixed(2)}`,
      maxLoss: `$${(3.25 * 100).toFixed(2)}`,
      breakeven: `$${(stockData.price - 1.75).toFixed(2)}`,
      delta: '+0.15',
      profitProb: '70%'
    })
  },
  jadeLizard: {
    name: 'Jade Lizard',
    type: 'premium',
    bias: 'neutral-bullish',
    description: 'Sell put + sell call spread (no upside risk!)',
    bestFor: 'Bullish with high IV, collect premium',
    maxProfit: 'Net credit received',
    maxLoss: 'Put strike - credit (only downside)',
    riskReward: 'No upside risk!',
    greeks: { delta: '+', gamma: '-', theta: '+', vega: '-' },
    calculate: (stockData) => ({
      maxProfit: `$${(stockData.price * 0.025 * 100).toFixed(2)}`,
      maxLoss: `$${((stockData.price * 0.95) * 100).toFixed(2)} (downside only)`,
      breakeven: `$${(stockData.price * 0.92).toFixed(2)}`,
      delta: '+0.10',
      profitProb: '70%',
      special: '🦎 NO UPSIDE RISK!'
    })
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
    calculate: (stockData) => ({
      maxLoss: `$${(stockData.price * 0.003 * 100).toFixed(2)}`,
      breakeven: `$${(stockData.price + stockData.price * 0.003).toFixed(2)}`,
      delta: '+0.40-0.60',
      profitProb: '25%',
      special: '⚡ EXPIRES TODAY!'
    })
  }
};

// Enhanced recommendation generator
const generateRecommendations = (stockData, marketConditions, zeroDTEData) => {
  const recommendations = [];
  const ivRank = stockData?.ivRank || 50;
  const changePercent = stockData?.changePercent || 0;
  const iv = stockData?.iv || 25;
  
  // MOMENTUM STRATEGIES
  if (Math.abs(changePercent) > 0.3) {
    if (changePercent > 0.3) {
      recommendations.push({
        ...strategies.longCall,
        winRate: 45 + Math.min(Math.abs(changePercent) * 5, 20),
        priority: 1,
        reason: `📈 BULLISH MOMENTUM! Up ${changePercent.toFixed(2)}%`
      });
      recommendations.push({
        ...strategies.bullPutSpread,
        winRate: 65 + Math.min(Math.abs(changePercent) * 3, 15),
        priority: 2,
        reason: `💰 SELL PUTS! Up ${changePercent.toFixed(2)}%`
      });
    }
  }
  
  // VOLATILITY STRATEGIES
  if (iv > 35) {
    recommendations.push({
      ...strategies.ironCondor,
      winRate: 70 + Math.min((iv - 35) * 2, 15),
      priority: 2,
      reason: `🔥 HIGH IV (${iv}%)! Premium selling opportunity`
    });
    
    if (iv > 50) {
      recommendations.push({
        ...strategies.jadeLizard,
        winRate: 75,
        priority: 1,
        reason: `🦎 EXTREME IV (${iv}%)! Jade Lizard = NO UPSIDE RISK`
      });
    }
  }
  
  // 0DTE STRATEGIES
  if (marketConditions?.has0DTE || zeroDTEData?.available) {
    if (Math.abs(changePercent) > 0.5) {
      if (changePercent > 0.5) {
        recommendations.push({
          ...strategies.zeroDTELongCall,
          winRate: 35,
          priority: 1,
          reason: `⚡ 0DTE BULL! Up ${changePercent.toFixed(2)}% today`
        });
      }
    }
  }
  
  // ENSURE WE HAVE AT LEAST 3 STRATEGIES
  const fallbackStrategies = [
    {
      ...strategies.ironCondor,
      winRate: 65,
      priority: 5,
      reason: `⚖️ BALANCED PLAY! Neutral iron condor for steady income`
    },
    {
      ...strategies.bullPutSpread,
      winRate: 60,
      priority: 5,
      reason: `📊 MARKET NEUTRAL! Conservative income strategy`
    }
  ];
  
  const strategiesNeeded = 5 - recommendations.length;
  for (let i = 0; i < strategiesNeeded && i < fallbackStrategies.length; i++) {
    recommendations.push(fallbackStrategies[i]);
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
  const [comparisonType, setComparisonType] = useState('strategy');
  const [selectedStrategiesForComparison, setSelectedStrategiesForComparison] = useState([]);
  const [dataSource, setDataSource] = useState('checking');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  
  const [stockData, setStockData] = useState(null);
  const [marketConditions, setMarketConditions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [greeksData, setGreeksData] = useState(null);
  const [zeroDTEData, setZeroDTEData] = useState(null);
  
  const favorites = ['AAPL', 'NVDA', 'TSLA', 'SPY', 'AMZN', 'QQQ'];

  useEffect(() => {
    checkAPIConnection();
  }, []);

  const checkAPIConnection = async () => {
    setConnectionStatus('checking');
    try {
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

  const fetchLiveData = async (symbol) => {
    try {
      const [fmpResponse, polygonResponse, uwResponse] = await Promise.allSettled([
        fetch(`/api/fmp-api?symbol=${symbol}`),
        fetch(`/api/polygon-api?symbol=${symbol}`),
        fetch(`/api/unusual-whales-api?symbol=${symbol}`)
      ]);
      
      const fmpData = fmpResponse.status === 'fulfilled' && fmpResponse.value.ok 
        ? await fmpResponse.value.json() 
        : null;
      
      const polygonData = polygonResponse.status === 'fulfilled' && polygonResponse.value.ok 
        ? await polygonResponse.value.json() 
        : null;
      
      const uwData = uwResponse.status === 'fulfilled' && uwResponse.value.ok 
        ? await uwResponse.value.json() 
        : null;
      
      return convertAPIData(fmpData, polygonData, uwData, symbol);
      
    } catch (error) {
      console.error('Live data fetch error:', error);
      throw error;
    }
  };

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
      
      setDataSource(isLiveData ? 'live' : 'mock');
      
      setStockData(data.stockData);
      setMarketConditions(data.marketConditions);
      setGreeksData(data.greeksData);
      setZeroDTEData(data.zeroDTEData);
      
      if (compareMode) {
        setComparisonData(prev => ({
          ...prev,
          [symbol]: data
        }));
      }
      
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

  useEffect(() => {
    fetchData(selectedStock);
  }, [selectedStock, fetchData]);

  const handleAnalyze = () => {
    const symbol = searchInput.toUpperCase();
    setSelectedStock(symbol);
    
    if (compareMode && comparisonType === 'symbol') {
      addToComparison(symbol);
    }
  };

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
      setSelectedStrategiesForComparison([]);
    }
  };

  const toggleStrategyForComparison = (strategy) => {
    setSelectedStrategiesForComparison(prev => {
      const isSelected = prev.some(s => s.name === strategy.name);
      if (isSelected) {
        return prev.filter(s => s.name !== strategy.name);
      } else if (prev.length < 4) {
        return [...prev, strategy];
      }
      return prev;
    });
  };

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
// Strategy Detail Modal Component
  const StrategyModal = ({ strategy, isOpen, onClose }) => {
    if (!isOpen || !strategy) return null;
    
    const details = strategy.calculate ? strategy.calculate(stockData) : {};
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">{strategy.name}</h2>
                <p className="text-gray-400">{strategy.description}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Best For</div>
                <div className="font-semibold">{strategy.bestFor}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Market Bias</div>
                <div className="font-semibold capitalize">{strategy.bias}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Profit & Loss Analysis
              </h3>
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Profit:</span>
                  <span className="text-green-400 font-semibold">{details.maxProfit || strategy.maxProfit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Loss:</span>
                  <span className="text-red-400 font-semibold">{details.maxLoss || strategy.maxLoss}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Breakeven:</span>
                  <span className="font-semibold">{details.breakeven || 'At expiration'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Probability:</span>
                  <span className="text-blue-400 font-semibold">{details.profitProb || '50%'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                Greeks Profile
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(strategy.greeks).map(([greek, value]) => (
                  <div key={greek} className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400 uppercase mb-1">{greek}</div>
                    <div className={`font-bold ${value.includes('+') ? 'text-green-400' : value.includes('-') ? 'text-red-400' : 'text-gray-300'}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors">
                Build This Strategy
              </button>
              <button className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors">
                Paper Trade
              </button>
            </div>
            
            {details.special && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <p className="text-yellow-400 text-center font-semibold">{details.special}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
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
              Compare ({comparisonType === 'strategy' ? selectedStrategiesForComparison.length : comparedSymbols.length})
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

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Analyze Stock Options
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
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Analyze Options
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Quick Access:</span>
            {favorites.map(symbol => (
              <button
                key={symbol}
                onClick={() => {
                  setSearchInput(symbol);
                  setSelectedStock(symbol);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedStock === symbol 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

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
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Market Trend</div>
                <div className="text-lg font-bold capitalize">
                  {marketConditions?.trend || 'Neutral'}
                </div>
              </div>
            </div>
          </div>
        )}
        
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
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((strategy, index) => {
                const details = strategy.calculate ? strategy.calculate(stockData) : {};
                const is0DTE = strategy.type === '0dte';
                const isSelectedForComparison = selectedStrategiesForComparison.some(s => s.name === strategy.name);
                
                return (
                  <div
                    key={index}
                    className={`bg-gray-900 rounded-lg border ${
                      is0DTE ? 'border-yellow-600' : 
                      isSelectedForComparison ? 'border-purple-500' : 'border-gray-800'
                    } p-6 hover:border-purple-700 transition-all cursor-pointer relative`}
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    {compareMode && comparisonType === 'strategy' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStrategyForComparison(strategy);
                        }}
                        className={`absolute top-3 right-3 p-1 rounded transition-all ${
                          isSelectedForComparison 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {isSelectedForComparison ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    )}

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
                      {index === 0 && !isSelectedForComparison && (
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
      </div>
    </div>
    </div>
    </div>
    
    {/* Strategy Detail Modal */}
    <StrategyModal
      strategy={selectedStrategy}
      isOpen={!!selectedStrategy}
      onClose={() => setSelectedStrategy(null)}
    />
  </div>
  );
}
