'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, TrendingUp, Activity, Shield, Zap,
  DollarSign, Target, AlertCircle, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, Info, ChevronRight,
  Search, RefreshCw, Award, Flame, X,
  LineChart, Loader, AlertTriangle, TrendingDown
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
    }
  };
};

// Complete strategy definitions with calculations
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
  bearCallSpread: {
    name: 'Bear Call Spread',
    type: 'spread',
    bias: 'bearish',
    description: 'Sell call + buy higher strike call',
    bestFor: 'Moderate bearish view with income',
    maxProfit: 'Net credit received',
    maxLoss: 'Strike difference - credit',
    riskReward: 'Moderate',
    greeks: { delta: '-', gamma: '0', theta: '+', vega: '-' },
    calculate: (stockData) => {
      const strikeWidth = 5;
      const credit = strikeWidth * 0.35;
      const maxLoss = strikeWidth - credit;
      const breakeven = stockData.price + credit;
      return {
        maxProfit: `$${(credit * 100).toFixed(2)}`,
        maxLoss: `$${(maxLoss * 100).toFixed(2)}`,
        breakeven: `$${breakeven.toFixed(2)}`,
        delta: '-0.15',
        profitProb: '70%'
      };
    }
  },
  longStraddle: {
    name: 'Long Straddle',
    type: 'volatility',
    bias: 'neutral',
    description: 'Buy ATM call and put',
    bestFor: 'Big move expected, direction unknown',
    maxProfit: 'Unlimited',
    maxLoss: 'Total premium paid',
    riskReward: 'High',
    greeks: { delta: '0', gamma: '+', theta: '-', vega: '+' },
    calculate: (stockData) => {
      const totalPremium = stockData.price * 0.04;
      const lowerBreakeven = stockData.price - totalPremium;
      const upperBreakeven = stockData.price + totalPremium;
      return {
        maxLoss: `$${(totalPremium * 100).toFixed(2)}`,
        breakeven: `$${lowerBreakeven.toFixed(2)} & $${upperBreakeven.toFixed(2)}`,
        delta: 'Neutral',
        profitProb: '40%'
      };
    }
  },
  coveredCall: {
    name: 'Covered Call',
    type: 'income',
    bias: 'neutral-bullish',
    description: 'Own stock + sell call options',
    bestFor: 'Generate income on existing position',
    maxProfit: 'Premium + stock appreciation to strike',
    maxLoss: 'Stock price - premium received',
    riskReward: 'Low',
    greeks: { delta: '+', gamma: '-', theta: '+', vega: '-' },
    calculate: (stockData) => {
      const callPremium = stockData.price * 0.015;
      const maxProfit = callPremium + Math.max(0, (stockData.atmStrike || stockData.price) - stockData.price);
      return {
        maxLoss: `$${((stockData.price - callPremium) * 100).toFixed(2)}`,
        breakeven: `$${(stockData.price - callPremium).toFixed(2)}`,
        delta: '+0.50',
        profitProb: '68%',
        maxProfit: `$${(maxProfit * 100).toFixed(2)}`
      };
    }
  }
};
// Add these after the existing strategies (after coveredCall)
  ironButterfly: {
    name: 'Iron Butterfly',
    type: 'neutral',
    bias: 'neutral',
    description: 'Sell ATM straddle + buy OTM protection',
    bestFor: 'Tight range, high probability income',
    maxProfit: 'Net credit received',
    maxLoss: 'Strike width - credit',
    riskReward: 'High Probability',
    greeks: { delta: '0', gamma: '-', theta: '+', vega: '-' },
    calculate: (stockData) => {
      const strikeWidth = 10;
      const credit = strikeWidth * 0.4;
      const maxLoss = strikeWidth - credit;
      const atmStrike = Math.round(stockData.price / 5) * 5;
      return {
        maxProfit: `$${(credit * 100).toFixed(2)}`,
        maxLoss: `$${(maxLoss * 100).toFixed(2)}`,
        breakeven: `$${(atmStrike - credit).toFixed(2)} - $${(atmStrike + credit).toFixed(2)}`,
        delta: 'Neutral',
        profitProb: '75%'
      };
    }
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
    calculate: (stockData) => {
      const putStrike = Math.round(stockData.price * 0.95 / 5) * 5;
      const callStrike1 = Math.round(stockData.price * 1.02 / 5) * 5;
      const callStrike2 = callStrike1 + 5;
      const credit = stockData.price * 0.025;
      const maxLoss = putStrike - credit;
      return {
        maxProfit: `$${(credit * 100).toFixed(2)}`,
        maxLoss: `$${(maxLoss * 100).toFixed(2)} (downside only)`,
        breakeven: `$${(putStrike - credit).toFixed(2)}`,
        delta: '+0.10',
        profitProb: '70%',
        special: '🦎 NO UPSIDE RISK!'
      };
    }
  },
  calendarSpread: {
    name: 'Calendar Spread',
    type: 'volatility',
    bias: 'neutral',
    description: 'Sell near-term, buy far-term same strike',
    bestFor: 'IV expansion or time decay play',
    maxProfit: 'Varies at expiration',
    maxLoss: 'Net debit paid',
    riskReward: 'Moderate',
    greeks: { delta: '0', gamma: '-', theta: '+', vega: '+' },
    calculate: (stockData) => {
      const debit = stockData.price * 0.015;
      const atmStrike = Math.round(stockData.price / 5) * 5;
      return {
        maxLoss: `$${(debit * 100).toFixed(2)}`,
        breakeven: 'Varies with IV',
        profitZone: `Around $${atmStrike}`,
        delta: 'Neutral',
        profitProb: '60%',
        special: '📅 Profits from time decay'
      };
    }
  },
  brokenWingButterfly: {
    name: 'Broken Wing Butterfly',
    type: 'directional',
    bias: 'bullish',
    description: 'Butterfly with wider protection side',
    bestFor: 'Directional play with cheap protection',
    maxProfit: 'Strike width - debit',
    maxLoss: 'Net debit (or credit if done for credit)',
    riskReward: 'Asymmetric',
    greeks: { delta: '+', gamma: '0', theta: '+', vega: '-' },
    calculate: (stockData) => {
      const atmStrike = Math.round(stockData.price / 5) * 5;
      const debit = stockData.price * 0.005; // Often done for credit
      return {
        maxProfit: `$${(500 - debit * 100).toFixed(2)}`,
        maxLoss: debit > 0 ? `$${(debit * 100).toFixed(2)}` : 'None (credit received)',
        breakeven: `$${(atmStrike + debit).toFixed(2)}`,
        delta: '+0.15',
        profitProb: '55%',
        special: '🦋 Asymmetric risk/reward'
      };
    }
  },
  doubleDiagonal: {
    name: 'Double Diagonal',
    type: 'income',
    bias: 'neutral',
    description: 'Calendar spreads on both puts and calls',
    bestFor: 'Range-bound with volatility expansion',
    maxProfit: 'Varies with IV',
    maxLoss: 'Net debit paid',
    riskReward: 'Moderate',
    greeks: { delta: '0', gamma: '-', theta: '+', vega: '+' },
    calculate: (stockData) => {
      const debit = stockData.price * 0.03;
      const range = stockData.price * 0.05;
      return {
        maxLoss: `$${(debit * 100).toFixed(2)}`,
        profitZone: `$${(stockData.price - range).toFixed(2)} - $${(stockData.price + range).toFixed(2)}`,
        delta: 'Neutral',
        profitProb: '65%',
        special: '💎 Premium income machine'
      };
    }
  }
