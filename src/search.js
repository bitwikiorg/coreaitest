import { output } from './output-manager.js';
import { suggestSearchProvider, } from './search/providers.js';
export async function search(query) {
    try {
        const searchQuery = String(query || '').trim();
        if (!searchQuery) {
            return [];
        }
        output.log('Starting web search...');
        const results = await suggestSearchProvider({ type: 'web' }).search(searchQuery);
        return results.map(toSearchItem);
    }
    catch (error) {
        output.log('Search error:', error);
        return [];
    }
}
function toSearchItem(result) {
    return {
        content: result.content,
        source: result.source,
    };
}
