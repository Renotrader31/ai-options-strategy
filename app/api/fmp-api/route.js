export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.FMP_API_KEY}`
    );
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('FMP API error:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
