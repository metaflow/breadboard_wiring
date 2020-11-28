import { Addressable, address, addAddressRoot, removeAddressRoot, newAddress } from "../address";
import Konva from "konva";
import { Point, PlainPoint, workspace } from "../workspace";
import assertExists from "ts-assert-exists";
import { error, typeGuard } from "../utils";
import theme from '../../theme.json';

export const componentDeserializers: { (data: any): (Component | null) }[] = [];

export interface ComponentSpec {
    offset: PlainPoint;
    id?: string;
}

export class Component implements Addressable {
    _parent: Component | null = null;
    children = new Map<string, Component>();
    shapes = new Konva.Group();
    _mainColor = theme.foreground;
    typeMarker: string = 'Component';
    _offset = new Point();
    _id: string|undefined;
    _materialized = false; // If this component really "exists" and accessabe from the address root.
    _dirtyLayout = true;
    constructor(spec?: ComponentSpec) {
        if (spec != undefined) {
            this._offset = new Point(spec.offset);
            this._id = spec.id;
        }
    }
    materialized(b?: boolean): boolean {
        if (b === undefined) return this._materialized;
        if (this._materialized == b) return b;
        this._materialized = b;
        if (b && this._parent == null) {
            if (this.id() == null) this.id(newAddress());
            addAddressRoot(this);
        }        
        this.children.forEach(c => c.materialized(b));
        if (!b) {
            if (this._parent == null) {
                // This must be a address root.
                removeAddressRoot(assertExists(this.id()));
            }
        }
        return this._materialized;
    }
    parent(p?: Component | null): Component | null {
        if (p !== undefined) {
            const x = this._parent;
            if (x != null) {
                x.removeChild(this);
            }
            this._parent = p;
            if (p != null) {
                this.materialized(p.materialized());
            }
        }
        return this._parent;
    }
    addChild<T extends Component>(c: T): T {
        // this.shapes.add(c.shapes);
        const id = c.id();
        if (id == null) {
            throw new Error('child id is not set');            
        }
        if (this.children.has(id)) {
            throw new Error(`child with id "${c.id()}" already present`);
        }
        c.parent(this);
        this.children.set(id, c);
        c.mainColor(this.mainColor());
        c.show(this.shapes.getLayer() as Konva.Layer);
        c.materialized(this.materialized());
        return c;
    }
    // TODO: do we need this separation beween adressable and component?
    addressParent(): Addressable | null {
        return this.parent();
    }
    addressChild(id: string): Addressable | null | undefined {
        return this.children.get(id);
    }
    address(): string {
        if (!this._materialized) {
            error(this, 'is not materialized');
        }
        return address(this);
    }
    id(v?: string): string | undefined {
        if (v != undefined) {
            this._id = v;
        }
        return this._id;
    }
    offset(v?: Point): Point {
        if (v != undefined) {
            this._offset = v.clone();
            this.needsLayoutUpdate(true);
        }
        return this._offset.clone();
    }
    absolutePosition(): Point {
        if (this._parent != null) return this._parent.absolutePosition().add(this.offset());
        return this.offset();
    }
    show(layer: Konva.Layer | null) {
        if (this._dirtyLayout) this.updateLayout();
        this.shapes.moveTo(layer);
        this.children.forEach(c => c.show(layer));
    }
    hide() {
        this.shapes.remove();
        this.children.forEach(c => c.hide());
    }
    remove() {
        this.hide();
        this.children.forEach(v => v.remove());
        this.materialized(false);
        this.parent(null);
    }
    removeChild(x: Component) {
        const id = x.id();
        if (id == null) throw new Error('child id is not set');
        this.children.delete(id);
    }
    updateLayout() {
        this._dirtyLayout = false;
        this.children.forEach(c => c.updateLayout());
    }    
    needsLayoutUpdate(v?: boolean): boolean {
        if (v !== undefined && v !== this._dirtyLayout) {
            this._dirtyLayout = v;
            const p = this.parent();
            if (p == null) {
                if (v) workspace.needsRedraw();
            } else {
                p.needsLayoutUpdate(v);
            }
            this.parent()?.needsLayoutUpdate(v);
        }
        return this._dirtyLayout;
    }
    mainColor(color?: string): string {
        if (color !== undefined) {
            this._mainColor = color;
            this.children.forEach(c => c.mainColor(color));
            this.needsLayoutUpdate(true);
        }
        return this._mainColor;
    }
    serialize(): any {
        const z: ComponentSpec = {
            id: this._id,
            offset: this._offset.plain(),
        };
        return z;
    }
    descendants<T>(q: { new(...args: any[]): T }): T[] {
        const z: T[] = [];
        this.children.forEach(c => {
            if (typeGuard(c, q)) {
                z.push(c);
                z.push(...c.descendants(q));
            }
        });
        return z;
    }    
}

export function deserializeComponent(data: any): Component { // TODO: check call places and remove null checks.
    for (const d of componentDeserializers) {
        let c = d(data);
        if (c !== null) return c;
    }
    error('none of deserializers accepted', data);
    throw new Error('none of deserializers accepted');
}