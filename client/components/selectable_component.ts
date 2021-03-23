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