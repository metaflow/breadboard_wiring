import Konva from "konva";
import { appActions } from "../action";
import { scale, addContact, removeContact } from "../stage";
import { Component, ComponentSpec } from "./component";
import { AddWireAction } from "../actions/add_wire";
import { SelectableComponent } from "./selectable_component";

const radius = 0.8;

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
            e.cancelBubble = true;
            if (appActions.onMouseDown(e)) return;
            appActions.current(new AddWireAction({
                typeMarker: 'AddWireAction',
                points: [o.absolutePosition().plain()],
            }));
        });
    }
    updateLayout(): void {
        super.updateLayout();
        this.circle.fill(this.selected() ? 'green' : this.mainColor());
        this.circle.position(this.absolutePosition().screen());
        this.circle.radius(radius * scale());
    }
}