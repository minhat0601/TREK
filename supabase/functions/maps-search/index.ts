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
    const { query, lang } = await req.json()
    if (!query) {
      return new Response(JSON.stringify({ places: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get("MAPS_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY")
    
    // Fallback to OpenStreetMap Nominatim if no Google Maps API Key is configured
    if (!apiKey) {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        'accept-language': lang || 'vi',
      })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': 'TREK-App/1.0' }
      })
      if (!response.ok) {
        throw new Error('OSM Nominatim API error')
      }
      const data = await response.json()
      const places = data.map((item: any) => ({
        google_place_id: null,
        google_ftid: null,
        osm_id: `${item.osm_type}:${item.osm_id}`,
        name: item.name || item.display_name?.split(',')[0] || '',
        address: item.display_name || '',
        lat: parseFloat(item.lat) || null,
        lng: parseFloat(item.lon) || null,
        rating: null,
        website: null,
        phone: null,
        types: [],
        source: 'openstreetmap',
      }))
      return new Response(JSON.stringify({ places }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.websiteUri,places.nationalPhoneNumber,places.types,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: lang || 'vi'
      })
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || 'Google Places API error')
    }

    const data = await response.json()
    const places = (data.places || []).map((p: any) => ({
      google_place_id: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      lat: p.location?.latitude || null,
      lng: p.location?.longitude || null,
      rating: p.rating || null,
      website: p.websiteUri || null,
      phone: p.nationalPhoneNumber || null,
      types: p.types || [],
      source: 'google',
    }))

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
