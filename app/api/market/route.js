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
  // Format as YYYY-MM-DD
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to check if today is a trading day
function isTradingDay() {
  const today = new Date();
  const day = today.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
}

// Helper to get next monthly expiry
function getNextMonthlyExpiry() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  // Find third Friday of next month
  const firstDay = nextMonth.getDay();
  const firstFriday = firstDay <= 5 ? 5 - firstDay : 12 - firstDay;
  const thirdFriday = firstFriday + 14;
  nextMonth.setDate(thirdFriday);
  
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const day = String(nextMonth.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Fetch stock data from multiple sources
async function fetchStockData(symbol) {
  const cacheKey = getCacheKey(symbol, 'stock');
  if (cache.has(cacheKey)) {
    console.log('Using cached stock data for', symbol);
    return cache.get(cacheKey);
  }

  let stockData = null;

  // Try Polygon first (your paid API)
  if (API_KEYS.polygon) {
    try {
      console.log('Fetching Polygon data for', symbol);
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${API_KEYS.polygon}`
      );
      console.log('Polygon response status:', response.status);
      
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
        console.log('Polygon stock data received');
        console.log('Stock price:', stockData.price);
      }
    } catch (error) {
      console.error('Polygon error:', error);
    }
  }

  // Fallback to Twelve Data
  if (!stockData && API_KEYS.twelveData) {
    try {
      console.log('Falling back to Twelve Data for', symbol);
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
        console.log('Twelve Data stock data received');
      }
    } catch (error) {
      console.error('Twelve Data error:', error);
    }
  }

  // Fallback to Alpha Vantage
  if (!stockData && API_KEYS.alphaVantage) {
    try {
      console.log('Falling back to Alpha Vantage for', symbol);
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
        console.log('Alpha Vantage stock data received');
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

// Fetch Greeks data from Unusual Whales
async function fetchGreeksData(symbol, expiry) {
  if (!API_KEYS.unusualWhales) {
    console.log('No UW API key available');
    return null;
  }

  const cacheKey = getCacheKey(symbol, `greeks_${expiry}`);
  if (cache.has(cacheKey)) {
    console.log('Using cached Greeks data');
    return cache.get(cacheKey);
  }

  let greeksData = null;

  try {
    console.log(`Fetching UW Greeks for ${symbol}, expiry: ${expiry}`);
    const url = `https://api.unusualwhales.com/api/stock/${symbol}/greeks`;
    const params = new URLSearchParams({ expiry });
    
    console.log('UW Greeks URL:', `${url}?${params}`);
    console.log('UW API Key exists:', !!API_KEYS.unusualWhales);
    
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain',
        'Authorization': API_KEYS.unusualWhales
      }
    });
    
    console.log('UW Greeks response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('UW Greeks data received, record count:', data.data?.length || 0);
      
      if (data.data && data.data.length > 0) {
        // Get stock price for ATM calculation
        const stockData = await fetchStockData(symbol);
        const stockPrice = stockData?.price || 100;
        const atmStrike = Math.round(stockPrice / 5) * 5;
        
        console.log('Looking for ATM strike near:', atmStrike);
        
        // Find ATM option
        const atmOption = data.data.find(opt => 
          Math.abs(opt.strike - atmStrike) < 2.5
        ) || data.data[0];
        
        console.log('ATM Option found at strike:', atmOption?.strike);
        
        // Note: UW Greeks response has aggregate Greeks, not individual
        // We'll use the call Greeks for ATM approximation
        greeksData = {
          available: true,
          atm: {
            delta: parseFloat(atmOption.call_delta) || 0.5,
            gamma: parseFloat(atmOption.call_gamma) || 0.01,
            theta: parseFloat(atmOption.call_theta) || -0.05,
            vega: parseFloat(atmOption.call_vega) || 0.1,
            rho: parseFloat(atmOption.call_rho) || 0.05
          },
          iv: 0.3 // Default IV, adjust based on your needs
        };
      }
    } else {
      const errorText = await response.text();
      console.error('UW Greeks error response:', errorText);
    }
  } catch (error) {
    console.error('UW Greeks fetch error:', error);
  }

  if (greeksData) {
    cache.set(cacheKey, greeksData);
  }
  
  return greeksData;
}

