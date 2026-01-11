import type { AlAdhan, CalculationMethodId, SolunaResponse, QueryParams } from '../types.ts'

const BASE_URLS = [
	'https://api.aladhan.com/v1/timingsByAddress',
	'https://aladhan.api.islamic.network/v1/timingsByAddress',
	'https://aladhan.api.alislam.ru/v1/timingsByAddress',
]

/**
 * Fetches prayer times and sun data from the AlAdhan API with fallback URLs.
 * @param params - Query parameters including address, method, and date
 * @returns Unified Soluna response with prayer and sun data
 */
export default async function getSolunaData(params: QueryParams): Promise<SolunaResponse> {
	const { address, method, date } = params

	let lastError: Error | null = null

	for (const baseUrl of BASE_URLS) {
		try {
			const url = `${baseUrl}/${date}?address=${encodeURIComponent(address)}&method=${method ?? 1}`
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error(`AlAdhan API error: ${response.status} ${response.statusText}`)
			}

			const json: AlAdhan.ApiResponse = await response.json()

			if (json.code !== 200) {
				throw new Error(`AlAdhan API returned error: ${json.status}`)
			}

			return {
				meta: {
					latitude: json.data.meta.latitude,
					longitude: json.data.meta.longitude,
					timezone: json.data.meta.timezone,
					method: {
						id: json.data.meta.method.id,
						name: json.data.meta.method.name,
						params: json.data.meta.method.params,
					},
				},
				date: {
					readable: json.data.date.readable,
					timestamp: json.data.date.timestamp,
					hijri: json.data.date.hijri,
					gregorian: json.data.date.gregorian,
				},
				prayer: json.data.timings,
				sun: {
					sunrise: json.data.timings.Sunrise,
					sunset: json.data.timings.Sunset,
					solarnoon: json.data.timings.Dhuhr, // Solar noon is approximately Dhuhr time
					daylength: calculateDayLength(json.data.timings.Sunrise, json.data.timings.Sunset),
				},
				moon: calculateMoonPhase(parseInt(json.data.date.hijri.day, 10)),
			}
		} catch (err) {
			lastError = err as Error
			// Continue to next URL
		}
	}

	throw lastError || new Error('All AlAdhan API endpoints failed')
}

/**
 * Calculate day length from sunrise and sunset times
 */
function calculateDayLength(sunrise: string, sunset: string): string {
	try {
		const [sunriseH, sunriseM] = sunrise.split(':').map(Number)
		const [sunsetH, sunsetM] = sunset.split(':').map(Number)
		const sunriseMinutes = sunriseH * 60 + sunriseM
		const sunsetMinutes = sunsetH * 60 + sunsetM
		const lengthMinutes = sunsetMinutes - sunriseMinutes
		const hours = Math.floor(lengthMinutes / 60)
		const minutes = lengthMinutes % 60
		return `${hours}h ${minutes}m`
	} catch {
		return '-'
	}
}

/**
 * Calculate moon phase from Hijri day
 * Hijri calendar is lunar: day 1 = new moon, day 8 = first quarter, day 15 = full moon, day 22 = last quarter
 */
function calculateMoonPhase(hijriDay: number): { phase: string; hijriDay: number } {
	let phase: string

	if (hijriDay <= 4) {
		phase = 'New Moon'
	} else if (hijriDay <= 11) {
		phase = 'First Quarter'
	} else if (hijriDay <= 18) {
		phase = 'Full Moon'
	} else if (hijriDay <= 25) {
		phase = 'Last Quarter'
	} else {
		phase = 'New Moon'
	}

	return { phase, hijriDay }
}

/**
 * Returns a list of available calculation methods.
 */
export function getMethods(): { id: CalculationMethodId; name: string }[] {
	return [
		{ id: 0, name: 'Jafari / Shia Ithna-Ashari' },
		{ id: 1, name: 'University of Islamic Sciences, Karachi' },
		{ id: 2, name: 'Islamic Society of North America' },
		{ id: 3, name: 'Muslim World League' },
		{ id: 4, name: 'Umm Al-Qura University, Makkah' },
		{ id: 5, name: 'Egyptian General Authority of Survey' },
		{ id: 7, name: 'Institute of Geophysics, University of Tehran' },
		{ id: 8, name: 'Gulf Region' },
		{ id: 9, name: 'Kuwait' },
		{ id: 10, name: 'Qatar' },
		{ id: 11, name: 'Majlis Ugama Islam Singapura, Singapore' },
		{ id: 12, name: 'Union Organization islamic de France' },
		{ id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey' },
		{ id: 14, name: 'Spiritual Administration of Muslims of Russia' },
		{ id: 15, name: 'Moonsighting Committee Worldwide' },
		{ id: 16, name: 'Dubai (experimental)' },
		{ id: 17, name: 'Jabatan Kemajuan Islam Malaysia (JAKIM)' },
		{ id: 18, name: 'Tunisia' },
		{ id: 19, name: 'Algeria' },
		{ id: 20, name: 'KEMENAG - Kementerian Agama Republik Indonesia' },
		{ id: 21, name: 'Morocco' },
		{ id: 22, name: 'Comunidade Islamica de Lisboa' },
		{ id: 23, name: 'Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan' },
	]
}
