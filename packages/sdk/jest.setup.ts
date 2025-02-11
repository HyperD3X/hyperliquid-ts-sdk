Object.defineProperty(Uint8Array, Symbol.hasInstance, {
    value(potentialInstance: unknown) {
        return this === Uint8Array
            ? Object.prototype.toString.call(potentialInstance) ===
            '[object Uint8Array]'
            : Uint8Array[Symbol.hasInstance].call(this, potentialInstance);
    },
});