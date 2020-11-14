interface typeMap { // for mapping from strings to types
    string: string;
    number: number;
    boolean: boolean;
}

type PrimitiveOrConstructor = // 'string' | 'number' | 'boolean' | constructor
    | { new(...args: any[]): any }
    | keyof typeMap;

// infer the guarded type from a specific case of PrimitiveOrConstructor
type GuardedType<T extends PrimitiveOrConstructor> = T extends { new(...args: any[]): infer U; } ? U : T extends keyof typeMap ? typeMap[T] : never;

export function typeGuard<T extends PrimitiveOrConstructor>(o: any, className: T):
    o is GuardedType<T> {
    const localPrimitiveOrConstructor: PrimitiveOrConstructor = className;
    if (typeof localPrimitiveOrConstructor === 'string') {
        return typeof o === localPrimitiveOrConstructor;
    }
    return o instanceof localPrimitiveOrConstructor;
}