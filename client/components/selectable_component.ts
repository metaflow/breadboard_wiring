import { Component } from "./component";
import { checkT } from "../utils";
import theme from '../../theme.json';

export class SelectableComponent extends Component {
    _selected: boolean = false;
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
    return selection().filter(x => checkT(x, q)).map(x => x as any as T);
}

// TODO: Selection should be tied to stage.
export function selectionRoots(): Component[] {
    return Array.from(new Set<Component>(selectionByType(Component).map(c => {
        let p = c;
        while (p.parent() != null) p = p.parent()!;
        return p;
    })));
}

export function selectionAddresses(s?: string[]): string[] {
    if (s !== undefined) {
        // Deselect no longer selected components.
        selection()
            .filter(x => s.indexOf(x.address()) === -1)
            .forEach(x => x.selected(false));
        // Select new components.
        s.forEach(a => Component.typedByAddress(SelectableComponent, a)
            .selected(true));
    }
    return selection().map(x => x.address()).sort();
}

export function clearSelection() {
    _selection.forEach(x => x.selected(false));
}