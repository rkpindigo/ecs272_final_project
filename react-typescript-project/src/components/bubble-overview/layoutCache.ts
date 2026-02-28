type LayoutCacheEntry<T> = {
    key: string;
    value: T;
};

const layout_cache = new Map<string, LayoutCacheEntry<any>>();

export function cache_get<T>(key: string): T | null {
    const hit = layout_cache.get(key);
    return hit ? (hit.value as T) : null;
}

export function cache_set<T>(key: string, value: T) {
    layout_cache.set(key, { key, value });
}
