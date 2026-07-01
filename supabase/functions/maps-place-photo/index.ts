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

  const url = new URL(req.url)
  const apiKey = Deno.env.get("MAPS_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY")

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Google Maps API Key (MAPS_API_KEY) is not configured in Supabase env." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // GET Request: Stream the photo bytes directly to the browser
  if (req.method === 'GET') {
    const placeId = url.searchParams.get("placeId")
    if (!placeId) {
      return new Response("Missing placeId query parameter", { status: 400, headers: corsHeaders })
    }

    try {
      // 1. Get photo reference name from Place Details
      const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=photos`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'photos'
        }
      })
      
      if (!detailsRes.ok) {
        throw new Error(`Failed to fetch place details: ${detailsRes.statusText}`)
      }
      
      const details = await detailsRes.json()
      const photoName = details.photos?.[0]?.name
      
      if (!photoName) {
        return new Response("No photos available for this place", { status: 404, headers: corsHeaders })
      }

      // 2. Fetch photo media bytes
      const mediaRes = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&key=${apiKey}`)
      if (!mediaRes.ok) {
        throw new Error(`Failed to fetch photo media: ${mediaRes.statusText}`)
      }

      const imageBytes = await mediaRes.arrayBuffer()
      return new Response(imageBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': mediaRes.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400'
        }
      })
    } catch (err) {
      return new Response(`Error loading photo: ${err.message}`, { status: 500, headers: corsHeaders })
    }
  }

  // POST Request: Return the self-referencing proxy URL
  if (req.method === 'POST') {
    try {
      const { placeId } = await req.json()
      if (!placeId) {
        return new Response(JSON.stringify({ error: "Missing placeId in body" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const functionUrl = `${url.origin}${url.pathname}?placeId=${encodeURIComponent(placeId)}`
      return new Response(JSON.stringify({ photoUrl: functionUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders })
})
