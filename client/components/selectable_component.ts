import { Component } from "./component";
import { typeGuard } from "../utils";
import { getTypedByAddress } from "../address";

export class SelectableComponent extends Component {
    _selected: boolean = false;
    selectableInterface: true = true; 
    selected(v?: boolean | undefined): boolean {        
        if (v !== undefined) {
            if (this._selected != v) {
                this._selected = v;
                this.mainColor(v ? 'red' : 'black');
                this.updateLayout();
                if (v) {
                    _selection.add(this);
                } else {
                    _selection.delete(this);
                }                
            }            
        }
        
        return this._selected;
    }
    materialized(b?: boolean): boolean {
        const z = super.materialized(b);
        if (b === false) {
            this.selected(false);
        }
        return z;
    }
}

let _selection = new Set<SelectableComponent>();
export function selection(): SelectableComponent[] {
    return Array.from(_selection);
}

export function selectionByType<T>(q: { new(...args: any[]): T }): T[] {
    return selection().filter(x => typeGuard(x, q)).map(x => x as any as T);
}

export function selectionAddresses(s?: string[]): string[] {
    if (s !== undefined) {
        clearSelection();
        s.forEach(a => {
            const t = getTypedByAddress(SelectableComponent, a);
            if (t === null) {
                console.error('cannot find', a, 'of type SelectableComponent');
                return;
            } 
            t.selected(true);
        });
    }
    return selection().map(x => x.address()).sort();
}

export function clearSelection() {
    _selection.forEach(x => x.selected(false));
}