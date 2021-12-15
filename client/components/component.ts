/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Konva from "konva";
import theme from '../../theme.json';
import { Area, AreaName, assert, checkT, layer, LayerName, LayerNameT, PlainPoint, Point, UNKNOWN, workspace } from "../everything";

export interface ComponentSpec {
    T: string;
    offset: PlainPoint;
    id?: number;
    layerName: string; // TODO: Remove this completely and use area from context.
}

let idCounter: number = 0;

export function resetIdCounter() {
    idCounter = 0;
}

// export const materializedComponents = new Map<string, Component>();
// export const roots = new Map<number, Component>();

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
        this._layerName = LayerNameT.check(spec?.layerName || UNKNOWN);
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
    areaName(): AreaName {
        return Area.fromLayer(this.layerName());
    }
    area(): Area {
        return workspace.area(this.areaName());
    }
    materialized(b?: boolean): boolean {
        if (b === undefined || this._materialized == b) return this._materialized;
        this._materialized = b;
        this.children.forEach(c => c.materialized(b));
        if (b) {
            assert(!this.area().materializedComponents.has(this.address()), `${this.address} already materialized`);
            this.area().materializedComponents.set(this.address(), this);
            if (this.parent() == null) this.area().roots.set(this.id(), this);
        } else {
          this.area().materializedComponents.delete(this.address());
          if (this.parent() == null) this.area().roots.delete(this.id());
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
        if (this.visible && !this._dirtyLayout) return;
        if (this._dirtyLayout) this.redraw();
        this.visible = true;
        this.shapes.moveTo(layer(this.layerName()));
        this.children.forEach(c => c.show());
        if (this._parent == null) {
            workspace.addVisibleComponent(this); 
            console.log('workspace.addVisibleComponent', this);
        } 
    }
    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.shapes.remove();
        this.children.forEach(c => c.hide());
        if (this._parent == null) {
            workspace.removeVisibleComponent(this);
        }
    }
    remove() {
        this.hide();
        this.materialized(false);
        this.parent(null);
    }
    removeChild(x: Component) {
        this.children.delete(x.id());
    }
    // Returns whether layout should be updated (useful for overrides).
    redraw() {
        if (!(this.visible && this._dirtyLayout)) return;
        this._dirtyLayout = false;
        this.updateLayout();        
        this.children.forEach(c => c.updateLayout());
    }
    updateLayout() {
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

