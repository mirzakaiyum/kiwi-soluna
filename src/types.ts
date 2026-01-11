/**
 * Calculation method IDs for prayer time calculations.
 * Each method uses different parameters for Fajr and Isha angles.
 */
export const CALCULATION_METHODS = {
	0: 'Jafari / Shia Ithna-Ashari',
	1: 'University of Islamic Sciences, Karachi',
	2: 'Islamic Society of North America',
	3: 'Muslim World League',
	4: 'Umm Al-Qura University, Makkah',
	5: 'Egyptian General Authority of Survey',
	7: 'Institute of Geophysics, University of Tehran',
	8: 'Gulf Region',
	9: 'Kuwait',
	10: 'Qatar',
	11: 'Majlis Ugama Islam Singapura, Singapore',
	12: 'Union Organization islamic de France',
	13: 'Diyanet İşleri Başkanlığı, Turkey',
	14: 'Spiritual Administration of Muslims of Russia',
	15: 'Moonsighting Committee Worldwide',
	16: 'Dubai (experimental)',
	17: 'Jabatan Kemajuan Islam Malaysia (JAKIM)',
	18: 'Tunisia',
	19: 'Algeria',
	20: 'KEMENAG - Kementerian Agama Republik Indonesia',
	21: 'Morocco',
	22: 'Comunidade Islamica de Lisboa',
	23: 'Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan',
} as const

export type CalculationMethodId = keyof typeof CALCULATION_METHODS

export interface QueryParams {
	address: string
	method?: CalculationMethodId
	date: string // DD-MM-YYYY format
}

/** Prayer timings from AlAdhan */
export interface PrayerTimings {
	Fajr: string
	Sunrise: string
	Dhuhr: string
	Asr: string
	Sunset: string
	Maghrib: string
	Isha: string
	Imsak: string
	Midnight: string
	Firstthird: string
	Lastthird: string
}

/** Sun data - sunrise/sunset times */
export interface SunData {
	sunrise: string
	sunset: string
	solarnoon: string
	daylength: string
}

/** Moon phase data calculated from Hijri date */
export interface MoonData {
	phase: string
	hijriDay: number
}

export interface HijriDate {
	date: string
	format: string
	day: string
	weekday: { en: string; ar: string }
	month: { number: number; en: string; ar: string; days: number }
	year: string
	designation: { abbreviated: string; expanded: string }
	holidays: string[]
	adjustedHolidays: string[]
	method: string
}

export interface GregorianDate {
	date: string
	format: string
	day: string
	weekday: { en: string }
	month: { number: number; en: string }
	year: string
	designation: { abbreviated: string; expanded: string }
	lunarSighting: boolean
}

/** Unified Soluna API response with prayer, sun, and moon data */
export interface SolunaResponse {
	meta: {
		latitude: number
		longitude: number
		timezone: string
		method?: {
			id: number
			name: string
			params: { Fajr: number; Isha: number }
		}
	}
	date: {
		readable: string
		timestamp: string
		hijri?: HijriDate
		gregorian: GregorianDate
	}
	prayer: PrayerTimings
	sun: SunData
	moon: MoonData | null // null until moon provider is implemented
}

/** Raw AlAdhan API response structure */
export declare namespace AlAdhan {
	interface ApiResponse {
		code: number
		status: string
		data: {
			timings: PrayerTimings
			date: {
				readable: string
				timestamp: string
				hijri: HijriDate
				gregorian: GregorianDate
			}
			meta: {
				latitude: number
				longitude: number
				timezone: string
				method: {
					id: number
					name: string
					params: { Fajr: number; Isha: number }
					location: { latitude: number; longitude: number }
				}
				latitudeAdjustmentMethod: string
				midnightMode: string
				school: string
				offset: Record<string, number>
			}
		}
	}
}
