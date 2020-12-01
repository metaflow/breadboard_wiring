import { Component } from "./component";
import { error, typeGuard } from "../utils";
import { getTypedByAddress } from "../address";
import theme from '../../theme.json';

export class SelectableComponent extends Component {
    _selected: boolean = false;
    selectableInterface: true = true;  // TODO: needed?
    selected(v?: boolean): boolean {        
        if (v !== undefined) {
            if (this._selected != v) {
                this._selected = v;
                this.mainColor(v ? theme.selection : theme.foreground);
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
        // TODO: only deselect what is no longer selected.
        clearSelection();
        s.forEach(a => {
            const t = getTypedByAddress(SelectableComponent, a);
            if (t === null) {
                error('cannot find', a, 'of type SelectableComponent');
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