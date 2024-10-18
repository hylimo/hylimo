/**
 * TTL cache with discrete iterations
 * Keys are stringified using JSON.stringify
 *
 * @param K the key type
 * @param T the value type
 */
export class LayoutCache<K, T> {
    /**
     * The cache to use, contains item-age pairs
     */
    private cache: Map<string, ItemWithAge<T>> = new Map();

    /**
     * Creates a new layout cache
     *
     * @param maxAge the time after which items are removed from the cache
     */
    constructor(readonly maxAge: number) {}

    /**
     * Starts the next iteration
     */
    nextIteration(): void {
        const newCache = new Map<string, ItemWithAge<T>>();
        for (const [key, value] of this.cache) {
            if (value.age < this.maxAge) {
                newCache.set(key, { item: value.item, age: value.age + 1 });
            }
        }
        this.cache = newCache;
    }

    /**
     * Clears the cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Gets the value if already present, otherwise computes it
     * Also refreshes the time to live of the value
     *
     * @param key the key of the cache entry
     * @param compute the function to compute the value if not present
     * @returns the value
     */
    getOrCompute(key: K, compute: () => T): T {
        const cacheKey = JSON.stringify(key);
        let item = this.cache.get(cacheKey);
        if (item === undefined) {
            item = { item: compute(), age: 0 };
            this.cache.set(cacheKey, item);
        } else {
            item.age = 0;
        }
        return item.item;
    }
}

/**
 * Item with age
 *
 * @param T the item type
 */
interface ItemWithAge<T> {
    /**
     * The item
     */
    item: T;
    /**
     * The age of the item
     */
    age: number;
}