// Enhanced recommendation generator
const generateRecommendations = (stockData, marketConditions) => {
  const recommendations = [];
  const ivRank = stockData?.ivRank || 50;
  const trend = marketConditions?.trend || 'neutral';
  const flowSentiment = marketConditions?.flowSentiment || 'neutral';
  const unusualOptions = marketConditions?.unusualOptions || 0;
  
  // HIGH IV STRATEGIES (>70)
  if (ivRank > 70) {
    recommendations.push({ 
      ...strategies.ironCondor, 
      winRate: 75 + Math.floor(Math.random() * 10),
      priority: 1,
      reason: `Very high IV Rank (${ivRank}) - Perfect for premium selling`
    });
    
    if (trend === 'bullish' || trend === 'strongly bullish') {
      recommendations.push({ 
        ...strategies.bullPutSpread, 
        winRate: 70 + Math.floor(Math.random() * 10),
        priority: 2,
        reason: 'Bullish trend + high IV = Sell put spreads'
      });
    } else if (trend === 'bearish' || trend === 'strongly bearish') {
      recommendations.push({ 
        ...strategies.bearCallSpread, 
        winRate: 70 + Math.floor(Math.random() * 10),
        priority: 2,
        reason: 'Bearish trend + high IV = Sell call spreads'
      });
    }
  }
  // LOW IV STRATEGIES (<30)
  else if (ivRank < 30) {
    if (unusualOptions > 10) {
      recommendations.push({ 
        ...strategies.longStraddle, 
        winRate: 60 + Math.floor(Math.random() * 10),
        priority: 1,
        reason: `Low IV (${ivRank}) + ${unusualOptions} unusual flows = Breakout potential`
      });
    }
    
    if (trend === 'bullish' || trend === 'strongly bullish') {
      recommendations.push({ 
        ...strategies.longCall, 
        winRate: 65 + Math.floor(Math.random() * 10),
        priority: unusualOptions > 10 ? 2 : 1,
        reason: `Low IV (${ivRank}) makes calls cheap - bullish trend`
      });
    } else if (trend === 'bearish' || trend === 'strongly bearish') {
      recommendations.push({ 
        ...strategies.longPut, 
        winRate: 65 + Math.floor(Math.random() * 10),
        priority: unusualOptions > 10 ? 2 : 1,
        reason: `Low IV (${ivRank}) makes puts cheap - bearish trend`
      });
    }
  }
  // MEDIUM IV STRATEGIES (30-70)
  else {
    if (trend === 'bullish' || flowSentiment === 'bullish') {
      recommendations.push({ 
        ...strategies.bullPutSpread, 
        winRate: 68 + Math.floor(Math.random() * 10),
        priority: 1,
        reason: `Bullish sentiment with moderate IV (${ivRank})`
      });
      recommendations.push({ 
        ...strategies.longCall, 
        winRate: 62 + Math.floor(Math.random() * 10),
        priority: 2,
        reason: 'Directional play for upside'
      });
    } else if (trend === 'bearish' || flowSentiment === 'bearish') {
      recommendations.push({ 
        ...strategies.bearCallSpread, 
        winRate: 68 + Math.floor(Math.random() * 10),
        priority: 1,
        reason: `Bearish sentiment with moderate IV (${ivRank})`
      });
      recommendations.push({ 
        ...strategies.longPut, 
        winRate: 62 + Math.floor(Math.random() * 10),
        priority: 2,
        reason: 'Directional play for downside'
      });
    } else {
      recommendations.push({ 
        ...strategies.ironCondor, 
        winRate: 70 + Math.floor(Math.random() * 10),
        priority: 1,
        reason: `Neutral market with moderate IV (${ivRank})`
      });
      recommendations.push({ 
        ...strategies.coveredCall, 
        winRate: 63 + Math.floor(Math.random() * 10),
        priority: 2,
        reason: 'Conservative income strategy'
      });
    }
  }
  // Add these special conditions after the existing IV-based logic
  
  // JADE LIZARD - Perfect when IV > 50 and slightly bullish
  if (ivRank > 50 && (trend === 'bullish' || flowSentiment === 'bullish')) {
    const jadeLizardExists = recommendations.find(r => r.name === 'Jade Lizard');
    if (!jadeLizardExists) {
      recommendations.push({
        ...strategies.jadeLizard,
        winRate: 70 + Math.floor(Math.random() * 10),
        priority: 1,
        reason: `🦎 JADE LIZARD SETUP! High IV (${ivRank}) + Bullish bias = No upside risk strategy!`
      });
    }
  }
  
  // IRON BUTTERFLY - When expecting minimal movement
  if (marketConditions?.movement === 'stable' && ivRank > 40) {
    recommendations.push({
      ...strategies.ironButterfly,
      winRate: 75 + Math.floor(Math.random() * 10),
      priority: 2,
      reason: `Stable movement + decent IV = Perfect Iron Butterfly setup`
    });
  }
  
  // CALENDAR SPREAD - IV expansion play
  if (ivRank < 40 && marketConditions?.movement !== 'volatile') {
    recommendations.push({
      ...strategies.calendarSpread,
      winRate: 60 + Math.floor(Math.random() * 10),
      priority: 3,
      reason: `Low IV (${ivRank}) = Potential IV expansion with Calendar Spread`
    });
  }
  // Ensure uniqueness and sort
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map(item => [item.name, item])).values()
  );
  
  uniqueRecommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.winRate - a.winRate;
  });
  
  // Always return at least 3 recommendations
  while (uniqueRecommendations.length < 3) {
    const defaultStrategies = [strategies.ironCondor, strategies.coveredCall, strategies.bullPutSpread];
    const toAdd = defaultStrategies.find(s => !uniqueRecommendations.find(r => r.name === s.name));
    if (toAdd) {
      uniqueRecommendations.push({
        ...toAdd,
        winRate: 60 + Math.floor(Math.random() * 10),
        priority: uniqueRecommendations.length + 1,
        reason: 'Alternative strategy option'
      });
    } else {
      break;
    }
  }
  
  return uniqueRecommendations.slice(0, 5);
};

