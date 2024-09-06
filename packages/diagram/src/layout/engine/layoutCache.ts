/**
 * TTL cache with discrete iterations
 * Keys are stringified using JSON.stringify
 *
 * @param K the key type
 * @param T the value type
 */
export class LayoutCache<K, T> {
    /**
     * List of caches
     * The newest cache is at index 0
     * Always must contain at least one cache
     */
    private cacheList: Map<string, T>[] = [new Map<string, T>()];

    /**
     * Creates a new layout cache
     *
     * @param maxIterations the number of iterations to cache
     */
    constructor(readonly maxIterations: number) {}

    /**
     * Starts the next iteration
     */
    nextIteration(): void {
        if (this.cacheList.length >= this.maxIterations) {
            this.cacheList.pop();
        }
        this.cacheList.unshift(new Map<string, T>());
    }

    /**
     * Clears the cache
     */
    clear(): void {
        this.cacheList = [new Map<string, T>()];
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
        for (const cache of this.cacheList) {
            if (cache.has(cacheKey)) {
                const value = cache.get(cacheKey)!;
                this.cacheList[0].set(cacheKey, value);
                return value;
            }
        }
        const value = compute();
        this.cacheList[0].set(cacheKey, value);
        return value;
    }
}
