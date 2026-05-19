/** Browser-like headers used for all requests to fauth.flaschenpost.de
 * and api.flaschen.io. The exact UA / Origin / Referer matter — they
 * help blend in with portal traffic. Values come from the captured HAR. */
const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function browserHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return {
		'User-Agent': UA,
		Accept: 'application/json, text/plain, */*',
		'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
		Origin: 'https://portal.flaschenpost.de',
		Referer: 'https://portal.flaschenpost.de/',
		...extra
	};
}
