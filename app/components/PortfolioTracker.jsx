'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Plus, Minus, Edit, Trash2, 
  DollarSign, Calendar, Target, AlertCircle, CheckCircle,
  BarChart3, PieChart, Activity, Settings, Filter,
  Eye, EyeOff, ArrowUpRight, ArrowDownRight, Clock,
  GitBranch, Layers, Zap, Shield, X, Save, RefreshCw
} from 'lucide-react';

// Trade Types
const TRADE_TYPES = {
  STOCK: 'stock',
  OPTION: 'option',
  SPREAD: 'spread'
};

const OPTION_TYPES = {
  CALL: 'call',
  PUT: 'put'
};

const SPREAD_TYPES = {
  BULL_CALL: 'bull_call_spread',
  BEAR_CALL: 'bear_call_spread',
  BULL_PUT: 'bull_put_spread',
  BEAR_PUT: 'bear_put_spread',
  IRON_CONDOR: 'iron_condor',
  IRON_BUTTERFLY: 'iron_butterfly',
  CALENDAR: 'calendar_spread',
  DIAGONAL: 'diagonal_spread',
  STRADDLE: 'straddle',
  STRANGLE: 'strangle',
  JADE_LIZARD: 'jade_lizard',
  BIG_LIZARD: 'big_lizard'
};

// Default portfolios data structure
const createDefaultPortfolio = () => ({
  id: Date.now().toString(),
  name: 'Main Portfolio',
  balance: 25000,
  trades: [],
  totalValue: 25000,
  totalPnL: 0,
  totalPnLPercent: 0,
  positions: {
    stocks: {},
    options: {},
    spreads: {}
  }
});

