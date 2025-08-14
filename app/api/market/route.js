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

    const headers = {
      'Accept': 'application/json',
      'Authorization': process.env.UW_TOKEN
    };

    // Fetch multiple endpoints in parallel
    const [
      stockResponse,
      optionsVolumeResponse,
      optionsExpiriesResponse,
      greeksResponse,
      volatilityResponse,
      flowResponse
    ] = await Promise.all([
      // Stock price data
      fetch(`https://api.unusualwhales.com/api/stock/${symbol}/price/1m`, { headers }),
      
      // Options volume summary
      fetch(`https://api.unusualwhales.com/api/stock/${symbol}/options/volume/day`, { headers }),
      
      // Options expiries for 0DTE detection
      fetch(`https://api.unusualwhales.com/api/stock/${symbol}/options/expirations`, { headers }),
      
      // Greeks data (for ATM options)
      fetch(`https://api.unusualwhales.com/api/stock/${symbol}/greeks`, { headers }),
      
      // Volatility data
      fetch(`https://api.unusualwhales.com/api/stock/${symbol}/volatility`, { headers }),
      
      // Options flow for sentiment
      fetch(`https://api.unusualwhales.com/api/stock/${symbol}/options/flow/recent?limit=100`, { headers })
    ]);

    // Parse all responses
    const [
      stockData,
      optionsVolume,
      expiriesData,
      greeksData,
      volatilityData,
      flowData
    ] = await Promise.all([
      stockResponse.json(),
      optionsVolumeResponse.json(),
      expiriesResponse.json(),
      greeksResponse.json(),
      volatilityResponse.json(),
      flowResponse.json()
    ]);

    // Process stock data
    const latestPrice = stockData.data?.[0];
    const currentPrice = parseFloat(latestPrice?.close || 0);
    const prevClose = parseFloat(stockData.data?.[1]?.close || currentPrice);
    const change = currentPrice - prevClose;
    const changePercent = (change / prevClose) * 100;

    // Process volatility and IV rank
    const currentVolatility = volatilityData.data;
    const iv = parseFloat(currentVolatility?.iv || 0.30) * 100;
    const ivRank = parseFloat(currentVolatility?.iv_rank || 0.50) * 100;

    // Check for 0DTE availability
    const today = new Date().toISOString().split('T')[0];
    const has0DTE = expiriesData.data?.some(exp => {
      const expiryDate = exp.expires || exp.expiry;
      return expiryDate === today && exp.volume > 0;
    });

    // Get 0DTE volume if available
    const zeroDTEExpiry = expiriesData.data?.find(exp => {
      const expiryDate = exp.expires || exp.expiry;
      return expiryDate === today;
    });

    // Analyze flow sentiment
    const flowSummary = flowData.data?.reduce((acc, flow) => {
      if (flow.tags?.includes('bullish')) acc.bullish++;
      if (flow.tags?.includes('bearish')) acc.bearish++;
      acc.totalPremium += parseFloat(flow.premium || 0);
      acc.totalVolume += parseInt(flow.size || 0);
      return acc;
    }, { bullish: 0, bearish: 0, totalPremium: 0, totalVolume: 0 });

    const flowSentiment = flowSummary.bullish > flowSummary.bearish ? 'bullish' : 
                         flowSummary.bearish > flowSummary.bullish ? 'bearish' : 'neutral';

    // Process options volume data
    const optionsData = optionsVolume.data?.[0] || {};
    const putCallRatio = optionsData.put_volume && optionsData.call_volume ? 
      (optionsData.put_volume / optionsData.call_volume).toFixed(2) : 1;

    // Get ATM strike
    const atmStrike = Math.round(currentPrice / 5) * 5;

    // Find ATM Greeks
    const atmGreeks = greeksData.data?.find(g => 
      Math.abs(parseFloat(g.strike) - atmStrike) < 2.5
    ) || {};

    // Calculate market trend based on multiple factors
    let trend = 'neutral';
    if (changePercent > 1 && flowSentiment === 'bullish') trend = 'bullish';
    else if (changePercent < -1 && flowSentiment === 'bearish') trend = 'bearish';
    else if (flowSentiment === 'bullish') trend = 'bullish';
    else if (flowSentiment === 'bearish') trend = 'bearish';

    // Determine movement based on IV
    const movement = iv > 50 ? 'volatile' : iv < 25 ? 'stable' : 'neutral';

    // Count unusual options
    const unusualOptions = flowData.data?.filter(f => 
      f.tags?.includes('sweep') || f.tags?.includes('unusual_activity')
    ).length || 0;

    // Prepare response
    const response = {
      success: true,
      useMock: false,
      stockData: {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: parseInt(latestPrice?.total_volume || 0),
        avgVolume: parseInt(optionsData.avg_30_day_call_volume || 0) + parseInt(optionsData.avg_30_day_put_volume || 0),
        iv: iv,
        ivRank: ivRank,
        atmStrike: atmStrike,
        putCallRatio: parseFloat(putCallRatio),
        optionVolume: parseInt(optionsData.call_volume || 0) + parseInt(optionsData.put_volume || 0),
        openInterest: parseInt(optionsData.call_open_interest || 0) + parseInt(optionsData.put_open_interest || 0)
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
        available: true,
        atm: {
          delta: parseFloat(atmGreeks.call_delta || 0.5),
          gamma: parseFloat(atmGreeks.call_gamma || 0.02),
          theta: parseFloat(atmGreeks.call_theta || -0.05),
          vega: parseFloat(atmGreeks.call_vega || 0.15),
          rho: parseFloat(atmGreeks.call_rho || 0.01)
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error:', error);
    
    // Return error with mock data fallback
    return NextResponse.json({
      success: false,
      useMock: true,
      error: error.message
    });
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'API route is working',
    message: 'Use POST method with { symbol: "AAPL" } to get data'
  });
}