// Fetch options chain and 0DTE data from Unusual Whales
async function fetchOptionsData(symbol, expiry) {
  if (!API_KEYS.unusualWhales) {
    console.log('No UW API key available for options');
    return null;
  }

  const cacheKey = getCacheKey(symbol, `options_${expiry}`);
  if (cache.has(cacheKey)) {
    console.log('Using cached options data');
    return cache.get(cacheKey);
  }

  let optionsData = null;
  const todayExpiry = getTodayExpiry();
  const is0DTE = expiry === todayExpiry && isTradingDay();

  try {
    console.log(`Fetching UW Options for ${symbol}, expiry: ${expiry}`);
    const url = `https://api.unusualwhales.com/api/stock/${symbol}/option-contracts`;
    const params = new URLSearchParams({ expiry });
    
    console.log('UW Options URL:', `${url}?${params}`);
    
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain',
        'Authorization': API_KEYS.unusualWhales
      }
    });
    
    console.log('UW Options response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('UW Options data received, record count:', data.data?.length || 0);
      
      if (data.data) {
        const contracts = data.data;
        
        // Count calls and puts based on option_symbol format
        const calls = contracts.filter(c => 
          c.option_symbol?.includes('C') || c.type === 'call' || c.option_type === 'call'
        );
        const puts = contracts.filter(c => 
          c.option_symbol?.includes('P') || c.type === 'put' || c.option_type === 'put'
        );
        
        // Calculate total volume and OI
        const totalVolume = contracts.reduce((sum, c) => sum + (c.volume || 0), 0);
        const totalOI = contracts.reduce((sum, c) => sum + (c.open_interest || 0), 0);
        
        console.log(`Options summary - Calls: ${calls.length}, Puts: ${puts.length}, Volume: ${totalVolume}`);
        
        optionsData = {
          chain: contracts,
          is0DTE: is0DTE,
          callCount: calls.length,
          putCount: puts.length,
          totalVolume: totalVolume,
          totalOI: totalOI,
          hasOptions: contracts.length > 0
        };
        
        // If it's 0DTE, mark additional data
        if (is0DTE && totalVolume > 0) {
          optionsData.zeroDTEVolume = totalVolume;
          optionsData.zeroDTEFlow = contracts.length;
          console.log('0DTE Options detected with volume:', totalVolume);
        }
      }
    } else {
      const errorText = await response.text();
      console.error('UW Options error response:', errorText);
    }
  } catch (error) {
    console.error('UW Options fetch error:', error);
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
    console.log('Using cached market conditions');
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
      console.log('Fetching UW flow data for', symbol);
      
      // Try to get options flow
      const response = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/options/flow`,
        {
          headers: {
            'Accept': 'application/json, text/plain',
            'Authorization': API_KEYS.unusualWhales
          }
        }
      );
      
      console.log('UW Flow response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data) {
          const flows = data.data;
          
          // Analyze sentiment from tags
          const bullishFlows = flows.filter(f => 
            f.tags?.includes('bullish') || f.aggressor === 'buy'
          ).length;
          const bearishFlows = flows.filter(f => 
            f.tags?.includes('bearish') || f.aggressor === 'sell'
          ).length;
          
          conditions.flowSentiment = bullishFlows > bearishFlows ? 'bullish' : 
                                    bearishFlows > bullishFlows ? 'bearish' : 'neutral';
          
          // Count unusual options
          conditions.unusualOptions = flows.filter(f => 
            f.tags?.includes('unusual') || f.is_unusual
          ).length;
          
          console.log(`Flow sentiment: ${conditions.flowSentiment}, Unusual: ${conditions.unusualOptions}`);
          
          // Check for 0DTE activity
          if (is0DTE) {
            const todayFlows = flows.filter(f => 
              f.expiry === todayExpiry || f.date === todayExpiry
            );
            conditions.has0DTE = todayFlows.length > 0;
            conditions.zeroDTEVolume = todayFlows.reduce((sum, f) => sum + (f.volume || 0), 0);
            conditions.zeroDTEFlow = todayFlows.length;
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

    console.log('===========================================');
    console.log('Processing request for:', symbol);
    console.log('Include Greeks:', includeGreeks);
    console.log('Expiry provided:', expiry);
    console.log('API Keys available:');
    console.log('  - Polygon:', !!API_KEYS.polygon);
    console.log('  - Unusual Whales:', !!API_KEYS.unusualWhales);
    console.log('  - Twelve Data:', !!API_KEYS.twelveData);
    console.log('  - Alpha Vantage:', !!API_KEYS.alphaVantage);
    console.log('===========================================');

    // Determine expiry to use
    const todayExpiry = getTodayExpiry();
    const targetExpiry = expiry || getNextMonthlyExpiry();
    const is0DTE = targetExpiry === todayExpiry && isTradingDay();

    console.log('Today:', todayExpiry);
    console.log('Target Expiry:', targetExpiry);
    console.log('Is 0DTE?:', is0DTE);
    console.log('Is Trading Day?:', isTradingDay());

    // Fetch stock data first
    console.log('\nFetching stock data...');
    const stockData = await fetchStockData(symbol);
    
    if (!stockData) {
      console.log('No stock data available');
      return NextResponse.json({
        success: false,
        error: 'Unable to fetch stock data',
        useMock: true
      });
    }

    console.log('Stock response status: 200');
    console.log('Stock price:', stockData.price);

    // Fetch Greeks if requested
    let greeksData = null;
    if (includeGreeks && API_KEYS.unusualWhales) {
      console.log('\nFetching Greeks data...');
      greeksData = await fetchGreeksData(symbol, targetExpiry);
      if (greeksData) {
        console.log('Greeks data received');
      } else {
        console.log('No Greeks data available');
      }
    }

    // Fetch options data
    let optionsData = null;
    let zeroDTEData = null;
    if (API_KEYS.unusualWhales) {
      console.log('\nFetching options data...');
      
      // For 0DTE, fetch today's options
      if (is0DTE) {
        console.log('Checking for 0DTE options...');
        const todayOptions = await fetchOptionsData(symbol, todayExpiry);
        if (todayOptions && todayOptions.totalVolume > 0) {
          zeroDTEData = {
            available: true,
            callCount: todayOptions.callCount,
            putCount: todayOptions.putCount,
            totalVolume: todayOptions.totalVolume,
            totalOI: todayOptions.totalOI,
            flows: todayOptions.zeroDTEFlow || 0
          };
          console.log('0DTE data available, volume:', todayOptions.totalVolume);
        }
      }
      
      // Also fetch regular monthly options
      optionsData = await fetchOptionsData(symbol, targetExpiry);
    }

    // Fetch market conditions
    console.log('\nFetching market conditions...');
    const marketConditions = await fetchMarketConditions(symbol);

    // Calculate IV Rank
    let ivRank = 50; // default
    if (greeksData?.iv) {
      const iv = greeksData.iv * 100;
      if (iv > 60) ivRank = 80;
      else if (iv > 40) ivRank = 60;
      else if (iv > 25) ivRank = 40;
      else ivRank = 20;
    } else if (stockData) {
      // Estimate IV based on price movement
      const changePercent = Math.abs(stockData.changePercent || 0);
      if (changePercent > 3) ivRank = 70;
      else if (changePercent > 1.5) ivRank = 50;
      else ivRank = 30;
    }

    console.log('\n=== RETURNING DATA ===');
    console.log('Stock price:', stockData.price);
    console.log('IV:', greeksData?.iv || 'undefined');
    console.log('Flow sentiment:', marketConditions.flowSentiment || 'undefined');
    console.log('0DTE Available:', zeroDTEData?.available || false);
    console.log('======================\n');

    // Build response
    const response = {
      success: true,
      useMock: false,
      stockData: {
        ...stockData,
        iv: greeksData?.iv ? greeksData.iv * 100 : 30,
        ivRank,
        atmStrike: stockData ? Math.round(stockData.price / 5) * 5 : null,
        putCallRatio: optionsData ? (optionsData.putCount / (optionsData.callCount || 1)) : 1.0,
        optionVolume: optionsData?.totalVolume || 0,
        openInterest: optionsData?.totalOI || 0
      },
      marketConditions: {
        ...marketConditions,
        has0DTE: zeroDTEData?.available || false,
        zeroDTEVolume: zeroDTEData?.totalVolume || 0,
        zeroDTEFlow: zeroDTEData?.flows || 0
      },
      greeksData: greeksData,
      zeroDTEData: zeroDTEData || {
        available: false,
        callCount: 0,
        putCount: 0,
        totalVolume: 0,
        totalOI: 0,
        flows: 0
      }
    };

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