// Spread validation rules
const SPREAD_VALIDATION_RULES = {
  [SPREAD_TYPES.BULL_CALL]: {
    minLegs: 2,
    maxLegs: 2,
    requiredFields: ['symbol', 'longStrike', 'shortStrike', 'expiry', 'quantity'],
    validation: (data) => {
      const errors = [];
      if (!data.longStrike || !data.shortStrike) {
        errors.push('Both long and short strikes are required');
      }
      if (data.longStrike && data.shortStrike && parseFloat(data.longStrike) >= parseFloat(data.shortStrike)) {
        errors.push('Bull call spread requires long strike < short strike');
      }
      if (!data.expiry) {
        errors.push('Expiration date is required');
      }
      if (!data.quantity || parseInt(data.quantity) <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      return errors;
    }
  },
  [SPREAD_TYPES.BEAR_CALL]: {
    minLegs: 2,
    maxLegs: 2,
    requiredFields: ['symbol', 'longStrike', 'shortStrike', 'expiry', 'quantity'],
    validation: (data) => {
      const errors = [];
      if (!data.longStrike || !data.shortStrike) {
        errors.push('Both long and short strikes are required');
      }
      if (data.longStrike && data.shortStrike && parseFloat(data.longStrike) <= parseFloat(data.shortStrike)) {
        errors.push('Bear call spread requires long strike > short strike');
      }
      if (!data.expiry) {
        errors.push('Expiration date is required');
      }
      if (!data.quantity || parseInt(data.quantity) <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      return errors;
    }
  },
  [SPREAD_TYPES.BULL_PUT]: {
    minLegs: 2,
    maxLegs: 2,
    requiredFields: ['symbol', 'longStrike', 'shortStrike', 'expiry', 'quantity'],
    validation: (data) => {
      const errors = [];
      if (!data.longStrike || !data.shortStrike) {
        errors.push('Both long and short strikes are required');
      }
      if (data.longStrike && data.shortStrike && parseFloat(data.longStrike) >= parseFloat(data.shortStrike)) {
        errors.push('Bull put spread requires long strike < short strike');
      }
      if (!data.expiry) {
        errors.push('Expiration date is required');
      }
      if (!data.quantity || parseInt(data.quantity) <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      return errors;
    }
  },
  [SPREAD_TYPES.BEAR_PUT]: {
    minLegs: 2,
    maxLegs: 2,
    requiredFields: ['symbol', 'longStrike', 'shortStrike', 'expiry', 'quantity'],
    validation: (data) => {
      const errors = [];
      if (!data.longStrike || !data.shortStrike) {
        errors.push('Both long and short strikes are required');
      }
      if (data.longStrike && data.shortStrike && parseFloat(data.longStrike) <= parseFloat(data.shortStrike)) {
        errors.push('Bear put spread requires long strike > short strike');
      }
      if (!data.expiry) {
        errors.push('Expiration date is required');
      }
      if (!data.quantity || parseInt(data.quantity) <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      return errors;
    }
  },
  [SPREAD_TYPES.IRON_CONDOR]: {
    minLegs: 4,
    maxLegs: 4,
    requiredFields: ['symbol', 'putShortStrike', 'putLongStrike', 'callShortStrike', 'callLongStrike', 'expiry', 'quantity'],
    validation: (data) => {
      const errors = [];
      const { putLongStrike, putShortStrike, callShortStrike, callLongStrike } = data;
      
      if (!putLongStrike || !putShortStrike || !callShortStrike || !callLongStrike) {
        errors.push('All four strikes are required for iron condor');
      }
      
      if (putLongStrike && putShortStrike && parseFloat(putLongStrike) >= parseFloat(putShortStrike)) {
        errors.push('Put spread: long strike must be < short strike');
      }
      
      if (callShortStrike && callLongStrike && parseFloat(callShortStrike) >= parseFloat(callLongStrike)) {
        errors.push('Call spread: short strike must be < long strike');
      }
      
      if (putShortStrike && callShortStrike && parseFloat(putShortStrike) >= parseFloat(callShortStrike)) {
        errors.push('Put short strike must be < call short strike');
      }
      
      if (!data.expiry) {
        errors.push('Expiration date is required');
      }
      
      if (!data.quantity || parseInt(data.quantity) <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      
      return errors;
    }
  },
  [SPREAD_TYPES.JADE_LIZARD]: {
    minLegs: 3,
    maxLegs: 3,
    requiredFields: ['symbol', 'putShortStrike', 'callShortStrike', 'callLongStrike', 'expiry', 'quantity'],
    validation: (data) => {
      const errors = [];
      const { putShortStrike, callShortStrike, callLongStrike } = data;
      
      if (!putShortStrike || !callShortStrike || !callLongStrike) {
        errors.push('Put short strike, call short strike, and call long strike are required');
      }
      
      if (callShortStrike && callLongStrike && parseFloat(callShortStrike) >= parseFloat(callLongStrike)) {
        errors.push('Call short strike must be < call long strike');
      }
      
      if (!data.expiry) {
        errors.push('Expiration date is required');
      }
      
      if (!data.quantity || parseInt(data.quantity) <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      
      return errors;
    }
  }
};

// Portfolio Tracker Component
export default function PortfolioTracker({ isOpen, onClose, initialStrategy = null }) {
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(0);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeFormType, setTradeFormType] = useState(TRADE_TYPES.STOCK);
  const [editingTrade, setEditingTrade] = useState(null);
  const [formErrors, setFormErrors] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  // Trade form states
  const [tradeForm, setTradeForm] = useState({
    type: TRADE_TYPES.STOCK,
    symbol: '',
    side: 'buy', // buy/sell
    quantity: 1,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    
    // Option specific
    optionType: OPTION_TYPES.CALL,
    strike: 0,
    expiry: '',
    
    // Spread specific
    spreadType: SPREAD_TYPES.BULL_CALL,
    longStrike: 0,
    shortStrike: 0,
    putLongStrike: 0,
    putShortStrike: 0,
    callLongStrike: 0,
    callShortStrike: 0,
    
    // Premium and costs
    premium: 0,
    commission: 0.65,
    notes: ''
  });

  // Load portfolios from localStorage on mount
  useEffect(() => {
    const savedPortfolios = localStorage.getItem('portfolios');
    if (savedPortfolios) {
      try {
        const parsed = JSON.parse(savedPortfolios);
        setPortfolios(parsed);
      } catch (e) {
        console.error('Error parsing saved portfolios:', e);
        setPortfolios([createDefaultPortfolio()]);
      }
    } else {
      setPortfolios([createDefaultPortfolio()]);
    }
  }, []);

  // Save portfolios to localStorage whenever they change
  useEffect(() => {
    if (portfolios.length > 0) {
      localStorage.setItem('portfolios', JSON.stringify(portfolios));
    }
  }, [portfolios]);

  // Auto-fill form if initialStrategy is provided
  useEffect(() => {
    if (initialStrategy && showTradeForm) {
      const strategy = initialStrategy;
      const details = strategy.calculate ? strategy.calculate({ price: 100, atmStrike: 100 }) : {};
      
      if (strategy.type === 'spread') {
        setTradeForm(prev => ({
          ...prev,
          type: TRADE_TYPES.SPREAD,
          symbol: 'AAPL', // Default symbol
          spreadType: strategy.name.toLowerCase().replace(/\s+/g, '_'),
          quantity: 1,
          expiry: getDefaultExpiry(),
          longStrike: details.strike ? parseFloat(details.strike) : 100,
          shortStrike: details.strike ? parseFloat(details.strike) + 5 : 105
        }));
        setTradeFormType(TRADE_TYPES.SPREAD);
      } else if (strategy.bias === 'bullish' || strategy.bias === 'bearish') {
        setTradeForm(prev => ({
          ...prev,
          type: TRADE_TYPES.OPTION,
          symbol: 'AAPL',
          optionType: strategy.bias === 'bullish' ? OPTION_TYPES.CALL : OPTION_TYPES.PUT,
          strike: details.strike ? parseFloat(details.strike) : 100,
          expiry: getDefaultExpiry(),
          quantity: 1
        }));
        setTradeFormType(TRADE_TYPES.OPTION);
      }
    }
  }, [initialStrategy, showTradeForm]);

  const getDefaultExpiry = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toISOString().split('T')[0];
  };

  const validateTradeForm = () => {
    const errors = [];
    
    if (!tradeForm.symbol.trim()) {
      errors.push('Symbol is required');
    }

    if (tradeForm.type === TRADE_TYPES.SPREAD) {
      const spreadRule = SPREAD_VALIDATION_RULES[tradeForm.spreadType];
      if (spreadRule && spreadRule.validation) {
        const spreadErrors = spreadRule.validation(tradeForm);
        errors.push(...spreadErrors);
      }
    } else if (tradeForm.type === TRADE_TYPES.OPTION) {
      if (!tradeForm.strike || parseFloat(tradeForm.strike) <= 0) {
        errors.push('Strike price must be greater than 0');
      }
      if (!tradeForm.expiry) {
        errors.push('Expiration date is required');
      }
    } else if (tradeForm.type === TRADE_TYPES.STOCK) {
      if (!tradeForm.price || parseFloat(tradeForm.price) <= 0) {
        errors.push('Stock price must be greater than 0');
      }
    }

    if (!tradeForm.quantity || parseInt(tradeForm.quantity) <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    return errors;
  };

  const handleAddTrade = () => {
    const errors = validateTradeForm();
    
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const newTrade = {
      id: Date.now().toString(),
      ...tradeForm,
      timestamp: new Date().toISOString(),
      portfolioId: portfolios[activePortfolio].id
    };

    setPortfolios(prev => {
      const updated = [...prev];
      updated[activePortfolio].trades.push(newTrade);
      return updated;
    });

    // Reset form
    setTradeForm({
      type: TRADE_TYPES.STOCK,
      symbol: '',
      side: 'buy',
      quantity: 1,
      price: 0,
      date: new Date().toISOString().split('T')[0],
      optionType: OPTION_TYPES.CALL,
      strike: 0,
      expiry: '',
      spreadType: SPREAD_TYPES.BULL_CALL,
      longStrike: 0,
      shortStrike: 0,
      putLongStrike: 0,
      putShortStrike: 0,
      callLongStrike: 0,
      callShortStrike: 0,
      premium: 0,
      commission: 0.65,
      notes: ''
    });
    
    setFormErrors([]);
    setShowTradeForm(false);
  };

  const handleEditTrade = (trade) => {
    setEditingTrade(trade);
    setTradeForm({ ...trade });
    setTradeFormType(trade.type);
    setShowTradeForm(true);
  };

  const handleDeleteTrade = (tradeId) => {
    setPortfolios(prev => {
      const updated = [...prev];
      updated[activePortfolio].trades = updated[activePortfolio].trades.filter(t => t.id !== tradeId);
      return updated;
    });
  };

  const getTradeDisplayName = (trade) => {
    switch (trade.type) {
      case TRADE_TYPES.STOCK:
        return `${trade.symbol} Stock`;
      case TRADE_TYPES.OPTION:
        return `${trade.symbol} ${trade.strike}${trade.optionType.charAt(0).toUpperCase()} ${new Date(trade.expiry).toLocaleDateString()}`;
      case TRADE_TYPES.SPREAD:
        return `${trade.symbol} ${trade.spreadType.replace(/_/g, ' ').toUpperCase()}`;
      default:
        return 'Unknown Trade';
    }
  };

  const getCurrentPortfolio = () => portfolios[activePortfolio] || createDefaultPortfolio();

  const renderTradeForm = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {editingTrade ? 'Edit Trade' : 'Add New Trade'}
            </h2>
            <button
              onClick={() => {
                setShowTradeForm(false);
                setEditingTrade(null);
                setFormErrors([]);
              }}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Form Errors */}
          {formErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
              <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Please fix the following errors:
              </h3>
              <ul className="space-y-1">
                {formErrors.map((error, index) => (
                  <li key={index} className="text-red-300 text-sm">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trade Type Selection */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.values(TRADE_TYPES).map(type => (
              <button
                key={type}
                onClick={() => {
                  setTradeFormType(type);
                  setTradeForm(prev => ({ ...prev, type }));
                }}
                className={`p-4 rounded-lg border transition-all ${
                  tradeFormType === type
                    ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold capitalize">
                    {type.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {type === TRADE_TYPES.STOCK && 'Equity positions'}
                    {type === TRADE_TYPES.OPTION && 'Single options'}
                    {type === TRADE_TYPES.SPREAD && 'Multi-leg strategies'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Basic Trade Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Symbol</label>
              <input
                type="text"
                value={tradeForm.symbol}
                onChange={(e) => setTradeForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                placeholder="AAPL"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Side</label>
              <select
                value={tradeForm.side}
                onChange={(e) => setTradeForm(prev => ({ ...prev, side: e.target.value }))}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Quantity</label>
              <input
                type="number"
                value={tradeForm.quantity}
                onChange={(e) => setTradeForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Date</label>
              <input
                type="date"
                value={tradeForm.date}
                onChange={(e) => setTradeForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {tradeFormType === TRADE_TYPES.STOCK && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Price per Share</label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeForm.price}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  placeholder="150.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Commission</label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeForm.commission}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                />
              </div>
            </div>
          )}

          {tradeFormType === TRADE_TYPES.OPTION && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Option Type</label>
                <select
                  value={tradeForm.optionType}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, optionType: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                >
                  <option value={OPTION_TYPES.CALL}>Call</option>
                  <option value={OPTION_TYPES.PUT}>Put</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Strike Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeForm.strike}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, strike: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  placeholder="150.00"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Expiration</label>
                <input
                  type="date"
                  value={tradeForm.expiry}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, expiry: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Premium per Contract</label>
                <input
                  type="number"
                  step="0.01"
                  value={tradeForm.premium}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, premium: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  placeholder="2.50"
                />
              </div>
            </div>
          )}

          {tradeFormType === TRADE_TYPES.SPREAD && (
            <div className="space-y-6">
              {/* Spread Type Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Spread Strategy</label>
                <select
                  value={tradeForm.spreadType}
                  onChange={(e) => setTradeForm(prev => ({ ...prev, spreadType: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                >
                  {Object.entries(SPREAD_TYPES).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Spread-specific inputs based on selected type */}
              {(tradeForm.spreadType === SPREAD_TYPES.BULL_CALL || 
                tradeForm.spreadType === SPREAD_TYPES.BEAR_CALL ||
                tradeForm.spreadType === SPREAD_TYPES.BULL_PUT ||
                tradeForm.spreadType === SPREAD_TYPES.BEAR_PUT) && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Long Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.longStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, longStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                      placeholder="150.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Short Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.shortStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, shortStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                      placeholder="155.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Expiration</label>
                    <input
                      type="date"
                      value={tradeForm.expiry}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, expiry: e.target.value }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {tradeForm.spreadType === SPREAD_TYPES.IRON_CONDOR && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Put Long Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.putLongStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, putLongStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Put Short Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.putShortStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, putShortStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Call Short Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.callShortStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, callShortStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Call Long Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.callLongStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, callLongStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <label className="block text-sm text-gray-400 mb-2">Expiration</label>
                    <input
                      type="date"
                      value={tradeForm.expiry}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, expiry: e.target.value }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {tradeForm.spreadType === SPREAD_TYPES.JADE_LIZARD && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Put Short Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.putShortStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, putShortStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Call Short Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.callShortStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, callShortStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Call Long Strike</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeForm.callLongStrike}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, callLongStrike: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Expiration</label>
                    <input
                      type="date"
                      value={tradeForm.expiry}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, expiry: e.target.value }))}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Net Premium</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tradeForm.premium}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, premium: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                    placeholder="1.50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Commission</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tradeForm.commission}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Notes (Optional)</label>
            <textarea
              value={tradeForm.notes}
              onChange={(e) => setTradeForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg"
              rows="3"
              placeholder="Trade reasoning, setup conditions, etc..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddTrade}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {editingTrade ? 'Update Trade' : 'Add Trade'}
            </button>
            <button
              onClick={() => {
                setShowTradeForm(false);
                setEditingTrade(null);
                setFormErrors([]);
              }}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  const currentPortfolio = getCurrentPortfolio();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-500" />
                Portfolio Tracker
              </h2>
              <p className="text-gray-400">Manage your options trades and track performance</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTradeForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Trade
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="p-6 border-b border-gray-800 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Portfolio Value</div>
              <div className="text-2xl font-bold text-green-400">
                ${currentPortfolio.totalValue?.toLocaleString() || '25,000'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total P&L</div>
              <div className={`text-2xl font-bold ${currentPortfolio.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${currentPortfolio.totalPnL?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Active Trades</div>
              <div className="text-2xl font-bold">
                {currentPortfolio.trades?.length || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-blue-400">
                {currentPortfolio.trades?.length > 0 ? '68%' : '0%'}
              </div>
            </div>
          </div>
        </div>

        {/* Trades List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentPortfolio.trades?.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {currentPortfolio.trades.map(trade => (
                  <div key={trade.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {getTradeDisplayName(trade)}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.side === 'buy' 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-red-600/20 text-red-400'
                          }`}>
                            {trade.side.toUpperCase()}
                          </span>
                          {trade.type === TRADE_TYPES.SPREAD && (
                            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-semibold">
                              SPREAD
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Quantity:</span>
                            <span className="ml-2 font-medium">{trade.quantity}</span>
                          </div>
                          {trade.type !== TRADE_TYPES.SPREAD && (
                            <div>
                              <span className="text-gray-400">
                                {trade.type === TRADE_TYPES.STOCK ? 'Price:' : 'Premium:'}
                              </span>
                              <span className="ml-2 font-medium">
                                ${(trade.price || trade.premium)?.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-400">Date:</span>
                            <span className="ml-2 font-medium">
                              {new Date(trade.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">P&L:</span>
                            <span className="ml-2 font-medium text-green-400">
                              +$250.00 (12%)
                            </span>
                          </div>
                        </div>
                        {trade.notes && (
                          <div className="mt-2 text-sm text-gray-400">
                            <span className="font-medium">Notes:</span> {trade.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditTrade(trade)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No trades yet</h3>
                <p className="text-gray-400 mb-4">Start tracking your options trades and strategies</p>
                <button
                  onClick={() => setShowTradeForm(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Trade
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Form Modal */}
      {showTradeForm && renderTradeForm()}
    </div>
  );
}