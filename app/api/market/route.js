// app/api/market/route.js
import { NextResponse } from 'next/server';

// API Keys from environment variables
const API_KEYS = {
  polygon: process.env.POLYGON_API_KEY,
  unusualWhales: process.env.UNUSUAL_WHALES_API_KEY || process.env.UW_TOKEN,
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

// Helper to get today's date for 0DTE
function getTodayExpiry() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Helper to check if today is a trading day
function isTradingDay() {
  const today = new Date();
  const day = today.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
}

// Fetch stock data from multiple sources
async function fetchStockData(symbol) {
  const cacheKey = getCacheKey(symbol, 'stock');
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let stockData = null;

  // Try Unusual Whales first for stock data
  if (API_KEYS.unusualWhales) {
    try {
      const response = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/quote`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': API_KEYS.unusualWhales
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          const quote = data.data;
          stockData = {
            symbol,
            price: quote.last_price || quote.price,
            change: quote.change,
            changePercent: quote.change_percent,
            volume: quote.volume,
            high: quote.high,
            low: quote.low,
            open: quote.open,
            close: quote.close || quote.last_price
          };
        }
      }
    } catch (error) {
      console.error('UW stock error:', error);
    }
  }

  // Fallback to Polygon
  if (!stockData && API_KEYS.polygon) {
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
          close: result.c
        };
      }
    } catch (error) {
      console.error('Polygon error:', error);
    }
  }

  if (stockData) {
    cache.set(cacheKey, stockData);
  }
  
  return stockData;
}

// Fetch Greeks data from Unusual Whales
async function fetchGreeksData(symbol, expiry) {
  const cacheKey = getCacheKey(symbol, `greeks_${expiry}`);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let greeksData = null;

  if (API_KEYS.unusualWhales) {
    try {
      // Use the correct Greeks endpoint
      const response = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/greeks?expiry=${expiry}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': API_KEYS.unusualWhales
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('UW Greeks response:', data);
        
        if (data.data && data.data.length > 0) {
          // Find ATM option
          const stockPrice = await fetchStockData(symbol);
          const atmStrike = Math.round(stockPrice.price / 5) * 5;
          
          const atmOption = data.data.find(opt => 
            Math.abs(opt.strike - atmStrike) < 2.5
          ) || data.data[0];
          
          greeksData = {
            available: true,
            atm: {
              delta: atmOption.delta || 0,
              gamma: atmOption.gamma || 0,
              theta: atmOption.theta || 0,
              vega: atmOption.vega || 0,
              rho: atmOption.rho || 0
            },
            iv: atmOption.implied_volatility || atmOption.iv || 0.3
          };
        }
      }
    } catch (error) {
      console.error('UW Greeks error:', error);
    }
  }

  if (greeksData) {
    cache.set(cacheKey, greeksData);
  }
  
  return greeksData;
}

// Fetch options chain and 0DTE data from Unusual Whales
async function fetchOptionsData(symbol, expiry) {
  const cacheKey = getCacheKey(symbol, `options_${expiry}`);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let optionsData = null;
  const todayExpiry = getTodayExpiry();
  const is0DTE = expiry === todayExpiry && isTradingDay();

  if (API_KEYS.unusualWhales) {
    try {
      // Get option contracts for the specific expiry
      const response = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/option-contracts?expiry=${expiry}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': API_KEYS.unusualWhales
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('UW Options response for', expiry, ':', data);
        
        if (data.data) {
          const contracts = data.data;
          
          // Count calls and puts
          const calls = contracts.filter(c => c.type === 'call' || c.option_type === 'call');
          const puts = contracts.filter(c => c.type === 'put' || c.option_type === 'put');
          
          // Calculate total volume and OI
          const totalVolume = contracts.reduce((sum, c) => sum + (c.volume || 0), 0);
          const totalOI = contracts.reduce((sum, c) => sum + (c.open_interest || 0), 0);
          
          optionsData = {
            chain: contracts,
            is0DTE: is0DTE,
            callCount: calls.length,
            putCount: puts.length,
            totalVolume: totalVolume,
            totalOI: totalOI,
            hasOptions: contracts.length > 0
          };
          
          // If it's 0DTE, get additional flow data
          if (is0DTE) {
            try {
              const flowResponse = await fetch(
                `https://api.unusualwhales.com/api/option-contracts/flow?symbol=${symbol}&date=${todayExpiry}`,
                {
                  headers: {
                    'Accept': 'application/json',
                    'Authorization': API_KEYS.unusualWhales
                  }
                }
              );
              
              if (flowResponse.ok) {
                const flowData = await flowResponse.json();
                if (flowData.data) {
                  optionsData.zeroDTEFlow = flowData.data.length;
                  optionsData.zeroDTEVolume = flowData.data.reduce((sum, f) => sum + (f.volume || 0), 0);
                }
              }
            } catch (error) {
              console.error('UW 0DTE flow error:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('UW options error:', error);
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

  // Check if today is a trading day for 0DTE
  const todayExpiry = getTodayExpiry();
  const is0DTE = isTradingDay();

  // Unusual Whales flow data
  if (API_KEYS.unusualWhales) {
    try {
      // Get recent flow
      const response = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/option-activity`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': API_KEYS.unusualWhales
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data) {
          const activity = data.data;
          
          // Analyze sentiment
          const bullishCount = activity.filter(a => 
            a.sentiment === 'bullish' || a.aggressor === 'buy'
          ).length;
          const bearishCount = activity.filter(a => 
            a.sentiment === 'bearish' || a.aggressor === 'sell'
          ).length;
          
          conditions.flowSentiment = bullishCount > bearishCount ? 'bullish' : 
                                    bearishCount > bullishCount ? 'bearish' : 'neutral';
          conditions.unusualOptions = activity.filter(a => a.is_unusual).length;
          
          // Check for 0DTE activity
          if (is0DTE) {
            const todayActivity = activity.filter(a => 
              a.expiry === todayExpiry || a.date === todayExpiry
            );
            conditions.has0DTE = todayActivity.length > 0;
            conditions.zeroDTEVolume = todayActivity.reduce((sum, a) => sum + (a.volume || 0), 0);
            conditions.zeroDTEFlow = todayActivity.length;
          }
        }
      }
    } catch (error) {
      console.error('UW flow error:', error);
    }
  }

  // Determine trend based on stock movement
  const stockData = await fetchStockData(symbol);
  if (stockData) {
    const changePercent = stockData.changePercent || 0;
    if (changePercent > 1) conditions.trend = 'bullish';
    else if (changePercent < -1) conditions.trend = 'bearish';
    
    if (Math.abs(changePercent) > 2) conditions.movement = 'volatile';
    else if (Math.abs(changePercent) < 0.5) conditions.movement = 'stable';
  }

  cache.set(cacheKey, conditions);
  return conditions;
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

    console.log('Processing request for:', symbol, 'Expiry:', expiry);

    // Determine expiry to use
    const todayExpiry = getTodayExpiry();
    const targetExpiry = expiry || todayExpiry;
    const is0DTE = targetExpiry === todayExpiry && isTradingDay();

    // Fetch all data in parallel
    const [stockData, greeksData, optionsData, marketConditions] = await Promise.all([
      fetchStockData(symbol),
      includeGreeks ? fetchGreeksData(symbol, targetExpiry) : null,
      fetchOptionsData(symbol, targetExpiry),
      fetchMarketConditions(symbol)
    ]);

    // Calculate IV Rank
    let ivRank = 50; // default
    if (greeksData?.iv) {
      const iv = greeksData.iv * 100;
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
        iv: greeksData?.iv ? greeksData.iv * 100 : 30,
        ivRank,
        atmStrike: stockData ? Math.round(stockData.price / 5) * 5 : null,
        putCallRatio: optionsData ? (optionsData.putCount / (optionsData.callCount || 1)) : 1.0,
        optionVolume: optionsData?.totalVolume || 0,
        openInterest: optionsData?.totalOI || 0
      } : null,
      marketConditions: {
        ...marketConditions,
        has0DTE: is0DTE && optionsData?.hasOptions,
        zeroDTEVolume: is0DTE ? (optionsData?.zeroDTEVolume || optionsData?.totalVolume || 0) : 0
      },
      greeksData: greeksData,
      zeroDTEData: {
        available: is0DTE && optionsData?.hasOptions,
        callCount: optionsData?.callCount || 0,
        putCount: optionsData?.putCount || 0,
        totalVolume: is0DTE ? (optionsData?.totalVolume || 0) : 0,
        totalOI: is0DTE ? (optionsData?.totalOI || 0) : 0,
        flows: marketConditions.zeroDTEFlow
      }
    };

    console.log('Response:', {
      has0DTE: response.marketConditions.has0DTE,
      zeroDTEAvailable: response.zeroDTEData.available,
      is0DTE,
      isTradingDay: isTradingDay(),
      todayExpiry,
      targetExpiry
    });

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
