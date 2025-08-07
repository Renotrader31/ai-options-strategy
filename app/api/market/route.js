import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { symbol } = await request.json();
    
    // DEBUG INFORMATION
    console.log('=== API ROUTE DEBUG ===');
    console.log('API Route called for symbol:', symbol);
    console.log('Polygon Key exists:', !!process.env.POLYGON_API_KEY);
    console.log('FMP Key exists:', !!process.env.FMP_API_KEY);
    console.log('UW Key exists:', !!process.env.UNUSUAL_WHALES_API_KEY);
    console.log('Ortex Key exists:', !!process.env.ORTEX_API_KEY);
    console.log('First 10 chars of Polygon key:', process.env.POLYGON_API_KEY?.substring(0, 10));
    console.log('======================');
    
    // Initialize response data
    let stockData = {};
    let optionsData = {};
    let shortData = {};
    let flowData = {};
    
    // Check if we have any API keys at all
    if (!process.env.POLYGON_API_KEY && !process.env.FMP_API_KEY) {
      console.log('No API keys found, returning mock data indicator');
      return NextResponse.json({ 
        success: false,
        useMock: true,
        message: 'No API keys configured' 
      });
    }
    
    // 1. POLYGON - Stock & Options Data
    if (process.env.POLYGON_API_KEY) {
      try {
        const polygonKey = process.env.POLYGON_API_KEY;
        console.log('Fetching Polygon data for', symbol);
        
        // Get stock snapshot
        const stockUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${polygonKey}`;
        console.log('Fetching stock data...');
        
        const stockResponse = await fetch(stockUrl);
        console.log('Stock response status:', stockResponse.status);
        
        if (stockResponse.ok) {
          const data = await stockResponse.json();
          console.log('Polygon stock data received');
          
          if (data.ticker) {
            const ticker = data.ticker;
            
            stockData = {
              symbol: symbol,
              price: ticker.day?.c || ticker.prevDay?.c || 0,
              open: ticker.day?.o || 0,
              high: ticker.day?.h || 0,
              low: ticker.day?.l || 0,
              volume: ticker.day?.v || 0,
              change: ticker.todaysChange || 0,
              changePercent: ticker.todaysChangePerc || 0,
              prevClose: ticker.prevDay?.c || 0
            };
            
            console.log('Stock price:', stockData.price);
          }
        } else {
          const errorText = await stockResponse.text();
          console.log('Polygon stock error:', stockResponse.status, errorText);
        }
        
        // Get options snapshot
        const optionsUrl = `https://api.polygon.io/v3/snapshot/options/${symbol}?apiKey=${polygonKey}&limit=250`;
        console.log('Fetching options data...');
        
        const optionsResponse = await fetch(optionsUrl);
        console.log('Options response status:', optionsResponse.status);
if (optionsResponse.ok) {
  const optData = await optionsResponse.json();
  const results = optData.results || [];
  
  // If no options data, use stock-based estimates
  if (results.length === 0) {
    console.log('No options data available for', symbol);
    // Estimate IV based on stock price movement
    const priceChange = Math.abs(stockData.changePercent || 0);
    const estimatedIV = Math.max(15, Math.min(100, priceChange * 10));
    
    optionsData = {
      iv: estimatedIV,
      ivRank: calculateIVRank(estimatedIV),
      putCallRatio: 1,
      callVolume: 0,
      putVolume: 0,
      callOI: 0,
      putOI: 0,
      atmStrike: Math.round(stockData.price / 5) * 5,
      totalVolume: 0,
      totalOI: 0
    };
  } else {
    // Process options normally (the code we fixed above)        
          
// Calculate options metrics
const calls = results.filter(opt => opt.details?.contract_type === 'call');
const puts = results.filter(opt => opt.details?.contract_type === 'put');

console.log('Calls:', calls.length, 'Puts:', puts.length);

// Find ATM options
const atmStrike = Math.round(stockData.price / 5) * 5;
const atmCalls = calls.filter(opt => Math.abs(opt.details?.strike_price - atmStrike) < 2.5);
const atmPuts = puts.filter(opt => Math.abs(opt.details?.strike_price - atmStrike) < 2.5);

// Calculate total volume and OI
const totalCallVolume = calls.reduce((sum, opt) => sum + (opt.day?.volume || 0), 0);
const totalPutVolume = puts.reduce((sum, opt) => sum + (opt.day?.volume || 0), 0);
const totalCallOI = calls.reduce((sum, opt) => sum + (opt.open_interest || 0), 0);
const totalPutOI = puts.reduce((sum, opt) => sum + (opt.open_interest || 0), 0);

// Get IV from ATM options - FIXED VERSION
const atmIVs = [...atmCalls, ...atmPuts]
  .map(opt => opt.implied_volatility)
  .filter(iv => iv && iv > 0);

// Calculate average IV with better fallback
let avgIV = 30; // Default IV
if (atmIVs.length > 0) {
  avgIV = (atmIVs.reduce((a, b) => a + b, 0) / atmIVs.length) * 100;
} else if (results.length > 0) {
  // Try to get IV from any available options
  const allIVs = results
    .map(opt => opt.implied_volatility)
    .filter(iv => iv && iv > 0);
  if (allIVs.length > 0) {
    avgIV = (allIVs.reduce((a, b) => a + b, 0) / allIVs.length) * 100;
  }
}

// Calculate Put/Call ratio with safety check
const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 1;

optionsData = {
  iv: avgIV,
  ivRank: calculateIVRank(avgIV),
  putCallRatio: putCallRatio,
  callVolume: totalCallVolume,
  putVolume: totalPutVolume,
  callOI: totalCallOI,
  putOI: totalPutOI,
  atmStrike: atmStrike,
  totalVolume: totalCallVolume + totalPutVolume,
  totalOI: totalCallOI + totalPutOI
};          
          console.log('Options IV:', avgIV);
}
        } else {
          const errorText = await optionsResponse.text();
          console.log('Polygon options error:', optionsResponse.status, errorText);
        }
      } catch (error) {
        console.error('Polygon error:', error.message);
      }
    }
    
    // 2. FMP - Additional fundamental data (as backup or supplement)
    if (process.env.FMP_API_KEY && (!stockData.price || stockData.price === 0)) {
      try {
        const fmpKey = process.env.FMP_API_KEY;
        console.log('Fetching FMP data as backup for', symbol);
        
        const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${fmpKey}`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (quoteResponse.ok) {
          const data = await quoteResponse.json();
          const quote = data[0] || {};
          
          console.log('FMP data received, price:', quote.price);
          
          // Use FMP data if Polygon didn't work
          if (!stockData.price || stockData.price === 0) {
            stockData = {
              symbol: symbol,
              price: quote.price || 0,
              open: quote.open || 0,
              high: quote.dayHigh || 0,
              low: quote.dayLow || 0,
              volume: quote.volume || 0,
              change: quote.change || 0,
              changePercent: quote.changesPercentage || 0,
              prevClose: quote.previousClose || 0,
              marketCap: quote.marketCap || 0,
              pe: quote.pe || 0,
              eps: quote.eps || 0,
              avgVolume: quote.avgVolume || 0,
              yearHigh: quote.yearHigh || 0,
              yearLow: quote.yearLow || 0
            };
          } else {
            // Merge additional data
            stockData.marketCap = quote.marketCap || stockData.marketCap;
            stockData.pe = quote.pe || 0;
            stockData.eps = quote.eps || 0;
            stockData.avgVolume = quote.avgVolume || 0;
          }
        }
      } catch (error) {
        console.error('FMP error:', error.message);
      }
    }
    
    // 3. UNUSUAL WHALES - Flow Data
    if (process.env.UNUSUAL_WHALES_API_KEY) {
      try {
        const uwKey = process.env.UNUSUAL_WHALES_API_KEY;
        console.log('Fetching Unusual Whales data for', symbol);
        
        // Get options flow
        const flowUrl = `https://api.unusualwhales.com/api/stock/${symbol}/options-flow`;
        const flowResponse = await fetch(flowUrl, {
          headers: {
            'Authorization': `Bearer ${uwKey}`,
            'Accept': 'application/json'
          }
        });
        
        console.log('UW response status:', flowResponse.status);
        
        if (flowResponse.ok) {
          const data = await flowResponse.json();
          const flows = data.data || [];
          
          console.log('Flow data received, count:', flows.length);
          
          // Analyze recent flow
          const recentFlows = flows.slice(0, 100);
          const bullishFlows = recentFlows.filter(f => f.sentiment === 'BULLISH').length;
          const bearishFlows = recentFlows.filter(f => f.sentiment === 'BEARISH').length;
          
          // Calculate premium
          const totalPremium = recentFlows.reduce((sum, f) => sum + (f.premium || 0), 0);
          const avgPremium = recentFlows.length > 0 ? totalPremium / recentFlows.length : 0;
          
          // Find unusual activity
          const unusualFlows = recentFlows.filter(f => 
            f.volume > f.open_interest * 2 || 
            f.premium > 1000000 ||
            f.size > 500
          );
          
          flowData = {
            sentiment: bullishFlows > bearishFlows ? 'bullish' : 
                      bearishFlows > bullishFlows ? 'bearish' : 'neutral',
            bullishCount: bullishFlows,
            bearishCount: bearishFlows,
            unusualActivity: unusualFlows.length,
            totalPremium: totalPremium,
            avgPremium: avgPremium,
            largeOrders: recentFlows.filter(f => f.premium > 100000).length
          };
        }
      } catch (error) {
        console.error('Unusual Whales error:', error.message);
      }
    }
    
    // 4. ORTEX - Short Interest Data
    if (process.env.ORTEX_API_KEY) {
      try {
        const ortexKey = process.env.ORTEX_API_KEY;
        console.log('Fetching Ortex data for', symbol);
        
        const shortUrl = `https://public.ortex.com/v1/data/short-interest/${symbol}`;
        const shortResponse = await fetch(shortUrl, {
          headers: {
            'Authorization': ortexKey,
            'Accept': 'application/json'
          }
        });
        
        console.log('Ortex response status:', shortResponse.status);
        
        if (shortResponse.ok) {
          const data = await shortResponse.json();
          const latestData = data.data?.[0] || {};
          
          shortData = {
            shortInterest: latestData.shortInterest || 0,
            shortInterestPercent: latestData.shortInterestPercentFloat || 0,
            daysTocover: latestData.daysToCover || 0,
            utilizationRate: latestData.utilization || 0,
            costToBorrow: latestData.costToBorrow || 0
          };
          
          console.log('Short interest:', shortData.shortInterestPercent);
        }
      } catch (error) {
        console.error('Ortex error:', error.message);
      }
    }
    
    // Check if we got any real data
    if (!stockData.price || stockData.price === 0) {
      console.log('No stock price found, returning mock indicator');
      return NextResponse.json({
        success: false,
        useMock: true,
        message: 'Could not fetch stock data'
      });
    }
    
    // Calculate market conditions based on all data
    const marketConditions = {
      trend: analyzetrend(stockData, flowData),
      movement: optionsData.iv > 50 ? 'volatile' : 
                optionsData.iv < 25 ? 'stable' : 'neutral',
      flowSentiment: flowData.sentiment || 'neutral',
      unusualOptions: flowData.unusualActivity || 0,
      volumeRatio: stockData.volume / (stockData.avgVolume || stockData.volume || 1),
      putCallRatio: optionsData.putCallRatio || 1,
      shortInterestRatio: shortData.shortInterestPercent || 0,
      shortSqueezePotential: calculateSqueezePotential(shortData, stockData, optionsData)
    };
    
    console.log('=== RETURNING DATA ===');
    console.log('Stock price:', stockData.price);
    console.log('IV:', optionsData.iv);
    console.log('Flow sentiment:', flowData.sentiment);
    console.log('=====================');
    
    return NextResponse.json({
      success: true,
      stockData: {
        ...stockData,
        ...optionsData,
        ...shortData
      },
      optionsData,
      flowData,
      shortData,
      marketConditions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('=== API ROUTE ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      useMock: true 
    });
  }
}

