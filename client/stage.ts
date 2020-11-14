import Konva from 'konva';
import { Contact } from './components/contact';
import { roots } from './address';
import { Component } from './components/component';
import { selectionAddresses } from './components/selectable_component';

let _stage: Konva.Stage | null = null;
let _gridAlignment: number | null = null;

export class PlainPoint {
    x: number = 0;
    y: number = 0;
};

// just in case: https://stackoverflow.com/questions/34098023/typescript-self-referencing-return-type-for-static-methods-in-inheriting-classe?rq=1
export abstract class Point {
    // Properties don't named 'x' and 'y' to mismatch from Konva's Vector2d so that physical point cannot be displayed on screen.
    _x: number = 0;
    _y: number = 0;
    constructor(v?: number | Point | PlainPoint, y?: number) {
        if (v == undefined) v = 0;
        if (v instanceof Point) {
            this.setX(v._x);
            this.setY(v._y);
            return;
        }
        const a = v as any;
        if (a.x != null && a.y != null) {
            this.setX(a.x);
            this.setY(a.y);
            return;
        }
        if (typeof v === 'number') {
            this.setX(v);
        } else {
            console.error(v, 'is not a valid init value for point');
        }
        if (y == undefined) y = 0;
        this.setY(y);
    }
    align(a: number | null): this {
        if (a == null) return this;
        this.setX(Math.round(this._x / a) * a);
        this.setY(Math.round(this._y / a) * a);
        return this;
    }
    clone(): this {
        return new (this.constructor as any)(this._x, this._y);
    }
    s(v: number): this {
        this.setX(this._x * v);
        this.setY(this._y * v);
        return this;
    }
    setX(x: number) {
        this._x = x;
    }
    setY(y: number) {
        this._y = y;
    }
    sub(other: this): this {
        this.setX(this._x - other._x);
        this.setY(this._y - other._y);
        return this;
    }
    add(other: this): this {
        this.setX(this._x + other._x);
        this.setY(this._y + other._y);
        return this;
    }
    getX(): number {
        return this._x;
    }
    getY(): number {
        return this._y;
    }
    plain() {
        return { x: this._x, y: this._y } as PlainPoint;
    }
    distance(other: this): number {    
        const dx = this._x - other._x;
        const dy = this._y - other._y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    closeTo(other: this): boolean {
        return this.distance(other) < 0.1;
    }
    atan2(): number {
        return Math.atan2(this._x, this._y);
    }
    dot(o: this): number {
        return this._x * o._x + this._y * o._y; 
    }
    length(): number {
        return Math.sqrt(this._x * this._x + this._y * this._y);
    }
};

export class ScreenPoint extends Point implements Konva.Vector2d {
    x: number;
    y: number;
    constructor(v?: number | Point | PlainPoint, y?: number) {
        super(v, y);
        this.x = this._x;
        this.y = this._y;
    }
    static cursor(): ScreenPoint {
        let pos = stage()?.getPointerPosition()
        if (pos == null) pos = { x: 0, y: 0 };
        return new ScreenPoint(pos.x, pos.y);
    }
    physical(): PhysicalPoint {
        return new PhysicalPoint(this.clone().s(1.0 / scale()));
    }
    setX(x: number) {
        super.setX(x);
        this.x = this._x;
    }
    setY(y: number) {
        super.setY(y);
        this.y = this._y;
    }
}

export class PhysicalPoint extends Point {
    constructor(v?: number | Point | PlainPoint, y?: number) {
        super(v, y);
    }
    screen(): ScreenPoint {
        return new ScreenPoint(this.clone().s(scale()));
    }
    static cursor(): PhysicalPoint {
        return ScreenPoint.cursor().physical();
    }
    alignToGrid(): this {
        return this.align(gridAlignment());
    }
}

export function gridAlignment(v?: number | null): number | null {
    if (v !== undefined) _gridAlignment = v;
    return _gridAlignment;
}

export function stage(s?: Konva.Stage): Konva.Stage | null {
    if (s !== undefined) _stage = s;
    return _stage;
}

export function scale(): number {
    return 4;
}

export function pointAsNumber(xy: Point): [number, number] { // TODO: move to Point
    return [xy._x, xy._y];
}

const contacts = new Map<string, Contact>();
export function addContact(c: Contact) {
    contacts.set(c.address(), c);
}

export function removeContact(c: Contact) {
    contacts.delete(c.address());
}

export function closesetContact(xy?: PhysicalPoint): Contact | null {
    if (xy === undefined) {
        xy = PhysicalPoint.cursor();
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

let _actionLayer: Konva.Layer | null;
export function actionLayer(layer?: Konva.Layer): Konva.Layer | null {
    if (layer !== undefined) {
        _actionLayer = layer;
        layer.setAttr('name', 'action');
    }
    return _actionLayer;
}

export function layerByName(name: string): Konva.Layer | null {
    if (name === 'action') return actionLayer();
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

 