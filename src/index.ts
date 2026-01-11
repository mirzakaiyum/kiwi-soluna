import * as aladhan from './providers/aladhan.ts'
import { CALCULATION_METHODS, type CalculationMethodId, type QueryParams } from './types.ts'

/**
 * Kiwi-Soluna: Sun, Moon & Prayer Times API
 * A zero-dependency Cloudflare Worker that provides spiritual time data.
 *
 * Query parameters:
 * - address (required): Location string (e.g., "Dhaka", "London,UK")
 * - method (optional, default: 1): Calculation method ID (0-23)
 * - date (optional, default: today): Date in DD-MM-YYYY format
 * - methods (optional): If "true", returns list of available methods
 */
export default { fetch: main }

async function main(request: Request): Promise<Response> {
	const url = new URL(request.url)
	const pathname = url.pathname
	const address = url.searchParams.get('address') ?? 'London'
	const methodParam = url.searchParams.get('method') ?? '1'
	const showMethods = url.searchParams.get('methods') ?? ''

	let body = ''
	let status = 200
	const contentType = 'application/json'
	const cacheControl = 'no-cache' // Disable caching

	try {
		// Return list of calculation methods
		if (showMethods === 'true') {
			body = JSON.stringify({
				methods: aladhan.getMethods(),
			})
			return createResponse(body, status, contentType, cacheControl)
		}

		// Serve HTML landing page at root
		if (pathname === '/' && !address) {
			return new Response(LANDING_PAGE_HTML, {
				status: 200,
				headers: {
					'content-type': 'text/html',
					'cache-control': 'no-cache',
				},
			})
		}

		// API endpoint: /api/{date}?address=x&method=y
		// Date format: DD-MM-YYYY
		const apiMatch = pathname.match(/^\/api\/(\d{2}-\d{2}-\d{4})$/)
		const date = apiMatch ? apiMatch[1] : getTodayDate()

		// Require address for API calls
		if (!address) {
			status = 400
			body = JSON.stringify({ status: 400, error: 'Missing required parameter: address' })
			return createResponse(body, status, contentType, 'no-cache')
		}

		// Parse method
		const method = parseInt(methodParam, 10)
		if (!(method in CALCULATION_METHODS)) {
			status = 400
			body = JSON.stringify({
				status: 400,
				error: `Invalid method: ${method}. Valid methods are: ${Object.keys(CALCULATION_METHODS).join(', ')}`,
			})
			return createResponse(body, status, contentType, 'no-cache')
		}

		const params: QueryParams = {
			address,
			method: method as CalculationMethodId,
			date,
		}

		const solunaData = await aladhan.default(params)
		body = JSON.stringify(solunaData)
	} catch (err) {
		const { message } = err as Error
		status = 503
		body = JSON.stringify({ status: 503, error: message })
		console.error(err)
	}

	return createResponse(body, status, contentType, cacheControl)
}

function createResponse(body: string, status: number, contentType: string, cacheControl: string): Response {
	return new Response(body, {
		status,
		headers: {
			'access-control-allow-methods': 'GET',
			'access-control-allow-origin': '*',
			'content-type': contentType,
			'cache-control': cacheControl,
		},
	})
}

/**
 * Returns today's date in DD-MM-YYYY format.
 */
function getTodayDate(): string {
	const now = new Date()
	const day = String(now.getDate()).padStart(2, '0')
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const year = now.getFullYear()
	return `${day}-${month}-${year}`
}

