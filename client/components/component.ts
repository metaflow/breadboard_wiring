import Konva from "konva";
import { Point, PlainPoint, workspace, SCHEME, layer, layerStage, stageLayer, AreaName, LayerName, LayerNameT } from "../workspace";
import assertExists from "ts-assert-exists";
import { assert, error, checkT } from "../utils";
import theme from '../../theme.json';

export interface ComponentSpec {
    T: string;
    offset: PlainPoint;
    id?: number;
    layerName: string;
}

let idCounter: number = 0;

export function resetIdCounter() {
    idCounter = 0;
}

export const materializedComponents = new Map<string, Component>();
export const roots = new Map<number, Component>();

export class Component {
    _parent: Component | null = null;
    children = new Map<number, Component>();
    childCounter = 0;
    shapes = new Konva.Group();
    _mainColor = theme.foreground;
    typeMarker: string = 'Component';
    _offset = new Point();
    _id: number;
    _materialized = false; // If this component really "exists" and accessabe from the address root.
    _dirtyLayout = true;
    _layerName: LayerName;
    visible: boolean = false;
    constructor(spec?: ComponentSpec) { // Parameter is optional as some ancestors' ctors accept this.
        let id = -1;
        if (spec !== undefined) {
            this._offset = new Point(spec.offset);
            if (spec.id !== undefined) id = spec.id;
        }
        this._layerName = LayerNameT.check(spec?.layerName || stageLayer(SCHEME));
        if (id < 0) {
            id = idCounter;
            idCounter++;
        }
        this._id = id;
    }
    layerName(x?: LayerName): LayerName {
        if (x != null) {
            assert(!this.visible, 'component must be hidden before updating layer');
            assert(this._parent == null, 'child components should not change layer');
            this._layerName = x;            
        }
        if (this._parent != null) return this._parent.layerName();
        return this._layerName;
    }    
    stageName(): AreaName {
        return layerStage(this.layerName());
    }
    materialized(b?: boolean): boolean {
        if (b === undefined || this._materialized == b) return this._materialized;
        this._materialized = b;
        this.children.forEach(c => c.materialized(b));
        if (b) {
            assert(!materializedComponents.has(this.address()), `${this.address} already materialized`);
            materializedComponents.set(this.address(), this);
            if (this.parent() == null) roots.set(this.id(), this);
        } else {
            materializedComponents.delete(this.address());
            if (this.parent() == null) roots.delete(this.id());
        }
        return b;
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
    addChild<T extends Component>(c: T, id?: number): T {
        if (id == undefined) id = this.childCounter;    
        this.childCounter = Math.max(this.childCounter, id + 1);
        c.id(id);
        assert(!this.children.has(id));
        c.parent(this);
        this.children.set(id, c);
        c.mainColor(this.mainColor());
        if (this.visible) c.show();
        c.materialized(this.materialized());
        return c;
    }
    id(v?: number): number {
        if (v !== undefined) {
            idCounter = Math.max(idCounter, v + 1);
            this._id = v;
        }
        return this._id;
    }
    address(): string {
        if (this._parent == null) return `${this.id()}`;
        return `${this.parent()?.address()}:${this.id()}`;
    }
    offset(v?: Point): Point {
        if (v != undefined) {
            this._offset = v.clone();
            this.invalidateLayout();
        }
        return this._offset.clone();
    }
    absolutePosition(): Point {
        if (this._parent != null) return this._parent.absolutePosition().add(this.offset());
        return this.offset();
    }
    show() {
        // console.log('show component');
        if (this.visible && !this._dirtyLayout) return;
        this.visible = true;
        if (this._dirtyLayout) this.updateLayout();
        this.shapes.moveTo(layer(this.layerName()));
        this.children.forEach(c => c.show());
        if (this.parent() == null) workspace.addVisibleComponent(this);
    }
    hide() {
        this.visible = false;
        this.shapes.remove();
        workspace.invalidateScene();
        this.children.forEach(c => c.hide());
        if (this.parent() == null) workspace.removeVisibleComponent(this);
    }
    remove() {
        this.hide();
        this.materialized(false);
        this.parent(null);
    }
    removeChild(x: Component) {
        this.children.delete(x.id());
    }
    updateLayout() {
        this._dirtyLayout = false;
        this.children.forEach(c => c.updateLayout());
    }
    invalidateLayout() {
        if (this.parent() != null) {
            this.parent()?.invalidateLayout();
            return;
        }
        this._dirtyLayout = true;
        workspace.invalidateScene();
    }
    dirtyLayout(): boolean {
        if (this._parent != null) return this._parent.dirtyLayout();
        return this._dirtyLayout;
    }
    // layer(): Konva.Layer {
    //     if (this._parent != null) return this._parent.layer();
    //     return layer(this.stageName);
    // }
    mainColor(color?: string): string {
        if (color !== undefined) {
            this._mainColor = color;
            this.children.forEach(c => c.mainColor(color));
            this.invalidateLayout();
        }
        return this._mainColor;
    }
    serialize(): any {
        const z: ComponentSpec = {
            T: this.constructor.name,
            id: this._id,
            offset: this._offset.plain(),
            layerName: this.layerName(),
        };
        return z;
    }
    descendants<T>(q: { new(...args: any[]): T }): T[] {
        const z: T[] = [];
        this.children.forEach(c => {
            if (checkT(c, q)) {
                z.push(c);
                z.push(...c.descendants(q));
            }
        });
        return z;
    }
    static byID(n: number): Component {
        return assertExists(roots.get(n));
    }
    static byAddress(a: string): Component {
        return assertExists(materializedComponents.get(a));
    }
    static typedByAddress<T extends Component>(q: { new(...args: any[]): T }, a: string): T {
        let t = Component.byAddress(a);
        if (checkT(t, q)) return t as T;
        throw error(t, 'is not an instance of', q);
    }
}

export const componentDeserializers = new Map<string, { (data: any): Component }>();

export function deserializeComponent(data: any): Component {
    const t = data.T;
    assert(componentDeserializers.has(t), t);
    return componentDeserializers.get(t)!(data)!;
}

// export function getByAddress(address: string): any | null {
//     if (address == null) {
//         error('passed address is null', address);
//         return null;
//     }
//     const parts = address.split(':');
//     let t: Component | null | undefined = roots.get(parts[0]);
//     if (t == null) {
//         error('address root', parts[0], 'not found', address);
//     }
//     for (let i = 1; i < parts.length && t != null; i++) {
//         t = t.children.get(parts[i]);
//         if (t == null) {
//             error('address child', parts[i], 'not found', address);
//         }
//     }
//     if (t === undefined) return null;
//     return t;
// }

export function all<T extends Component>(q: { new(...args: any[]): T }): T[] {
    return Array.from(materializedComponents.values())
        .filter(c => checkT(c, q)) as T[];
}