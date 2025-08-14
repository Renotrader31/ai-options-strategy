export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.unusualwhales.com/api/v1/options/flows/${symbol}?limit=20`,
      {
        headers: {
        'Authorization': `Bearer ${process.env.UW_API_KEY}`
}
        },
      }
    );
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Unusual Whales API error:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
