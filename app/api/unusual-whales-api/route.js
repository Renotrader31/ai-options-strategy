export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    // Use the options endpoint from your docs
    const response = await fetch(
      `https://api.unusualwhales.com/api/options?ticker=${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.UW_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Unusual Whales API error:', error);
    return Response.json({ 
      error: 'Failed to fetch data', 
      details: error.message 
    }, { status: 500 });
  }
}