const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Kiwi Soluna API</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #0a0e1a; color: #a8b3c1; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
        .header { padding: 10px 0; margin-bottom: 32px; border-bottom: 1px solid #2a3447; background-color: #0e1425; }
        .columns { display: grid; grid-template-columns: 480px 1fr; gap: 32px; }
        .left-column, .right-column { display: flex; flex-direction: column; gap: 24px; }
        h1 { color: #e8ecf1; font-size: 24px; font-weight: 600; }
        .subtitle { color: #6b7785; font-size: 14px; margin-bottom: 6px; }
        @media (max-width: 968px) { .columns { grid-template-columns: 1fr; } }
        h2 { color: #e8ecf1; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
        .section { background: #151b2b; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        label { display: block; color: #a8b3c1; font-size: 13px; margin-bottom: 6px; font-weight: 500; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .form-grid > div:first-child { grid-column: 1 / -1; }
        input[type="text"], input[type="date"], select { width: 100%; background: #1e2639; border: 1px solid #2a3447; border-radius: 6px; padding: 10px 12px; color: #ffffff; font-size: 14px; outline: none; transition: all 0.2s; }
        input[type="text"]:focus, input[type="date"]:focus, select:focus { border-color: #4a90e2; background: #232c42; }
        input::placeholder { color: #5a6578; }
        select option { background: #1e2639; color: #ffffff; }
        .btn-group { display: flex; gap: 12px; margin-top: 16px; }
        button { background: #2d7a4d; color: #ffffff; border: none; border-radius: 6px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        button:hover:not(:disabled) { background: #3d8a5d; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        button.secondary { background: #2a3447; }
        button.secondary:hover:not(:disabled) { background: #35405a; }
        .path-box { background: #1e2639; border: 1px solid #2a3447; border-radius: 6px; padding: 12px 14px; font-family: "Monaco", "Menlo", "Courier New", monospace; font-size: 13px; color: #6b94ce; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; min-height: 44px; }
        .path-box code { flex: 1; word-break: break-all; }
        .copy-btn { background: transparent; border: 1px solid #2a3447; padding: 6px 12px; margin-left: 12px; border-radius: 4px; font-size: 12px; color: #a8b3c1; cursor: pointer; transition: all 0.2s; }
        .copy-btn:hover { border-color: #2d7a4d; color: #2d7a4d; background: #1e2639; }
        .json-output { background: #1e2639; border: 1px solid #2a3447; border-radius: 6px; padding: 16px; font-family: "Monaco", "Menlo", "Courier New", monospace; font-size: 13px; color: #e8ecf1; white-space: pre-wrap; overflow-x: auto; min-height: 200px; max-height: 500px; overflow-y: auto; }
        .json-output:empty::before { content: "Response will appear here..."; color: #5a6578; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #2a3447; }
        th { color: #a8b3c1; font-weight: 600; font-size: 13px; background: #1a2132; }
        td { color: #8895a7; font-size: 13px; }
        td:first-child { color: #e8ecf1; font-family: "Monaco", "Menlo", "Courier New", monospace; font-size: 12px; }
        tr:last-child td { border-bottom: none; }
        .tag { display: inline-block; background: #2a3447; color: #6b94ce; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .tag.required { background: #4a3535; color: #e88484; }
        .hidden { display: none; }
        .prayer-times { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
        .prayer-card { background: #1a2132; border-radius: 8px; padding: 16px; text-align: center; }
        .prayer-name { color: #6b7785; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .prayer-time { color: #e8ecf1; font-size: 20px; font-weight: 600; }
        .date-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .date-card { background: #1a2132; border-radius: 8px; padding: 12px; }
        .date-label { color: #6b7785; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .date-value { color: #e8ecf1; font-size: 14px; font-weight: 500; }
        .radio-group { display: flex; gap: 16px; flex-wrap: wrap; }
        .radio-label { display: flex; align-items: center; gap: 6px; color: #a8b3c1; font-size: 14px; cursor: pointer; }
        .radio-label input[type="radio"] { accent-color: #2d7a4d; width: 16px; height: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>☀️🌙 Soluna API</h1>
            <p class="subtitle">Sun, Moon & Prayer Times API for Kiwi Tab.</p>
        </div>
    </div>
    <div class="container">
        <div class="columns">
            <div class="left-column">
                <div class="section">
                    <form id="qform" novalidate>
                        <div class="form-grid">
                            <div>
                                <label for="address">Location</label>
                                <input id="address" name="address" type="text" placeholder="Dhaka, Bangladesh" autocomplete="off" />
                            </div>
                            <div>
                                <label for="method">Calculation Method</label>
                                <select id="method" name="method">
                                    <option value="1">University of Islamic Sciences, Karachi</option>
                                    <option value="0">Jafari / Shia Ithna-Ashari</option>
                                    <option value="2">Islamic Society of North America</option>
                                    <option value="3">Muslim World League</option>
                                    <option value="4">Umm Al-Qura University, Makkah</option>
                                    <option value="5">Egyptian General Authority of Survey</option>
                                    <option value="7">Institute of Geophysics, University of Tehran</option>
                                    <option value="8">Gulf Region</option>
                                    <option value="9">Kuwait</option>
                                    <option value="10">Qatar</option>
                                    <option value="11">Majlis Ugama Islam Singapura</option>
                                    <option value="12">Union Organization islamic de France</option>
                                    <option value="13">Diyanet İşleri Başkanlığı, Turkey</option>
                                    <option value="14">Spiritual Administration of Muslims of Russia</option>
                                    <option value="15">Moonsighting Committee Worldwide</option>
                                    <option value="16">Dubai (experimental)</option>
                                    <option value="17">JAKIM, Malaysia</option>
                                    <option value="18">Tunisia</option>
                                    <option value="19">Algeria</option>
                                    <option value="20">KEMENAG, Indonesia</option>
                                    <option value="21">Morocco</option>
                                    <option value="22">Comunidade Islamica de Lisboa</option>
                                    <option value="23">Ministry of Awqaf, Jordan</option>
                                </select>
                            </div>
                            <div>
                                <label for="date">Date</label>
                                <input id="date" name="date" type="date" />
                            </div>
                        </div>
                        <div class="btn-group">
                            <button id="send" type="submit">Get Prayer Times</button>
                            <button id="clear" type="button" class="secondary">Clear</button>
                        </div>
                    </form>
                </div>
            </div>
            <div class="right-column">
                <div id="endpointSection">
                    <h2>End Point</h2>
                    <div class="path-box">
                        <code id="endpoint">/?address=Dhaka&amp;method=1</code>
                        <button class="copy-btn" id="copyBtn">Copy</button>
                    </div>
                </div>
                <div class="hidden" id="prayerSection">
                    <h2>Prayer Times</h2>
                    <div class="section">
                        <div class="date-info">
                            <div class="date-card"><div class="date-label">Gregorian</div><div class="date-value" id="gregorianDate">-</div></div>
                            <div class="date-card"><div class="date-label">Hijri</div><div class="date-value" id="hijriDate">-</div></div>
                        </div>
                        <div class="prayer-times" id="prayerTimes"></div>
                    </div>
                </div>
                <div class="hidden" id="responseSection">
                    <h2>Response Body</h2>
                    <div class="section"><pre id="result" class="json-output"></pre></div>
                </div>
                <div>
                    <h2>Path Parameters</h2>
                    <div class="section">
                        <table>
                            <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td>address</td><td>string</td><td><span class="tag required">required</span></td><td>Location string (e.g., "Dhaka")</td></tr>
                                <tr><td>method</td><td>number</td><td><span class="tag">optional</span></td><td>Prayer calculation method ID (0-23, default: 1)</td></tr>
                            </tbody>
                        </table>
                        <p style="margin-top:12px;color:#6b7785;font-size:13px;">Path format: <code>/api/{DD-MM-YYYY}</code></p>
                    </div>
                </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        const form = document.getElementById("qform");
        const result = document.getElementById("result");
        const endpoint = document.getElementById("endpoint");
        const send = document.getElementById("send");
        const clearBtn = document.getElementById("clear");
        const copyBtn = document.getElementById("copyBtn");
        const endpointSection = document.getElementById("endpointSection");
        const responseSection = document.getElementById("responseSection");
        const prayerSection = document.getElementById("prayerSection");
        const prayerTimes = document.getElementById("prayerTimes");
        const gregorianDate = document.getElementById("gregorianDate");
        const hijriDate = document.getElementById("hijriDate");
        const dateInput = document.getElementById("date");
        dateInput.valueAsDate = new Date();

        function formatDateForApi(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
        }

        function updateEndpoint() {
            const formData = Object.fromEntries(new FormData(form).entries());
            const dateStr = formData.date ? formatDateForApi(formData.date) : formatDateForApi(new Date().toISOString().split('T')[0]);
            const params = new URLSearchParams();
            if (formData.address) params.append("address", formData.address);
            if (formData.method) params.append("method", formData.method);
            endpoint.textContent = "/api/" + dateStr + "?" + params.toString();
        }

        function displaySolunaData(data) {
            const items = [
                { name: "Fajr", time: data.prayer.Fajr },
                { name: "Sunrise", time: data.sun.sunrise },
                { name: "Dhuhr", time: data.prayer.Dhuhr },
                { name: "Asr", time: data.prayer.Asr },
                { name: "Sunset", time: data.sun.sunset },
                { name: "Maghrib", time: data.prayer.Maghrib },
                { name: "Isha", time: data.prayer.Isha },
                { name: "Day Length", time: data.sun.daylength },
                { name: "Moon Phase", time: data.moon ? data.moon.phase : '-' },
            ];
            prayerTimes.innerHTML = items.map(p => '<div class="prayer-card"><div class="prayer-name">' + p.name + '</div><div class="prayer-time">' + p.time + '</div></div>').join('');
            gregorianDate.textContent = data.date.readable || data.date.gregorian.date;
            hijriDate.textContent = data.date.hijri ? (data.date.hijri.day + ' ' + data.date.hijri.month.en + ' ' + data.date.hijri.year) : '-';
        }

        form.addEventListener("input", updateEndpoint);

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            if (!data.address) {
                result.textContent = "Error: Please enter a location.";
                endpointSection.classList.remove("hidden");
                responseSection.classList.remove("hidden");
                prayerSection.classList.add("hidden");
                return;
            }
            send.disabled = true;
            send.textContent = "Loading...";
            result.textContent = "";
            endpointSection.classList.remove("hidden");
            responseSection.classList.remove("hidden");
            try {
                const dateStr = data.date ? formatDateForApi(data.date) : formatDateForApi(new Date().toISOString().split('T')[0]);
                const params = new URLSearchParams();
                params.append("address", data.address);
                params.append("method", data.method || "1");
                const res = await fetch("/api/" + dateStr + "?" + params);
                if (!res.ok) throw new Error(res.status + " " + res.statusText);
                const json = await res.json();
                result.textContent = JSON.stringify(json, null, 2);
                if (json.prayer) {
                    displaySolunaData(json);
                    prayerSection.classList.remove("hidden");
                }
            } catch (err) {
                result.textContent = "Error: " + err.message;
                prayerSection.classList.add("hidden");
            } finally {
                send.disabled = false;
                send.textContent = "Get Prayer Times";
            }
        });

        clearBtn.addEventListener("click", () => {
            form.reset();
            dateInput.valueAsDate = new Date();
            result.textContent = "";
            updateEndpoint();
            endpointSection.classList.add("hidden");
            responseSection.classList.add("hidden");
            prayerSection.classList.add("hidden");
        });

        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(endpoint.textContent);
                copyBtn.textContent = "Copied!";
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
            } catch (err) { console.error("Failed to copy:", err); }
        });

        updateEndpoint();
    </script>
</body>
</html>`
