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
    const { placeId, lang } = await req.json()
    if (!placeId) {
      return new Response(JSON.stringify({ error: "Missing placeId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get("MAPS_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY")
    const isOsmId = placeId.includes(':') // e.g. node:12345, way:12345

    // Fallback to OSM Nominatim if it's an OSM ID or Google Maps key is not configured
    if (isOsmId || !apiKey) {
      const parts = placeId.split(':')
      const osmType = parts[0] || 'node'
      const osmId = parts[1] || placeId
      const typePrefix = osmType.charAt(0).toUpperCase() // N, W, R

      const params = new URLSearchParams({
        osm_ids: `${typePrefix}${osmId}`,
        format: 'json',
        'accept-language': lang || 'vi',
      })

      const response = await fetch(`https://nominatim.openstreetmap.org/lookup?${params}`, {
        headers: { 'User-Agent': 'TREK-App/1.0' }
      })
      if (!response.ok) {
        throw new Error('OSM Nominatim Details API error')
      }

      const data = await response.json()
      const item = data[0]
      if (!item) {
        throw new Error('Place not found')
      }

      const displayParts = (item.display_name || '').split(',').map((s: string) => s.trim())
      const place = {
        google_place_id: null,
        osm_id: placeId,
        name: item.name || displayParts[0] || '',
        address: item.display_name || '',
        lat: parseFloat(item.lat) || null,
        lng: parseFloat(item.lon) || null,
        rating: null,
        rating_count: null,
        website: null,
        phone: null,
        opening_hours: null,
        open_now: null,
        google_maps_url: null,
        summary: null,
        reviews: [],
        source: 'openstreetmap',
        cached_at: Date.now()
      }

      return new Response(JSON.stringify({ place }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const langKey = lang || 'vi'
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${langKey}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,websiteUri,nationalPhoneNumber,regularOpeningHours,googleMapsUri',
      }
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || 'Google Places API error')
    }

    const data = await response.json()
    const place = {
      google_place_id: data.id,
      name: data.displayName?.text || '',
      address: data.formattedAddress || '',
      lat: data.location?.latitude || null,
      lng: data.location?.longitude || null,
      rating: data.rating || null,
      rating_count: data.userRatingCount || null,
      website: data.websiteUri || null,
      phone: data.nationalPhoneNumber || null,
      opening_hours: data.regularOpeningHours?.weekdayDescriptions || null,
      open_now: data.regularOpeningHours?.openNow ?? null,
      google_maps_url: data.googleMapsUri || null,
      summary: null,
      reviews: [],
      source: 'google',
      cached_at: Date.now()
    }

    return new Response(JSON.stringify({ place }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
