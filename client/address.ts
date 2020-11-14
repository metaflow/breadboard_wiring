import { Component } from "./components/component";
import { typeGuard } from "./utils";

// TODO: maybe make it a part of component?
export interface Addressable {
    id(): string|undefined;
    addressParent(): Addressable | null;
    addressChild(id: string): Addressable | null | undefined;
}

export const roots = new Map<string, Addressable>();

export function addAddressRoot(r: Addressable) {
    const id = r.id();
    if (id == null) return;
    if (roots.has(id)) {
        throw new Error(`address root "${r.id()}" already exists`);
    }
    roots.set(id, r);
}

export function removeAddressRoot(id: string) {
    if (!roots.has(id)) {
        console.error(`address root "${id}" does not exist`);
        return;
    }
    roots.delete(id);
}

export function getTypedByAddress<T>(q: { new(...args: any[]): T }, address?: string): T | null {
    let t = getByAddress(address);
    if (typeGuard(t, q)) return t as T;
    console.error(t, 'is not an instance of', q);
    return null;
}

export function copy<T>(v: T): T {
    return JSON.parse(JSON.stringify(v));
}

export function getByAddress(address?: string): any | null {
    if (address == null) {
        console.error('passed address is null', address);
        return null;
    }
    const parts = address.split(':');
    let t: Addressable | null | undefined = roots.get(parts[0]);
    if (t == null) {
        console.error('address root', parts[0], 'not found', address);
    }
    for (let i = 1; i < parts.length && t != null; i++) {
        t = t.addressChild(parts[i]);
        if (t == null) {
            console.error('address child', parts[i], 'not found', address);
        }
    }
    if (t === undefined) return null;
    return t;
}

export function all<T>(q : { new(...args: any[]): T }): T[] {
    return Array.from(roots.values()).flatMap((a: Addressable) => {
        if (typeGuard(a, Component)) {
            return a.descendants(q);
        }
        return [];
    });
}

export function newAddress(p?: Component): string {
    if (p !== undefined) {
        let i = 0;
        while (p.children.has('' + i)) i++;
        return '' + i;
    }
    let i = 0;
    while (roots.has('' + i)) i++;
    return "" + i;
}

export function address(a: Addressable | null): string {
    if (a === null) return "";
    const o = a;
    let id = a.id();
    if (id == null) {
        console.error(a, 'id is not set');
        return '';
    }
    let z = id;    
    let t = a.addressParent()
    while (t != null) {
        z = t.id() + ':' + z;
        a = t;
        id = a.id();
        if (id == null) {
            console.error(a, 'id is not set');
            return '';
        }
        t = t.addressParent();
    }
    if (!roots.has(id)) {
        console.error('address', z, 'of', o, 'does not starts from the root');
    }
    return z;
}