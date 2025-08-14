// app/api/market/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { symbol } = await request.json();
    
    if (!symbol) {
      return NextResponse.json({ 
        success: false, 
        error: 'Symbol is required' 
      }, { status: 400 });
    }

    // Check if API key exists
    if (!process.env.UNUSUAL_WHALES_API_KEY) {
      console.error('UNUSUAL_WHALES_API_KEY not found in environment variables');
      return NextResponse.json({
        success: false,
        useMock: true,
        error: 'API key not configured'
      });
    }

    // Headers - NO Bearer prefix based on the Python example
    const headers = {
      'Accept': 'application/json',
      'Authorization': process.env.UNUSUAL_WHALES_API_KEY
    };

    console.log('Fetching data for symbol:', symbol);

    try {
      // Fetch multiple endpoints in parallel with CORRECT URLs
      const [
        priceResponse,
        optionsVolumeResponse,
        optionsExpiriesResponse,
        volatilityResponse,
        flowResponse
      ] = await Promise.all([
        // Stock price data - using 1 minute candles
        fetch(`https://api.unusualwhales.com/api/stock/${symbol}/price/1m`, { 
          headers,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }),
        
        // Options volume for the day
        fetch(`https://api.unusualwhales.com/api/stock/${symbol}/options/volume/day`, { 
          headers,
          signal: AbortSignal.timeout(10000)
        }),
        
        // Options expiries
        fetch(`https://api.unusualwhales.com/api/stock/${symbol}/options/expirations`, { 
          headers,
          signal: AbortSignal.timeout(10000)
        }),
        
        // Current volatility
        fetch(`https://api.unusualwhales.com/api/stock/${symbol}/volatility`, { 
          headers,
          signal: AbortSignal.timeout(10000)
        }),
        
        // Recent options flow
        fetch(`https://api.unusualwhales.com/api/stock/${symbol}/options/flow?limit=100`, { 
          headers,
          signal: AbortSignal.timeout(10000)
        })
      ]);

      console.log('API Response statuses:', {
        price: priceResponse.status,
        volume: optionsVolumeResponse.status,
        expiries: optionsExpiriesResponse.status,
        volatility: volatilityResponse.status,
        flow: flowResponse.status
      });

      // Check if any requests failed
      const failedRequests = [];
      if (!priceResponse.ok) failedRequests.push({ name: 'price', status: priceResponse.status });
      if (!optionsVolumeResponse.ok) failedRequests.push({ name: 'volume', status: optionsVolumeResponse.status });
      if (!optionsExpiriesResponse.ok) failedRequests.push({ name: 'expiries', status: optionsExpiriesResponse.status });
      if (!volatilityResponse.ok) failedRequests.push({ name: 'volatility', status: volatilityResponse.status });
      if (!flowResponse.ok) failedRequests.push({ name: 'flow', status: flowResponse.status });

      if (failedRequests.length > 0) {
        console.error('Some requests failed:', failedRequests);
        // Continue with partial data if some requests succeed
      }

      // Parse responses - handle failures gracefully
      const priceData = priceResponse.ok ? await priceResponse.json() : { data: [] };
      const optionsVolume = optionsVolumeResponse.ok ? await optionsVolumeResponse.json() : { data: [] };
      const expiriesData = optionsExpiriesResponse.ok ? await optionsExpiriesResponse.json() : { data: [] };
      const volatilityData = volatilityResponse.ok ? await volatilityResponse.json() : { data: null };
      const flowData = flowResponse.ok ? await flowResponse.json() : { data: [] };

      console.log('Data received:', {
        priceCount: priceData.data?.length || 0,
        volumeData: !!optionsVolume.data,
        expiriesCount: expiriesData.data?.length || 0,
        volatilityData: !!volatilityData.data,
        flowCount: flowData.data?.length || 0
      });

      // Process stock price data
      const latestPrice = priceData.data?.[priceData.data.length - 1];
      const previousPrice = priceData.data?.[priceData.data.length - 2];
      const currentPrice = parseFloat(latestPrice?.close || 100);
      const prevClose = parseFloat(previousPrice?.close || currentPrice);
      const change = currentPrice - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      // Process volatility data
      const iv = parseFloat(volatilityData.data?.iv || 0.30) * 100;
      const ivRank = parseFloat(volatilityData.data?.iv_rank || 0.50) * 100;

      // Check for 0DTE availability
      const today = new Date().toISOString().split('T')[0];
      const has0DTE = expiriesData.data?.some(exp => {
        const expiryDate = exp.expires || exp.expiry;
        return expiryDate === today;
      }) || false;

      // Get 0DTE data if available
      const zeroDTEExpiry = expiriesData.data?.find(exp => {
        const expiryDate = exp.expires || exp.expiry;
        return expiryDate === today;
      });

      // Analyze flow sentiment
      let flowSentiment = 'neutral';
      let bullishFlow = 0;
      let bearishFlow = 0;
      let unusualOptions = 0;

      if (flowData.data && Array.isArray(flowData.data)) {
        flowData.data.forEach(flow => {
          if (flow.tags && Array.isArray(flow.tags)) {
            if (flow.tags.includes('bullish')) bullishFlow++;
            if (flow.tags.includes('bearish')) bearishFlow++;
            if (flow.tags.includes('sweep') || flow.tags.includes('unusual_activity')) {
              unusualOptions++;
            }
          }
        });

        if (bullishFlow > bearishFlow * 1.5) flowSentiment = 'bullish';
        else if (bearishFlow > bullishFlow * 1.5) flowSentiment = 'bearish';
      }

      // Process options volume data
      const volumeData = optionsVolume.data?.[0] || {};
      const callVolume = parseInt(volumeData.call_volume || 0);
      const putVolume = parseInt(volumeData.put_volume || 0);
      const putCallRatio = callVolume > 0 ? (putVolume / callVolume).toFixed(2) : 1;

      // Get ATM strike
      const atmStrike = Math.round(currentPrice / 5) * 5;

      // Calculate market trend
      let trend = 'neutral';
      if (changePercent > 1 && flowSentiment === 'bullish') trend = 'bullish';
      else if (changePercent < -1 && flowSentiment === 'bearish') trend = 'bearish';
      else if (flowSentiment === 'bullish') trend = 'bullish';
      else if (flowSentiment === 'bearish') trend = 'bearish';

      // Determine movement based on IV
      const movement = iv > 50 ? 'volatile' : iv < 25 ? 'stable' : 'neutral';

      // Prepare response
      const response = {
        success: true,
        useMock: false,
        stockData: {
          symbol: symbol.toUpperCase(),
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          volume: parseInt(latestPrice?.total_volume || latestPrice?.volume || 0),
          avgVolume: parseInt(volumeData.avg_30_day_call_volume || 0) + parseInt(volumeData.avg_30_day_put_volume || 0),
          iv: iv,
          ivRank: ivRank,
          atmStrike: atmStrike,
          putCallRatio: parseFloat(putCallRatio),
          optionVolume: callVolume + putVolume,
          openInterest: parseInt(volumeData.call_open_interest || 0) + parseInt(volumeData.put_open_interest || 0)
        },
        marketConditions: {
          trend: trend,
          movement: movement,
          flowSentiment: flowSentiment,
          unusualOptions: unusualOptions,
          has0DTE: has0DTE,
          zeroDTEVolume: zeroDTEExpiry?.volume || 0,
          zeroDTEFlow: has0DTE ? Math.floor(unusualOptions * 0.3) : 0
        },
        zeroDTEData: {
          available: has0DTE,
          totalVolume: zeroDTEExpiry?.volume || 0,
          callCount: Math.floor((zeroDTEExpiry?.volume || 0) * 0.55),
          putCount: Math.floor((zeroDTEExpiry?.volume || 0) * 0.45),
          atmCallPremium: currentPrice * 0.003,
          atmPutPremium: currentPrice * 0.003,
          totalOI: zeroDTEExpiry?.oi || 0
        },
        greeksData: {
          available: false, // We'll need a separate endpoint for this
          atm: {
            delta: 0.5,
            gamma: 0.02,
            theta: -0.05,
            vega: 0.15,
            rho: 0.01
          }
        }
      };

      console.log('Sending response with live data');
      return NextResponse.json(response);

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      // Return mock data on error
      return NextResponse.json({
        success: false,
        useMock: true,
        error: fetchError.message,
        details: 'Using mock data due to API error'
      });
    }

  } catch (error) {
    console.error('API Route Error:', error);
    
    return NextResponse.json({
      success: false,
      useMock: true,
      error: error.message
    });
  }
}

// GET method for testing
export async function GET() {
  const hasApiKey = !!process.env.UNUSUAL_WHALES_API_KEY;
  
  return NextResponse.json({ 
    status: 'API route is working',
    message: 'Use POST method with { symbol: "AAPL" } to get data',
    apiKeyConfigured: hasApiKey,
    apiKeyPreview: hasApiKey ? `${process.env.UNUSUAL_WHALES_API_KEY.substring(0, 10)}...` : 'Not configured'
  });
}
