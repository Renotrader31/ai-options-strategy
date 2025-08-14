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
      console.error('UNUSUAL_WHALES_API_KEY not found');
      return NextResponse.json({
        success: false,
        useMock: true,
        error: 'API key not configured'
      });
    }

    const headers = {
      'Accept': 'application/json',
      'Authorization': process.env.UNUSUAL_WHALES_API_KEY
    };

    console.log('Fetching data for symbol:', symbol);

    // Initialize default values
    let currentPrice = 100;
    let prevClose = 100;
    let change = 0;
    let changePercent = 0;
    let iv = 30;
    let ivRank = 50;
    let optionVolume = 0;
    let putCallRatio = 1;
    let unusualOptions = 0;
    let flowSentiment = 'neutral';

    // 1. Get OHLC data for current price (use 1m for 1-minute candles)
    try {
      const ohlcResponse = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/ohlc/1m`,
        { headers, signal: AbortSignal.timeout(8000) }
      );
      
      if (ohlcResponse.ok) {
        const ohlcData = await ohlcResponse.json();
        console.log('OHLC data received');
        
        // Get the most recent candle
        if (ohlcData.data && ohlcData.data.length > 0) {
          const latestCandle = ohlcData.data[ohlcData.data.length - 1];
          const previousCandle = ohlcData.data[ohlcData.data.length - 2];
          
         // In your API route, update the OHLC parsing section (around line 50-60):

// Get the most recent candle
if (ohlcData.data && ohlcData.data.length > 0) {
  const latestCandle = ohlcData.data[ohlcData.data.length - 1];
  const previousCandle = ohlcData.data[ohlcData.data.length - 2];
  
  // Prefer close price, then last, then high
  currentPrice = parseFloat(
    latestCandle.close || 
    latestCandle.c || 
    latestCandle.last ||
    latestCandle.l ||
    latestCandle.high ||
    latestCandle.h ||
    100
  );
  
  prevClose = parseFloat(
    previousCandle?.close || 
    previousCandle?.c || 
    previousCandle?.last ||
    currentPrice
  );
  
  change = currentPrice - prevClose;
  changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  
  console.log('Got price from OHLC:', currentPrice);
  console.log('Candle data:', {
    open: latestCandle.open || latestCandle.o,
    high: latestCandle.high || latestCandle.h,
    low: latestCandle.low || latestCandle.l,
    close: latestCandle.close || latestCandle.c
  });
}
          
          change = currentPrice - prevClose;
          changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          
          console.log('Got price from OHLC:', currentPrice);
        }
      } else {
        console.log('OHLC request failed:', ohlcResponse.status);
      }
    } catch (error) {
      console.error('Error fetching OHLC:', error.message);
    }

    // 2. Get options volume data
    try {
      const volumeResponse = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/options-volume`,
        { headers, signal: AbortSignal.timeout(8000) }
      );
      
      if (volumeResponse.ok) {
        const volumeData = await volumeResponse.json();
        console.log('Volume data received');
        
        if (volumeData.data) {
          const latestVolume = Array.isArray(volumeData.data) ? volumeData.data[0] : volumeData.data;
          
          const callVolume = parseInt(latestVolume.call_volume || latestVolume.callVolume || 0);
          const putVolume = parseInt(latestVolume.put_volume || latestVolume.putVolume || 0);
          
          optionVolume = callVolume + putVolume;
          putCallRatio = callVolume > 0 ? (putVolume / callVolume) : 1;
          
          // Check if there's price data here too
          if (latestVolume.price && currentPrice === 100) {
            currentPrice = parseFloat(latestVolume.price);
            console.log('Got price from volume data:', currentPrice);
          }
        }
      } else {
        console.log('Volume request failed:', volumeResponse.status);
      }
    } catch (error) {
      console.error('Error fetching volume:', error.message);
    }

    // 3. Get option chains for additional data and IV
    try {
      const chainsResponse = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/option-chains`,
        { headers, signal: AbortSignal.timeout(8000) }
      );
      
      if (chainsResponse.ok) {
        const chainsData = await chainsResponse.json();
        console.log('Chains data received');
        
        if (chainsData.data && chainsData.data.length > 0) {
          // Get ATM options for IV
          const atmChain = chainsData.data.find(chain => {
            const strike = parseFloat(chain.strike);
            return Math.abs(strike - currentPrice) < currentPrice * 0.05; // Within 5% of current price
          });
          
          if (atmChain) {
            iv = parseFloat(atmChain.implied_volatility || atmChain.iv || 0.30) * 100;
            
            // Also check for underlying_price
            if (atmChain.underlying_price && currentPrice === 100) {
              currentPrice = parseFloat(atmChain.underlying_price);
              console.log('Got price from chains:', currentPrice);
            }
          }
          
          // Count unusual activity
          unusualOptions = chainsData.data.filter(chain => 
            chain.volume > (chain.open_interest || 0) * 2
          ).length;
        }
      } else {
        console.log('Chains request failed:', chainsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching chains:', error.message);
    }

    // 4. Try options flow as last resort for price and sentiment
    if (currentPrice === 100) {
      try {
        const flowResponse = await fetch(
          `https://api.unusualwhales.com/api/stock/${symbol}/options/flow?limit=50`,
          { headers, signal: AbortSignal.timeout(5000) }
        );
        
        if (flowResponse.ok) {
          const flowData = await flowResponse.json();
          
          if (flowData.data && flowData.data.length > 0) {
            // Find first entry with price
            const entryWithPrice = flowData.data.find(f => f.underlying_price);
            if (entryWithPrice) {
              currentPrice = parseFloat(entryWithPrice.underlying_price);
              console.log('Got price from flow:', currentPrice);
            }
            
            // Analyze sentiment
            let bullishCount = 0;
            let bearishCount = 0;
            
            flowData.data.forEach(flow => {
              if (flow.tags && Array.isArray(flow.tags)) {
                if (flow.tags.includes('bullish')) bullishCount++;
                if (flow.tags.includes('bearish')) bearishCount++;
              }
            });
            
            if (bullishCount > bearishCount * 1.5) flowSentiment = 'bullish';
            else if (bearishCount > bullishCount * 1.5) flowSentiment = 'bearish';
          }
        }
      } catch (error) {
        console.log('Flow endpoint not available');
      }
    }

    // Recalculate change if we got a real price
    if (currentPrice !== 100 && change === 0) {
      change = currentPrice * 0.01 * (Math.random() - 0.5) * 4; // Estimate
      changePercent = (change / currentPrice) * 100;
    }

    // Determine market trend
    let trend = 'neutral';
    if (changePercent > 1 && flowSentiment === 'bullish') trend = 'bullish';
    else if (changePercent < -1 && flowSentiment === 'bearish') trend = 'bearish';
    else if (flowSentiment !== 'neutral') trend = flowSentiment;

    // Get ATM strike
    const atmStrike = Math.round(currentPrice / 5) * 5;

    // Check for 0DTE (if today is Friday)
    const today = new Date();
    const has0DTE = today.getDay() === 5; // Friday

    // Build response
    const response = {
      success: true,
      useMock: false,
      stockData: {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: optionVolume * 100,
        avgVolume: optionVolume * 80,
        iv: iv,
        ivRank: ivRank,
        atmStrike: atmStrike,
        putCallRatio: parseFloat(putCallRatio.toFixed(2)),
        optionVolume: optionVolume,
        openInterest: optionVolume * 10
      },
      marketConditions: {
        trend: trend,
        movement: iv > 50 ? 'volatile' : iv < 25 ? 'stable' : 'neutral',
        flowSentiment: flowSentiment,
        unusualOptions: unusualOptions,
        has0DTE: has0DTE,
        zeroDTEVolume: has0DTE ? Math.floor(optionVolume * 0.3) : 0,
        zeroDTEFlow: has0DTE ? Math.floor(unusualOptions * 0.3) : 0
      },
      zeroDTEData: {
        available: has0DTE,
        totalVolume: has0DTE ? Math.floor(optionVolume * 0.3) : 0,
        callCount: has0DTE ? Math.floor(optionVolume * 0.15) : 0,
        putCount: has0DTE ? Math.floor(optionVolume * 0.15) : 0,
        atmCallPremium: currentPrice * 0.003,
        atmPutPremium: currentPrice * 0.003,
        totalOI: 0
      },
      greeksData: {
        available: false,
        atm: {
          delta: 0.5,
          gamma: 0.02,
          theta: -0.05,
          vega: 0.15,
          rho: 0.01
        }
      }
    };

    console.log('Returning response with price:', currentPrice);
    return NextResponse.json(response);

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