// Helper functions
function calculateIVRank(currentIV) {
  if (currentIV > 80) return 95;
  if (currentIV > 60) return 80;
  if (currentIV > 40) return 60;
  if (currentIV > 25) return 40;
  return 20;
}

function analyzetrend(stockData, flowData) {
  const priceChange = stockData.changePercent || 0;
  const flowSentiment = flowData.sentiment;
  
  if (priceChange > 2 && flowSentiment === 'bullish') return 'strongly bullish';
  if (priceChange > 1) return 'bullish';
  if (priceChange < -2 && flowSentiment === 'bearish') return 'strongly bearish';
  if (priceChange < -1) return 'bearish';
  return 'neutral';
}

function calculateSqueezePotential(shortData, stockData, optionsData) {
  const shortInterest = shortData.shortInterestPercent || 0;
  const utilizationRate = shortData.utilizationRate || 0;
  const costToBorrow = shortData.costToBorrow || 0;
  const iv = optionsData.iv || 30;
  
  let score = 0;
  if (shortInterest > 20) score += 3;
  else if (shortInterest > 10) score += 2;
  else if (shortInterest > 5) score += 1;
  
  if (utilizationRate > 90) score += 2;
  else if (utilizationRate > 70) score += 1;
  
  if (costToBorrow > 50) score += 2;
  else if (costToBorrow > 20) score += 1;
  
  if (iv > 100) score += 2;
  else if (iv > 60) score += 1;
  
  if (score >= 8) return 'extreme';
  if (score >= 6) return 'high';
  if (score >= 4) return 'moderate';
  if (score >= 2) return 'low';
  return 'minimal';
}
