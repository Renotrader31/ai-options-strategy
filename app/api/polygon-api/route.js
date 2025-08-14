export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`
    );
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Polygon API error:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
