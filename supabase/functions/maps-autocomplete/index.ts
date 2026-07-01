import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { input, lang, locationBias } = await req.json()
    if (!input) {
      return new Response(JSON.stringify({ suggestions: [], source: 'google' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get("MAPS_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY")

    // Fallback to OSM Nominatim if no Google Maps API Key is configured
    if (!apiKey) {
      const params = new URLSearchParams({
        q: input,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        'accept-language': lang || 'vi',
      })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'TREK-App/1.0' }
      })
      if (!response.ok) {
        throw new Error('OSM Nominatim API error')
      }
      const data = await response.json()
      const suggestions = data
        .filter((item: any) => item.osm_type && item.osm_id)
        .map((item: any) => {
          const parts = (item.display_name || '').split(',').map((s: string) => s.trim())
          return {
            placeId: `${item.osm_type}:${item.osm_id}`,
            mainText: item.name || parts[0] || '',
            secondaryText: parts.slice(1).join(', '),
          }
        })
      return new Response(JSON.stringify({ suggestions, source: 'nominatim' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body: any = {
      input,
      languageCode: lang || 'vi'
    }

    if (locationBias) {
      body.locationBias = {
        rectangle: {
          low: { latitude: locationBias.low.lat, longitude: locationBias.low.lng },
          high: { latitude: locationBias.high.lat, longitude: locationBias.high.lng },
        },
      }
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || 'Google Places Autocomplete error')
    }

    const data = await response.json()
    const suggestions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .slice(0, 5)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat?.mainText?.text || '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
      }))

    return new Response(JSON.stringify({ suggestions, source: 'google' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
