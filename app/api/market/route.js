// app/api/market/route.js
import { NextResponse } from 'next/server';

// API Keys from environment variables
const API_KEYS = {
  polygon: process.env.POLYGON_API_KEY,
  unusualWhales: process.env.UNUSUAL_WHALES_API_KEY,
  ortex: process.env.ORTEX_API_KEY,
  fmp: process.env.FMP_API_KEY,
  twelveData: process.env.TWELVE_DATA_API_KEY,
  alphaVantage: process.env.ALPHA_VANTAGE_API_KEY
};

// Cache for API responses (to avoid rate limits)
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

function getCacheKey(symbol, dataType) {
  return `${symbol}_${dataType}_${Math.floor(Date.now() / CACHE_DURATION)}`;
}

// Fetch stock data from multiple sources
async function fetchStockData(symbol) {
  const cacheKey = getCacheKey(symbol, 'stock');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let stockData = null;

  // Try Polygon first (real-time data)
  if (API_KEYS.polygon) {
    try {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${API_KEYS.polygon}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.[0]) {
        const result = data.results[0];
        stockData = {
          symbol,
          price: result.c,
          change: result.c - result.o,
          changePercent: ((result.c - result.o) / result.o) * 100,
          volume: result.v,
          high: result.h,
          low: result.l,
          open: result.o,
          close: result.c,
          timestamp: result.t
        };
      }
    } catch (error) {
      console.error('Polygon error:', error);
    }
  }

  // Fallback to Twelve Data
  if (!stockData && API_KEYS.twelveData) {
    try {
      const response = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEYS.twelveData}`
      );
      const data = await response.json();
      
      if (data.price) {
        stockData = {
          symbol,
          price: parseFloat(data.close),
          change: parseFloat(data.change),
          changePercent: parseFloat(data.percent_change),
          volume: parseInt(data.volume),
          high: parseFloat(data.high),
          low: parseFloat(data.low),
          open: parseFloat(data.open),
          close: parseFloat(data.close)
        };
      }
    } catch (error) {
      console.error('Twelve Data error:', error);
    }
  }

  // Fallback to Alpha Vantage
  if (!stockData && API_KEYS.alphaVantage) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEYS.alphaVantage}`
      );
      const data = await response.json();
      
      if (data['Global Quote']) {
        const quote = data['Global Quote'];
        stockData = {
          symbol,
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          volume: parseInt(quote['06. volume']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          open: parseFloat(quote['02. open']),
          close: parseFloat(quote['08. previous close'])
        };
      }
    } catch (error) {
      console.error('Alpha Vantage error:', error);
    }
  }

  if (stockData) {
    cache.set(cacheKey, stockData);
  }
  
  return stockData;
}

// Fetch options data with Greeks from Unusual Whales
async function fetchOptionsData(symbol, expiry) {
  const cacheKey = getCacheKey(symbol, `options_${expiry}`);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let optionsData = null;

  // Unusual Whales - Best for options data
  if (API_KEYS.unusualWhales) {
    try {
      // Get options chain
      const chainResponse = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/options/chain`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEYS.unusualWhales}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const chainData = await chainResponse.json();
      
      // Get 0DTE specific data if today's expiry
      const today = new Date().toISOString().split('T')[0];
      const is0DTE = expiry === today;
      
      if (is0DTE) {
        // Get 0DTE flow
        const flowResponse = await fetch(
          `https://api.unusualwhales.com/api/option-contracts/flow?symbol=${symbol}&date=${today}`,
          {
            headers: {
              'Authorization': `Bearer ${API_KEYS.unusualWhales}`,
              'Accept': 'application/json'
            }
          }
        );
        
        const flowData = await flowResponse.json();
        
        optionsData = {
          chain: chainData.data || [],
          zeroDTEFlow: flowData.data || [],
          is0DTE: true
        };
      } else {
        optionsData = {
          chain: chainData.data || [],
          is0DTE: false
        };
      }
      
      // Process Greeks from the chain
      if (optionsData.chain.length > 0) {
        const atmStrike = findATMStrike(optionsData.chain, stockData?.price);
        const atmOption = optionsData.chain.find(opt => opt.strike === atmStrike);
        
        if (atmOption) {
          optionsData.greeks = {
            delta: atmOption.delta || 0,
            gamma: atmOption.gamma || 0,
            theta: atmOption.theta || 0,
            vega: atmOption.vega || 0,
            rho: atmOption.rho || 0,
            iv: atmOption.implied_volatility || 0
          };
        }
      }
    } catch (error) {
      console.error('Unusual Whales error:', error);
    }
  }

  // Fallback to Polygon for options
  if (!optionsData && API_KEYS.polygon) {
    try {
      const response = await fetch(
        `https://api.polygon.io/v3/snapshot/options/${symbol}?expiration_date=${expiry}&apiKey=${API_KEYS.polygon}`
      );
      const data = await response.json();
      
      if (data.results) {
        optionsData = {
          chain: data.results,
          is0DTE: expiry === new Date().toISOString().split('T')[0]
        };
        
        // Extract Greeks from Polygon data
        const atmContract = data.results.find(r => 
          Math.abs(r.details.strike_price - stockData?.price) < 5
        );
        
        if (atmContract?.greeks) {
          optionsData.greeks = {
            delta: atmContract.greeks.delta || 0,
            gamma: atmContract.greeks.gamma || 0,
            theta: atmContract.greeks.theta || 0,
            vega: atmContract.greeks.vega || 0,
            rho: atmContract.greeks.rho || 0,
            iv: atmContract.implied_volatility || 0
          };
        }
      }
    } catch (error) {
      console.error('Polygon options error:', error);
    }
  }

  if (optionsData) {
    cache.set(cacheKey, optionsData);
  }
  
  return optionsData;
}

