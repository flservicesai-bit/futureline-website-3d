/**
 * Loads a JSON list for an admin or instructor table.
 *
 * On an error response (an expired session, a server error) the API returns
 * an `{ error }` object; pages put that straight into state and then crashed
 * on ".filter is not a function". This returns an empty list instead and logs
 * why, so the page stays usable.
 */
export async function fetchList<T = any>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[fetchList] ${url} returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[fetchList] ${url} failed`, error);
    return [];
  }
}
