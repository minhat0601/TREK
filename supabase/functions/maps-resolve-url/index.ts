import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function extractCoords(s: string): { lat: number; lng: number } | null {
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) }
  const data = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (data) return { lat: parseFloat(data[1]), lng: parseFloat(data[2]) }
  const q = s.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Follow redirects automatically to get the final URL
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    })
    const resolvedUrl = pageRes.url || url
    const pageText = await pageRes.text()

    let coords = extractCoords(resolvedUrl)
    if (!coords) {
      coords = extractCoords(pageText)
    }

    if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
      throw new Error('Could not extract coordinates from URL')
    }

    const { lat, lng } = coords

    // Reverse geocode to get address
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'TREK-App/1.0' } }
    )
    const nominatim = await nominatimRes.json()

    // Extract place name from URL path
    let placeName: string | null = null
    const placeMatch = resolvedUrl.match(/\/place\/([^/@]+)/)
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    }

    const name = placeName || nominatim.name || nominatim.address?.tourism || nominatim.address?.building || null
    const address = nominatim.display_name || null

    return new Response(JSON.stringify({ lat, lng, name, address, google_ftid: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
