import Konva from 'konva';
import { Contact } from './components/contact';
import { roots } from './address';
import { Component } from './components/component';
import { selectionAddresses } from './components/selectable_component';
import { error, typeGuard } from './utils';

let _stage: Konva.Stage | null = null;
let _gridAlignment: number | null = null;

export class PlainPoint {
    x: number = 0;
    y: number = 0;
};

// just in case: https://stackoverflow.com/questions/34098023/typescript-self-referencing-return-type-for-static-methods-in-inheriting-classe?rq=1
export class Point implements Konva.Vector2d {
    x: number = 0;
    y: number = 0;
    constructor(v?: number | Point | PlainPoint | null, y?: number) {
        if (v == null) v = 0;
        if (v instanceof Point) {
            this.x = v.x;
            this.y = v.y;
            return;
        }
        const a = v as any;
        if (a.x != null && a.y != null) {
            this.x = a.x;
            this.y = a.y;
            return;
        }
        if (typeof v === 'number') {
            this.x = v;
        } else {
            error(v, 'is not a valid init value for point');
        }
        if (y == undefined) y = 0;
        this.y = y;
    }
    align(a: number | null): this {
        if (a == null) return this;
        this.x = Math.round(this.x / a) * a;
        this.y = Math.round(this.y / a) * a;
        return this;
    }
    clone(): this {
        return new (this.constructor as any)(this.x, this.y);
    }
    s(v: number): this {
        this.x = this.x * v;
        this.y = this.y * v;
        return this;
    }
    sub(other: this): this {
        this.x = this.x - other.x;
        this.y = this.y - other.y;
        return this;
    }
    add(other: this): this {
        this.x = this.x + other.x;
        this.y = this.y + other.y;
        return this;
    }
    // Can be removed?
    plain() {
        return { x: this.x, y: this.y } as PlainPoint;
    }
    distance(other: this): number {    
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    closeTo(other: this): boolean {
        return this.distance(other) < 0.1;
    }
    atan2(): number {
        return Math.atan2(this.x, this.y);
    }
    dot(o: this): number {
        return this.x * o.x + this.y * o.y; 
    }
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    static screenCursor(): Point {
        let pos = stage()?.getPointerPosition()
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(stage()?.getPointerPosition());
    }
    static cursor(): Point {
        let pos = stage()?.getPointerPosition()
        if (pos == null) pos = { x: 0, y: 0 };
        return new Point(defaultLayer()?.getTransform().copy().invert().point(pos));
    }
    alignToGrid(): this {
        return this.align(gridAlignment());
    }
};

export function gridAlignment(v?: number | null): number | null {
    if (v !== undefined) _gridAlignment = v;
    return _gridAlignment;
}

export function stage(s?: Konva.Stage): Konva.Stage | null {
    if (s !== undefined) _stage = s;
    return _stage;
}

export function pointAsNumber(xy: Point): [number, number] { // TODO: move to Point(if used).
    return [xy.x, xy.y];
}

const contacts = new Map<string, Contact>();
export function addContact(c: Contact) {
    contacts.set(c.address(), c);
}

export function removeContact(c: Contact) {
    contacts.delete(c.address());
}

export function closesetContact(xy?: Point): Contact | null {
    if (xy === undefined) {
        xy = Point.cursor();
    }
    let z: Contact | null = null;
    let dz = 0;
    contacts.forEach(c => {
        const d = c.absolutePosition().distance(xy!);
        if (z == null || d < dz) {
            z = c;
            dz = d;
        }
    });
    return z;
}

let _defaultLayer: Konva.Layer | null;
export function defaultLayer(layer?: Konva.Layer): Konva.Layer | null {
    if (layer !== undefined) {
        _defaultLayer = layer;
        layer.setAttr('name', 'default');
    }
    return _defaultLayer;
}

// let _actionLayer: Konva.Layer | null;
// export function actionLayer(layer?: Konva.Layer): Konva.Layer | null {
//     if (layer !== undefined) {
//         _actionLayer = layer;
//         layer.setAttr('name', 'action');
//     }
//     return _actionLayer;
// }

export function layerByName(name: string): Konva.Layer | null {
    // if (name === 'action') return actionLayer();
    return defaultLayer();
}

export interface StageState {
    roots: any[];
    selection: string[];
}

export function fullState(): StageState {
    let z: StageState = {
        roots: [],
        selection: selectionAddresses(),
    }
    const keys = Array.from(roots.keys());
    keys.sort().forEach(k => {
        z.roots.push((roots.get(k) as Component).spec());
    });
    return z;
}

export function clearStage() {
    roots.forEach(v => {
        if (typeGuard(v, Component)) {
            v.remove();
        } else {
            error(v, 'is not a component cannot delete');
        }
    })
}

export function stageUpdated() {
    defaultLayer()?.batchDraw();
}