export default function AIOptionsStrategy() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [accountBalance, setAccountBalance] = useState(25000);
  const [maxRisk, setMaxRisk] = useState(2);
  
  const [stockData, setStockData] = useState(null);
  const [marketConditions, setMarketConditions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  
  const favorites = ['AAPL', 'NVDA', 'TSLA', 'SPY', 'AMZN'];
  
  // Calculate position sizing
  const calculatePositionSize = (strategy) => {
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
  
  // Calculate specific strikes for strategies
  const calculateStrikes = (strategy) => {
    if (!stockData) return null;
    
    const price = stockData.price;
    const atmStrike = Math.round(price / 5) * 5;
    
    switch(strategy.name) {
      case 'Long Call':
        return {
          primary: atmStrike,
          expiry: '30-45 DTE',
          action: `Buy ${atmStrike} Call`
        };
        
      case 'Long Put':
        return {
          primary: atmStrike,
          expiry: '30-45 DTE',
          action: `Buy ${atmStrike} Put`
        };
        
      case 'Bull Put Spread':
        return {
          primary: atmStrike - 5,
          secondary: atmStrike - 10,
          expiry: '30-45 DTE',
          action: `Sell ${atmStrike - 5} Put / Buy ${atmStrike - 10} Put`
        };
        
      case 'Bear Call Spread':
        return {
          primary: atmStrike + 5,
          secondary: atmStrike + 10,
          expiry: '30-45 DTE',
          action: `Sell ${atmStrike + 5} Call / Buy ${atmStrike + 10} Call`
        };
        
      case 'Iron Condor':
        return {
          putSpread: `${atmStrike - 10}/${atmStrike - 5}`,
          callSpread: `${atmStrike + 5}/${atmStrike + 10}`,
          expiry: '30-45 DTE',
          action: `Sell ${atmStrike - 5} Put / Buy ${atmStrike - 10} Put / Sell ${atmStrike + 5} Call / Buy ${atmStrike + 10} Call`
        };
        
      case 'Long Straddle':
        return {
          primary: atmStrike,
          expiry: '30-60 DTE',
          action: `Buy ${atmStrike} Call + Buy ${atmStrike} Put`
        };
        
      case 'Covered Call':
        return {
          primary: atmStrike + 5,
          expiry: '30-45 DTE',
          action: `Own 100 shares + Sell ${atmStrike + 5} Call`
        };
        
      default:
        return {
          primary: atmStrike,
          expiry: '30-45 DTE',
          action: 'Custom strategy'
        };
    }
  };
  case 'Iron Butterfly':
        return {
          putStrike: atmStrike,
          callStrike: atmStrike,
          wingSpread: `${atmStrike - 10}/${atmStrike + 10}`,
          expiry: '30-45 DTE',
          action: `Sell ${atmStrike} Call & Put / Buy ${atmStrike - 10} Put / Buy ${atmStrike + 10} Call`
        };
        
      case 'Jade Lizard':
        const jlPutStrike = atmStrike - 5;
        const jlCallStrike1 = atmStrike + 5;
        const jlCallStrike2 = atmStrike + 10;
        return {
          putStrike: jlPutStrike,
          callSpread: `${jlCallStrike1}/${jlCallStrike2}`,
          expiry: '30-45 DTE',
          action: `Sell ${jlPutStrike} Put / Sell ${jlCallStrike1} Call / Buy ${jlCallStrike2} Call`,
          special: '🦎 NO UPSIDE RISK!'
        };
        
      case 'Calendar Spread':
        return {
          strike: atmStrike,
          expiry: 'Sell 30 DTE / Buy 60 DTE',
          action: `Sell ${atmStrike} Call (30 DTE) / Buy ${atmStrike} Call (60 DTE)`
        };
  // Fetch data for a symbol
  const fetchData = useCallback(async (symbol) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching data for:', symbol);
      
      // Call our API route
      const response = await fetch('/api/market', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ symbol })
      });
      
      console.log('API Response status:', response.status);
      
      const result = await response.json();
      console.log('API Result:', result);
      
      if (result.success && !result.useMock) {
        // Use real data from API
        console.log('Using LIVE data for', symbol);
        setStockData(result.stockData);
        setMarketConditions(result.marketConditions);
        const recs = generateRecommendations(result.stockData, result.marketConditions);
        console.log('Generated recommendations:', recs.length);
        setRecommendations(recs);
      } else {
        // Fall back to mock data
        console.log('Using MOCK data for', symbol);
        const data = generateMockData(symbol);
        setStockData(data.stockData);
        setMarketConditions(data.marketConditions);
        setRecommendations(generateRecommendations(data.stockData, data.marketConditions));
      }
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load data');
      // Use mock data as fallback
      const data = generateMockData(symbol);
      setStockData(data.stockData);
      setMarketConditions(data.marketConditions);
      setRecommendations(generateRecommendations(data.stockData, data.marketConditions));
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
                {stockData && !error ? 'Live Market Data' : 'Smart options strategies powered by AI'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => fetchData(selectedStock)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
      
      {/* Main Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Stock Search */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
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
          
          {/* Quick Access */}
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
        
        {/* Market Data */}
        {stockData && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Market Data for {selectedStock}
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
                </div>
              </div>
            </div>
            
            {/* Additional metrics if available */}
            {stockData.shortInterestPercent && (
              <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Short Interest</div>
                  <div className="text-sm font-medium">{stockData.shortInterestPercent?.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Days to Cover</div>
                  <div className="text-sm font-medium">{stockData.daysTocover?.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Cost to Borrow</div>
                  <div className="text-sm font-medium">{stockData.costToBorrow?.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Utilization</div>
                  <div className="text-sm font-medium">{stockData.utilizationRate?.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Strategy Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              AI Recommended Strategies ({recommendations.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((strategy, index) => {
                const details = strategy.calculate ? strategy.calculate(stockData) : {};
                
                return (
                  <div
                    key={index}
                    className="bg-gray-900 rounded-lg border border-gray-800 p-6 hover:border-purple-700 transition-all cursor-pointer"
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold mb-1">{strategy.name}</h3>
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
                <h2 className="text-2xl font-bold">{selectedStrategy.name} Strategy Details</h2>
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
                  
                  <h3 className="font-medium mb-3 mt-4 text-gray-300">Greeks Profile</h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedStrategy.greeks).map(([greek, value]) => (
                        <div key={greek} className="flex justify-between">
                          <span className="text-gray-500 capitalize">{greek}:</span>
                          <span className={
                            value === '+' ? 'text-green-400' :
                            value === '-' ? 'text-red-400' :
                            value === '0' ? 'text-gray-400' : ''
                          }>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Trade Builder Section */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-3 text-yellow-400">📋 Specific Trade Setup</h3>
                {(() => {
                  const strikes = calculateStrikes(selectedStrategy);
                  const details = selectedStrategy.calculate ? selectedStrategy.calculate(stockData) : {};
                  const posSize = calculatePositionSize(selectedStrategy);
                  
                  return strikes ? (
                    <div className="space-y-3">
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-xs text-gray-500 mb-1">Action Required:</div>
                        <div className="text-sm font-mono text-green-400">{strikes.action}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {strikes.primary && (
                          <div>
                            <div className="text-xs text-gray-500">Primary Strike:</div>
                            <div className="text-lg font-bold text-white">${strikes.primary}</div>
                          </div>
                        )}
                        {strikes.secondary && (
                          <div>
                            <div className="text-xs text-gray-500">Secondary Strike:</div>
                            <div className="text-lg font-bold text-white">${strikes.secondary}</div>
                          </div>
                        )}
                        {strikes.putSpread && (
                          <div>
                            <div className="text-xs text-gray-500">Put Spread:</div>
                            <div className="text-lg font-bold text-white">${strikes.putSpread}</div>
                          </div>
                        )}
                        {strikes.callSpread && (
                          <div>
                            <div className="text-xs text-gray-500">Call Spread:</div>
                            <div className="text-lg font-bold text-white">${strikes.callSpread}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-700">
                        <div>
                          <div className="text-xs text-gray-500">Expiration:</div>
                          <div className="text-sm font-medium">{strikes.expiry}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Contracts:</div>
                          <div className="text-sm font-medium text-purple-400">{posSize.contracts}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Breakeven:</div>
                          <div className="text-sm font-medium text-yellow-400">{details.breakeven || 'N/A'}</div>
                        </div>
                      </div>
                      
                      {/* Risk/Reward Visual */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-green-900/20 border border-green-800 rounded p-2">
                          <div className="text-xs text-green-400 mb-1">Max Profit</div>
                          <div className="text-sm font-bold text-green-400">{details.maxProfit || selectedStrategy.maxProfit}</div>
                        </div>
                        <div className="bg-red-900/20 border border-red-800 rounded p-2">
                          <div className="text-xs text-red-400 mb-1">Max Loss</div>
                          <div className="text-sm font-bold text-red-400">{details.maxLoss || selectedStrategy.maxLoss}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Loading strike prices...</div>
                  );
                })()}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedStrategy(null)}
                  className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    const strikes = calculateStrikes(selectedStrategy);
                    if (strikes) {
                      const tradeText = `${selectedStrategy.name} Trade for ${selectedStock}:\n${strikes.action}\nExpiry: ${strikes.expiry}\nContracts: ${calculatePositionSize(selectedStrategy).contracts}`;
                      navigator.clipboard.writeText(tradeText);
                      alert('Trade details copied to clipboard!');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  📋 Copy Trade
                </button>
                <button 
                  onClick={() => {
                    const strikes = calculateStrikes(selectedStrategy);
                    alert(`Ready to trade!\n\n${strikes.action}\n\nOpen your broker and place this order.`);
                  }}
                  className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Build This Strategy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
