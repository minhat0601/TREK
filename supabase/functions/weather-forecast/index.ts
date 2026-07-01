import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const WMO_MAP: Record<number, string> = {
  0: 'Clear', 1: 'Clear', 2: 'Clouds', 3: 'Clouds',
  45: 'Fog', 48: 'Fog',
  51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Drizzle', 57: 'Drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Rain', 66: 'Rain', 67: 'Rain',
  71: 'Snow', 73: 'Snow', 75: 'Snow', 77: 'Snow',
  80: 'Rain', 81: 'Rain', 82: 'Rain',
  85: 'Snow', 86: 'Snow',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
}

const WMO_DESCRIPTION_EN: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Light snowfall', 73: 'Snowfall', 75: 'Heavy snowfall', 77: 'Snow grains',
  80: 'Light rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
  85: 'Light snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail',
}

function estimateCondition(tempAvg: number, precipMm: number): string {
  if (precipMm > 5) return tempAvg <= 0 ? 'Snow' : 'Rain';
  if (precipMm > 1) return tempAvg <= 0 ? 'Snow' : 'Drizzle';
  if (precipMm > 0.3) return 'Clouds';
  return tempAvg > 15 ? 'Clear' : 'Clouds';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lng, date, lang } = await req.json()
    if (lat === undefined || lng === undefined) {
      return new Response(JSON.stringify({ error: "Missing lat/lng" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Default current weather or archive/forecast based on targetDate
    if (date) {
      const targetDate = new Date(date)
      const now = new Date()
      const diffDays = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      if (diffDays >= -1 && diffDays <= 16) {
        // Forecast
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=16`
        const response = await fetch(url)
        const data = await response.json()
        
        const dateStr = targetDate.toISOString().slice(0, 10)
        const idx = (data.daily?.time || []).indexOf(dateStr)

        if (idx !== -1) {
          const code = data.daily.weathercode[idx]
          const result = {
            temp: Math.round((data.daily.temperature_2m_max[idx] + data.daily.temperature_2m_min[idx]) / 2),
            temp_max: Math.round(data.daily.temperature_2m_max[idx]),
            temp_min: Math.round(data.daily.temperature_2m_min[idx]),
            main: WMO_MAP[code] || 'Clouds',
            description: WMO_DESCRIPTION_EN[code] || '',
            type: 'forecast',
          }
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Climate/archive fallback
      const dateStr = targetDate.toISOString().slice(0, 10)
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`
      const response = await fetch(url)
      const data = await response.json()

      const daily = data.daily
      if (daily && daily.time && daily.time.length > 0 && daily.temperature_2m_max[0] != null) {
        const code = daily.weathercode?.[0]
        const tMax = daily.temperature_2m_max[0]
        const tMin = daily.temperature_2m_min[0]
        const result = {
          temp: Math.round((tMax + tMin) / 2),
          temp_max: Math.round(tMax),
          temp_min: Math.round(tMin),
          main: WMO_MAP[code!] || estimateCondition((tMax + tMin) / 2, daily.precipitation_sum?.[0] || 0),
          description: WMO_DESCRIPTION_EN[code!] || '',
          type: 'forecast',
        }
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Current weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&timezone=auto`
    const response = await fetch(url)
    const data = await response.json()

    const code = data.current.weathercode
    const result = {
      temp: Math.round(data.current.temperature_2m),
      main: WMO_MAP[code] || 'Clouds',
      description: WMO_DESCRIPTION_EN[code] || '',
      type: 'current',
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
