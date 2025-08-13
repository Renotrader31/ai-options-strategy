import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { symbol, includeGreeks = false, expiry = null } = await request.json();
    
    // DEBUG INFORMATION
    console.log('=== API ROUTE DEBUG ===');
    console.log('API Route called for symbol:', symbol);
    console.log('Include Greeks:', includeGreeks);
    console.log('Expiry:', expiry);
    console.log('Polygon Key exists:', !!process.env.POLYGON_API_KEY);
    console.log('UW Key exists:', !!process.env.UNUSUAL_WHALES_API_KEY);
    console.log('======================');
    
    // Initialize response data
    let stockData = {};
    let optionsData = {};
    let greeksData = {};
    let flowData = {};
    let shortData = {};
    let zeroDTEData = {};
    
    // Check if we have any API keys at all
    if (!process.env.POLYGON_API_KEY && !process.env.FMP_API_KEY && !process.env.UNUSUAL_WHALES_API_KEY) {
      console.log('No API keys found, returning mock data indicator');
      return NextResponse.json({ 
        success: false,
        useMock: true,
        message: 'No API keys configured' 
      });
    }
    
    // 1. POLYGON - Stock Data
    if (process.env.POLYGON_API_KEY) {
      try {
        const polygonKey = process.env.POLYGON_API_KEY;
        console.log('Fetching Polygon data for', symbol);
        
        // Get stock snapshot
        const stockUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${polygonKey}`;
        const stockResponse = await fetch(stockUrl);
        
        if (stockResponse.ok) {
          const data = await stockResponse.json();
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
        }
      } catch (error) {
        console.error('Polygon error:', error.message);
      }
    }
    
    // 2. UNUSUAL WHALES - Enhanced Options & Greeks Data
    if (process.env.UNUSUAL_WHALES_API_KEY) {
      try {
        const uwKey = process.env.UNUSUAL_WHALES_API_KEY;
        const headers = {
          'Authorization': `Bearer ${uwKey}`,
          'Accept': 'application/json'
        };
        
        // Get option chains with Greeks
        const chainUrl = `https://api.unusualwhales.com/api/stock/${symbol}/option-contracts`;
        const chainResponse = await fetch(chainUrl, { headers });
        
        if (chainResponse.ok) {
          const chainData = await chainResponse.json();
          const contracts = chainData.data || [];
          
          console.log('UW Option contracts received:', contracts.length);
          
          // Find 0DTE options (today's expiry)
          const today = new Date().toISOString().split('T')[0];
          const zeroDTEContracts = contracts.filter(c => c.expiry === today);
          
          if (zeroDTEContracts.length > 0) {
            console.log('0DTE contracts found:', zeroDTEContracts.length);
            
            // Find ATM 0DTE options
            const atmStrike = Math.round(stockData.price / 5) * 5;
            const atm0DTECalls = zeroDTEContracts.filter(c => 
              c.type === 'call' && Math.abs(c.strike - atmStrike) < 2.5
            );
            const atm0DTEPuts = zeroDTEContracts.filter(c => 
              c.type === 'put' && Math.abs(c.strike - atmStrike) < 2.5
            );
            
            zeroDTEData = {
              available: true,
              callCount: zeroDTEContracts.filter(c => c.type === 'call').length,
              putCount: zeroDTEContracts.filter(c => c.type === 'put').length,
              atmCallPremium: atm0DTECalls[0]?.ask || 0,
              atmPutPremium: atm0DTEPuts[0]?.ask || 0,
              totalVolume: zeroDTEContracts.reduce((sum, c) => sum + (c.volume || 0), 0),
              totalOI: zeroDTEContracts.reduce((sum, c) => sum + (c.open_interest || 0), 0)
            };
          }
          
          // Calculate overall options metrics
          const calls = contracts.filter(c => c.type === 'call');
          const puts = contracts.filter(c => c.type === 'put');
          
          // Get IVs and calculate average
          const ivs = contracts
            .map(c => c.implied_volatility)
            .filter(iv => iv && iv > 0);
          const avgIV = ivs.length > 0 
            ? (ivs.reduce((a, b) => a + b, 0) / ivs.length) * 100
            : 30;
          
          // Calculate P/C ratio
          const totalCallVolume = calls.reduce((sum, c) => sum + (c.volume || 0), 0);
          const totalPutVolume = puts.reduce((sum, c) => sum + (c.volume || 0), 0);
          const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 1;
          
          optionsData = {
            iv: avgIV,
            ivRank: calculateIVRank(avgIV),
            putCallRatio: putCallRatio,
            callVolume: totalCallVolume,
            putVolume: totalPutVolume,
            totalVolume: totalCallVolume + totalPutVolume,
            atmStrike: Math.round(stockData.price / 5) * 5
          };
        }
        
        // Get Greeks if requested
        if (includeGreeks && expiry) {
          const greeksUrl = `https://api.unusualwhales.com/api/stock/${symbol}/greeks`;
          const greeksParams = new URLSearchParams({ expiry });
          
          const greeksResponse = await fetch(`${greeksUrl}?${greeksParams}`, { headers });
          
          if (greeksResponse.ok) {
            const greeksResponseData = await greeksResponse.json();
            const greeksArray = greeksResponseData.data || [];
            
            console.log('Greeks data received for expiry:', expiry);
            
            // Find ATM Greeks
            const atmStrike = Math.round(stockData.price / 5) * 5;
            const atmGreeks = greeksArray.find(g => 
              Math.abs(g.strike - atmStrike) < 2.5
            );
            
            if (atmGreeks) {
              greeksData = {
                available: true,
                atm: {
                  delta: atmGreeks.delta || 0,
                  gamma: atmGreeks.gamma || 0,
                  theta: atmGreeks.theta || 0,
                  vega: atmGreeks.vega || 0,
                  rho: atmGreeks.rho || 0
                },
                all: greeksArray // Store all Greeks for analysis
              };
            }
          }
        }
        
        // Get options flow
        const flowUrl = `https://api.unusualwhales.com/api/stock/${symbol}/options-flow`;
        const flowResponse = await fetch(flowUrl, { headers });
        
        if (flowResponse.ok) {
          const data = await flowResponse.json();
          const flows = data.data || [];
          
          // Analyze recent flow
          const recentFlows = flows.slice(0, 100);
          const bullishFlows = recentFlows.filter(f => 
            f.sentiment === 'BULLISH' || f.type === 'call'
          ).length;
          const bearishFlows = recentFlows.filter(f => 
            f.sentiment === 'BEARISH' || f.type === 'put'
          ).length;
          
          // Find large/unusual trades
          const unusualFlows = recentFlows.filter(f => 
            f.volume > f.open_interest * 2 || 
            f.premium > 1000000 ||
            f.size > 500
          );
          
          // Check for 0DTE flow
          const todayFlows = recentFlows.filter(f => {
            const flowDate = new Date(f.expiry);
            const today = new Date();
            return flowDate.toDateString() === today.toDateString();
          });
          
          flowData = {
            sentiment: bullishFlows > bearishFlows ? 'bullish' : 
                      bearishFlows > bullishFlows ? 'bearish' : 'neutral',
            bullishCount: bullishFlows,
            bearishCount: bearishFlows,
            unusualActivity: unusualFlows.length,
            largeOrders: recentFlows.filter(f => f.premium > 100000).length,
            zeroDTEFlow: todayFlows.length,
            zeroDTEPremium: todayFlows.reduce((sum, f) => sum + (f.premium || 0), 0)
          };
        }
        
      } catch (error) {
        console.error('Unusual Whales error:', error.message);
      }
    }
    
    // 3. ORTEX - Short Interest Data
    if (process.env.ORTEX_API_KEY) {
      try {
        const ortexKey = process.env.ORTEX_API_KEY;
        
        const shortUrl = `https://public.ortex.com/v1/data/short-interest/${symbol}`;
        const shortResponse = await fetch(shortUrl, {
          headers: {
            'Authorization': ortexKey,
            'Accept': 'application/json'
          }
        });
        
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
        }
      } catch (error) {
        console.error('Ortex error:', error.message);
      }
    }
    
    // 4. FMP - Backup/Additional data
    if (process.env.FMP_API_KEY && (!stockData.price || stockData.price === 0)) {
      try {
        const fmpKey = process.env.FMP_API_KEY;
        
        const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${fmpKey}`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (quoteResponse.ok) {
          const data = await quoteResponse.json();
          const quote = data[0] || {};
          
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
              pe: quote.pe || 0
            };
          }
        }
      } catch (error) {
        console.error('FMP error:', error.message);
      }
    }
    
    // Calculate market conditions based on all data
    const marketConditions = {
      trend: analyzeTrend(stockData, flowData),
      movement: optionsData.iv > 50 ? 'volatile' : 
                optionsData.iv < 25 ? 'stable' : 'neutral',
      flowSentiment: flowData.sentiment || 'neutral',
      unusualOptions: flowData.unusualActivity || 0,
      volumeRatio: stockData.volume / (stockData.avgVolume || stockData.volume || 1),
      putCallRatio: optionsData.putCallRatio || 1,
      shortInterestRatio: shortData.shortInterestPercent || 0,
      shortSqueezePotential: calculateSqueezePotential(shortData, stockData, optionsData),
      has0DTE: zeroDTEData.available || false,
      zeroDTEVolume: zeroDTEData.totalVolume || 0,
      zeroDTEFlow: flowData.zeroDTEFlow || 0
    };
    
    console.log('=== RETURNING DATA ===');
    console.log('Stock price:', stockData.price);
    console.log('IV:', optionsData.iv);
    console.log('Flow sentiment:', flowData.sentiment);
    console.log('0DTE Available:', zeroDTEData.available);
    console.log('Greeks Available:', greeksData.available);
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
      greeksData,
      zeroDTEData,
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

function analyzeTrend(stockData, flowData) {
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