// Fetch market conditions and flow data
async function fetchMarketConditions(symbol) {
  const cacheKey = getCacheKey(symbol, 'conditions');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let conditions = {
    trend: 'neutral',
    movement: 'stable',
    flowSentiment: 'neutral',
    unusualOptions: 0,
    has0DTE: false,
    zeroDTEVolume: 0,
    zeroDTEFlow: 0
  };

  // Unusual Whales flow data
  if (API_KEYS.unusualWhales) {
    try {
      const response = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/flow/recent`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEYS.unusualWhales}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.data) {
        const flows = data.data;
        const bullishFlows = flows.filter(f => f.sentiment === 'bullish').length;
        const bearishFlows = flows.filter(f => f.sentiment === 'bearish').length;
        
        conditions.flowSentiment = bullishFlows > bearishFlows ? 'bullish' : 
                                  bearishFlows > bullishFlows ? 'bearish' : 'neutral';
        conditions.unusualOptions = flows.filter(f => f.is_unusual).length;
        
        // Check for 0DTE
        const today = new Date().toISOString().split('T')[0];
        const zeroDTEFlows = flows.filter(f => f.expiry === today);
        conditions.has0DTE = zeroDTEFlows.length > 0;
        conditions.zeroDTEVolume = zeroDTEFlows.reduce((sum, f) => sum + (f.volume || 0), 0);
        conditions.zeroDTEFlow = zeroDTEFlows.length;
      }
    } catch (error) {
      console.error('UW flow error:', error);
    }
  }

  // Get short interest from ORTEX
  if (API_KEYS.ortex) {
    try {
      const response = await fetch(
        `https://api.ortex.com/v1/data/short-interest/${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEYS.ortex}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      if (data.data) {
        conditions.shortInterest = data.data.short_interest_percent || 0;
        conditions.daysTocover = data.data.days_to_cover || 0;
      }
    } catch (error) {
      console.error('ORTEX error:', error);
    }
  }

  cache.set(cacheKey, conditions);
  return conditions;
}

// Helper function to find ATM strike
function findATMStrike(chain, currentPrice) {
  if (!chain || chain.length === 0 || !currentPrice) return null;
  
  let closestStrike = chain[0].strike;
  let minDiff = Math.abs(chain[0].strike - currentPrice);
  
  for (const option of chain) {
    const diff = Math.abs(option.strike - currentPrice);
    if (diff < minDiff) {
      minDiff = diff;
      closestStrike = option.strike;
    }
  }
  
  return closestStrike;
}

// Main API handler
export async function POST(request) {
  try {
    const { symbol, includeGreeks, expiry } = await request.json();
    
    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol is required'
      });
    }

    // Fetch all data in parallel
    const [stockData, optionsData, marketConditions] = await Promise.all([
      fetchStockData(symbol),
      includeGreeks ? fetchOptionsData(symbol, expiry || getNext0DTEExpiry()) : null,
      fetchMarketConditions(symbol)
    ]);

    // Calculate IV Rank if we have options data
    let ivRank = 50; // default
    if (optionsData?.greeks?.iv) {
      // This would need historical IV data to calculate properly
      // For now, we'll estimate based on current IV
      const iv = optionsData.greeks.iv * 100;
      if (iv > 60) ivRank = 80;
      else if (iv > 40) ivRank = 60;
      else if (iv > 25) ivRank = 40;
      else ivRank = 20;
    }

    // Build response
    const response = {
      success: true,
      useMock: false,
      stockData: stockData ? {
        ...stockData,
        iv: optionsData?.greeks?.iv ? optionsData.greeks.iv * 100 : 30,
        ivRank,
        atmStrike: stockData ? Math.round(stockData.price / 5) * 5 : null,
        putCallRatio: marketConditions.putCallRatio || 1.0,
        optionVolume: marketConditions.zeroDTEVolume || 0,
        openInterest: 0
      } : null,
      marketConditions,
      greeksData: optionsData?.greeks ? {
        available: true,
        atm: optionsData.greeks
      } : null,
      zeroDTEData: {
        available: marketConditions.has0DTE,
        callCount: 0,
        putCount: 0,
        totalVolume: marketConditions.zeroDTEVolume,
        totalOI: 0,
        flows: marketConditions.zeroDTEFlow
      }
    };

    // If no data was fetched, indicate to use mock
    if (!stockData) {
      response.useMock = true;
      response.success = false;
      response.error = 'No data available from APIs';
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      useMock: true
    });
  }
}

// Helper to get today's date for 0DTE
function getNext0DTEExpiry() {
  const today = new Date();
  const day = today.getDay();
  
  // If it's a weekday and market is open, use today
  // Otherwise use next trading day
  if (day >= 1 && day <= 5) {
    return today.toISOString().split('T')[0];
  }
  
  // Move to next Monday if weekend
  const daysToAdd = day === 0 ? 1 : day === 6 ? 2 : 0;
  today.setDate(today.getDate() + daysToAdd);
  return today.toISOString().split('T')[0];
}
