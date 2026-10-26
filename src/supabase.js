// ===== SUPABASE CLIENT & ONLINE LEADERBOARD INTEGRATION =====
// Zero-dependency REST PostgREST client with RLS security

export class SupabaseLeaderboard {
  constructor() {
    this.url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? import.meta.env.VITE_SUPABASE_URL.trim().replace(/\/$/, '') : '';
    this.anonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim() : '';
  }

  isConfigured() {
    return !!(this.url && this.anonKey);
  }

  async fetchTopScores(limit = 10) {
    if (!this.isConfigured()) {
      return { success: false, configured: false, scores: [] };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const endpoint = `${this.url}/rest/v1/leaderboard?select=player_name,score,created_at&order=score.desc,created_at.asc&limit=${limit}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, configured: true, error: `HTTP ${res.status}`, scores: [] };
      }

      const data = await res.json();
      return { success: true, configured: true, scores: Array.isArray(data) ? data : [] };
    } catch (err) {
      return { success: false, configured: true, error: err.message, scores: [] };
    }
  }

  async submitScore(playerName, score) {
    if (!this.isConfigured()) {
      return { success: false, configured: false };
    }

    const trimmedName = (playerName || 'Petualang').trim().substring(0, 20);
    const validScore = Math.max(0, Math.min(99999, Math.floor(score || 0)));

    if (validScore <= 0) {
      return { success: false, configured: true, error: 'Skor harus lebih besar dari 0' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const endpoint = `${this.url}/rest/v1/leaderboard`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          player_name: trimmedName,
          score: validScore
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, configured: true, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { success: true, configured: true, record: data[0] };
    } catch (err) {
      return { success: false, configured: true, error: err.message };
    }
  }
}

export const supabaseLeaderboard = new SupabaseLeaderboard();
