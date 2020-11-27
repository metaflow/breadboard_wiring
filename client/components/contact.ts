import Konva from "konva";
import { workspace } from "../workspace";
import { addContact, removeContact } from "../workspace";
import { ComponentSpec } from "./component";
import { AddWireAction } from "../mutations/add_wire";
import { SelectableComponent } from "./selectable_component";

const radius = 2;

export class Contact extends SelectableComponent {
    circle: Konva.Circle;
    constructor(spec: ComponentSpec) {
        super(spec);
        this.circle = new Konva.Circle({
            radius: 1,
        });
        this.shapes.add(this.circle);
        this.setupEvents();
        this.updateLayout();
    }
    materialized(b?:boolean): boolean {
        let p = this._materialized;
        if (b !== undefined && p != b) {
            if (b)  {
                p = super.materialized(b);
                addContact(this);
            } else {
                removeContact(this);
                p = super.materialized(b);
            }
        }
        return p;
    }
    setupEvents() {
        const o = this;
        this.circle.on('mousedown', function (e) {            
            if (workspace.currentAction()) {
                workspace.onMouseDown(e);
                return;
            }
            if (e.evt.button != 0) return;
            e.cancelBubble = true;
            workspace.currentAction(new AddWireAction(o.absolutePosition()));
        });
    }
    updateLayout(): void {
        super.updateLayout();
        this.circle.fill(this.selected() ? 'green' : this.mainColor());
        this.circle.position(this.absolutePosition());
        this.circle.radius(radius);
    }
}