'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, TrendingUp, Activity, Shield, Zap,
  DollarSign, Target, AlertCircle, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, Info, ChevronRight,
  Search, RefreshCw, Award, Flame, X,
  LineChart, Loader, AlertTriangle, TrendingDown, Clock, Wifi, WifiOff
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

// Helper to get next monthly expiry
const getNextExpiry = () => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  // Find third Friday of next month
  const firstDay = nextMonth.getDay();
  const firstFriday = firstDay <= 5 ? 5 - firstDay : 12 - firstDay;
  const thirdFriday = firstFriday + 14;
  nextMonth.setDate(thirdFriday);
  return nextMonth.toISOString().split('T')[0];
};

// Complete strategy definitions with calculations - INCLUDING 0DTE
const strategies = {
  // STANDARD STRATEGIES
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
  },
  // ADVANCED STRATEGIES
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
  // 0DTE STRATEGIES - Day Trading Power!
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
  zeroDTELongPut: {
    name: '0DTE Long Put',
    type: '0dte',
    bias: 'bearish',
    description: 'Intraday bearish play - puts expiring today',
    bestFor: 'Sharp intraday selloff expected',
    maxProfit: 'Strike - premium (until close)',
    maxLoss: 'Premium paid',
    riskReward: 'Very High Risk',
    greeks: { delta: '--', gamma: '+++', theta: '---', vega: '0' },
    calculate: (stockData) => {
      const putPremium = stockData.price * 0.003;
      const breakeven = stockData.price - putPremium;
      return {
        maxLoss: `$${(putPremium * 100).toFixed(2)}`,
        breakeven: `$${breakeven.toFixed(2)}`,
        delta: '-0.40-0.60',
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
  },
  zeroDTECallSpread: {
    name: '0DTE Call Spread',
    type: '0dte',
    bias: 'bullish',
    description: 'Defined risk bullish play expiring today',
    bestFor: 'Bullish but want to limit risk',
    maxProfit: 'Strike width - debit',
    maxLoss: 'Debit paid',
    riskReward: 'Defined Risk',
    greeks: { delta: '+', gamma: '0', theta: '--', vega: '0' },
    calculate: (stockData) => {
      const strikeWidth = 2.5;
      const debit = strikeWidth * 0.4;
      const maxProfit = strikeWidth - debit;
      return {
        maxProfit: `$${(maxProfit * 100).toFixed(2)}`,
        maxLoss: `$${(debit * 100).toFixed(2)}`,
        breakeven: `$${(stockData.price + debit).toFixed(2)}`,
        profitProb: '35%',
        special: '⏰ DAY TRADE ONLY!'
      };
    }
  },
  zeroDTEPutSpread: {
    name: '0DTE Put Spread',
    type: '0dte',
    bias: 'bearish',
    description: 'Defined risk bearish play expiring today',
    bestFor: 'Bearish but want to limit risk',
    maxProfit: 'Strike width - debit',
    maxLoss: 'Debit paid',
    riskReward: 'Defined Risk',
    greeks: { delta: '-', gamma: '0', theta: '--', vega: '0' },
    calculate: (stockData) => {
      const strikeWidth = 2.5;
      const debit = strikeWidth * 0.4;
      const maxProfit = strikeWidth - debit;
      return {
        maxProfit: `$${(maxProfit * 100).toFixed(2)}`,
        maxLoss: `$${(debit * 100).toFixed(2)}`,
        breakeven: `$${(stockData.price - debit).toFixed(2)}`,
        profitProb: '35%',
        special: '⏰ DAY TRADE ONLY!'
      };
    }
  }
};

// Enhanced recommendation generator with 0DTE
const generateRecommendations = (stockData, marketConditions, zeroDTEData) => {
  const recommendations = [];
  const ivRank = stockData?.ivRank || 50;
  const trend = marketConditions?.trend || 'neutral';
  const flowSentiment = marketConditions?.flowSentiment || 'neutral';
  const unusualOptions = marketConditions?.unusualOptions || 0;
  const movement = marketConditions?.movement || 'neutral';
  
  // 0DTE STRATEGIES - Highest Priority when available
  if (marketConditions?.has0DTE || zeroDTEData?.available) {
    // High volume 0DTE = momentum play
    if ((marketConditions?.zeroDTEVolume > 5000) || (zeroDTEData?.totalVolume > 5000)) {
      if (trend === 'bullish' || trend === 'strongly bullish') {
        recommendations.push({
          ...strategies.zeroDTELongCall,
          winRate: 35,
          priority: 1,
          reason: `⚡ 0DTE MOMENTUM! High volume (${marketConditions?.zeroDTEVolume || zeroDTEData?.totalVolume}) + Bullish = Quick gains possible`
        });
        
        recommendations.push({
          ...strategies.zeroDTECallSpread,
          winRate: 40,
          priority: 2,
          reason: '0DTE Call Spread - Defined risk for day trade'
        });
      } else if (trend === 'bearish' || trend === 'strongly bearish') {
        recommendations.push({
          ...strategies.zeroDTELongPut,
          winRate: 35,
          priority: 1,
          reason: `⚡ 0DTE BEARISH! High volume + Bearish trend = Quick profits on downside`
        });
        
        recommendations.push({
          ...strategies.zeroDTEPutSpread,
          winRate: 40,
          priority: 2,
          reason: '0DTE Put Spread - Defined risk bearish day trade'
        });
      }
    }
    
    // Stable price action = Iron Fly
    if (movement === 'stable' || Math.abs(stockData.changePercent || 0) < 0.5) {
      recommendations.push({
        ...strategies.zeroDTEIronFly,
        winRate: 68,
        priority: 1,
        reason: `🎯 0DTE PIN PLAY! Stock stable near $${stockData.price} - Collect maximum theta`
      });
    }
  }
  
  // JADE LIZARD - High IV + Bullish
  if (ivRank > 50 && (trend === 'bullish' || flowSentiment === 'bullish')) {
    recommendations.push({
      ...strategies.jadeLizard,
      winRate: 70 + Math.floor(Math.random() * 10),
      priority: recommendations.length + 1,
      reason: `🦎 JADE LIZARD SETUP! High IV (${ivRank}) + Bullish bias = No upside risk strategy!`
    });
  }
  
  // HIGH IV STRATEGIES (>70)
  if (ivRank > 70) {
    recommendations.push({ 
      ...strategies.ironCondor, 
      winRate: 75 + Math.floor(Math.random() * 10),
      priority: recommendations.length + 1,
      reason: `Very high IV Rank (${ivRank}) - Perfect for premium selling`
    });
    
    if (movement === 'stable') {
      recommendations.push({
        ...strategies.ironButterfly,
        winRate: 75 + Math.floor(Math.random() * 10),
        priority: recommendations.length + 1,
        reason: `Stable movement + High IV = Perfect Iron Butterfly setup`
      });
    }
  }
  // LOW IV STRATEGIES (<30)
  else if (ivRank < 30) {
    recommendations.push({
      ...strategies.calendarSpread,
      winRate: 60 + Math.floor(Math.random() * 10),
      priority: recommendations.length + 1,
      reason: `Low IV (${ivRank}) = Potential IV expansion with Calendar Spread`
    });
    
    if (trend === 'bullish') {
      recommendations.push({ 
        ...strategies.longCall, 
        winRate: 65 + Math.floor(Math.random() * 10),
        priority: recommendations.length + 1,
        reason: `Low IV (${ivRank}) makes calls cheap - bullish trend`
      });
    }
  }
  // MEDIUM IV STRATEGIES
  else {
    if (trend === 'bullish' || flowSentiment === 'bullish') {
      recommendations.push({ 
        ...strategies.bullPutSpread, 
        winRate: 68 + Math.floor(Math.random() * 10),
        priority: recommendations.length + 1,
        reason: `Bullish sentiment with moderate IV (${ivRank})`
      });
    } else if (trend === 'bearish' || flowSentiment === 'bearish') {
      recommendations.push({ 
        ...strategies.bearCallSpread, 
        winRate: 68 + Math.floor(Math.random() * 10),
        priority: recommendations.length + 1,
        reason: `Bearish sentiment with moderate IV (${ivRank})`
      });
    } else {
      recommendations.push({ 
        ...strategies.ironCondor, 
        winRate: 70 + Math.floor(Math.random() * 10),
        priority: recommendations.length + 1,
        reason: `Neutral market with moderate IV (${ivRank})`
      });
    }
  }
  
  // Ensure uniqueness and sort
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
  
  // Calculate specific strikes for strategies
  const calculateStrikes = (strategy) => {
    if (!stockData) return null;
    
    const price = stockData.price;
    const atmStrike = Math.round(price / 5) * 5;
    
    switch(strategy.name) {
      case 'Long Call':
      case '0DTE Long Call':
        return {
          primary: atmStrike,
          expiry: strategy.name.includes('0DTE') ? 'TODAY!' : '30-45 DTE',
          action: `Buy ${atmStrike} Call`,
          special: strategy.name.includes('0DTE') ? '⚡ EXPIRES TODAY!' : null
        };
        
      case 'Long Put':
      case '0DTE Long Put':
        return {
          primary: atmStrike,
          expiry: strategy.name.includes('0DTE') ? 'TODAY!' : '30-45 DTE',
          action: `Buy ${atmStrike} Put`,
          special: strategy.name.includes('0DTE') ? '⚡ EXPIRES TODAY!' : null
        };
        
      case '0DTE Call Spread':
        return {
          primary: atmStrike,
          secondary: atmStrike + 2.5,
          expiry: 'TODAY!',
          action: `Buy ${atmStrike} Call / Sell ${atmStrike + 2.5} Call`,
          special: '⏰ DAY TRADE ONLY!'
        };
        
      case '0DTE Put Spread':
        return {
          primary: atmStrike,
          secondary: atmStrike - 2.5,
          expiry: 'TODAY!',
          action: `Buy ${atmStrike} Put / Sell ${atmStrike - 2.5} Put`,
          special: '⏰ DAY TRADE ONLY!'
        };
        
      case '0DTE Iron Fly':
        return {
          primary: atmStrike,
          wingSpread: `${atmStrike - 5}/${atmStrike + 5}`,
          expiry: 'TODAY!',
          action: `Sell ${atmStrike} Call & Put / Buy ${atmStrike - 5} Put / Buy ${atmStrike + 5} Call`,
          special: '🔥 MAXIMUM THETA!'
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
        
      default:
        return {
          primary: atmStrike,
          expiry: '30-45 DTE',
          action: 'Custom strategy'
        };
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
              {recommendations.some(r => r.type === '0dte') && (
                <span className="text-sm bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
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
                  
                  <h3 className="font-medium mb-3 mt-4 text-gray-300">Greeks Profile</h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedStrategy.greeks).map(([greek, value]) => (
                        <div key={greek} className="flex justify-between">
                          <span className="text-gray-500 capitalize">{greek}:</span>
                          <span className={
                            value === '+' || value === '++' || value === '+++' ? 'text-green-400' :
                            value === '-' || value === '--' || value === '---' ? 'text-red-400' :
                            value === '0' ? 'text-gray-400' : ''
                          }>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Trade Builder Section */}
              <div className={`bg-gray-800 rounded-lg p-4 mb-6 ${
                selectedStrategy.type === '0dte' ? 'border-2 border-yellow-600' : ''
              }`}>
                <h3 className="font-medium mb-3 text-yellow-400">
                  📋 Specific Trade Setup
                  {selectedStrategy.type === '0dte' && ' - ⚡ EXPIRES TODAY!'}
                </h3>
                {(() => {
                  const strikes = calculateStrikes(selectedStrategy);
                  const details = selectedStrategy.calculate ? selectedStrategy.calculate(stockData) : {};
                  const positionSize = calculatePositionSize(selectedStrategy);
                  
                  return (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <strong className="text-gray-300">Action:</strong>
                        <p className="text-white mt-1 font-mono">{strikes?.action}</p>
                      </div>
                      <div className="text-sm">
                        <strong className="text-gray-300">Expiry:</strong> {strikes?.expiry}
                      </div>
                      <div className="text-sm">
                        <strong className="text-gray-300">Contracts:</strong> {positionSize.contracts}
                      </div>
                      {strikes?.special && (
                        <div className="text-sm text-center py-2 bg-yellow-900/20 rounded">
                          {strikes.special}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Risk Management */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-3 text-red-400">⚠️ Risk Management Rules</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Set stop loss at 50% of max loss</li>
                  <li>• Take profits at 50-75% of max profit</li>
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
                 
